import {test,expect,type Page,type Locator} from '@playwright/test';
import {demo} from '../src/demo';
import {emptyUndecided} from '../src/piles';
import type {Game} from '../src/model';

function fixture():Game{const g=demo(),base=g.activities[0];g.activities=Array.from({length:95},(_,i)=>({...base,id:`card-${i}`,title:`Doživetje ${i}`,availability:'any day',rule:{type:'any_day' as const},windows:[[0,1440]] as [number,number][]}));g.deck=g.activities.map(a=>a.id);g.undecided=emptyUndecided();return g;}
async function seed(page:Page,data:unknown){
 // Suppress application boot only on the seed navigation; create a real Dexie v1 DB (native IndexedDB version 10).
 await page.route('**/src/main.tsx*',route=>route.abort());await page.goto('/');
 await page.evaluate(async data=>{await new Promise<void>((resolve,reject)=>{const r=indexedDB.open('TripDeck',10);r.onupgradeneeded=()=>r.result.createObjectStore('sessions',{keyPath:'id'});r.onerror=()=>reject(r.error);r.onsuccess=()=>{const db=r.result,tx=db.transaction('sessions','readwrite');tx.objectStore('sessions').put({id:'active',data});tx.objectStore('sessions').put({id:'trip:japan-demo',data});tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>reject(tx.error)}})},data);
 await page.unroute('**/src/main.tsx*');await page.reload();await expect(page.getByTestId('undecided-total')).toBeVisible();await expect(page.locator('.save-indicator')).toContainText('Vse je shranjeno');
}
async function drag(page:Page,source:Locator,target:Locator){await source.scrollIntoViewIfNeeded();await target.scrollIntoViewIfNeeded();const s=await source.boundingBox(),t=await target.boundingBox();if(!s||!t)throw Error('Missing card or pile');await page.mouse.move(s.x+s.width/2,s.y+s.height/2);await page.mouse.down();await page.mouse.move(t.x+t.width/2,t.y+t.height/2,{steps:25});await page.mouse.up();}

test('legacy 95-card holding data migrates with history and survives refresh',async({page})=>{
 const g=fixture(),{undecided:_,...rest}=g;const snapshot=(n:number)=>({...rest,held:g.deck.slice(0,n),deck:g.deck.slice(n)});
 await seed(page,{present:snapshot(95),past:[snapshot(94)],future:[]});
 await expect(page.locator('.undecided-pile')).toHaveCount(8);await expect(page.getByTestId('undecided-total')).toHaveText('95');
 for(let i=0;i<8;i++)await expect(page.getByTestId(`pile-count-${i}`)).toHaveText(i===7?'11':'12');
 await page.getByRole('button',{name:'Razveljavi',exact:true}).click();await expect(page.getByTestId('undecided-total')).toHaveText('94');await page.getByRole('button',{name:'Uveljavi',exact:true}).click();await expect(page.getByTestId('undecided-total')).toHaveText('95');
 await page.getByRole('button',{name:'Preglej kupček 1',exact:true}).click();await expect(page.locator('.expanded-pile li')).toHaveCount(12);await expect(page.locator('.expanded-pile li').first()).toContainText('Doživetje 0');await expect(page.locator('.expanded-pile li').last()).toContainText('Doživetje 88');await page.getByRole('button',{name:'Zapri',exact:true}).click();
 await expect(page.locator('.save-indicator')).toContainText('Vse je shranjeno');await page.reload();await expect(page.getByTestId('undecided-total')).toHaveText('95');await expect(page.getByTestId('undecided-pile-0').locator('.pile-top-card')).toHaveAttribute('data-activity-id','card-88');
});

test('dropping outside all targets leaves the card in its original position',async({page})=>{
 await page.setViewportSize({width:1440,height:2200});const g=fixture();g.undecided.piles[0]=g.deck.slice(0,3);g.deck=g.deck.slice(3);await seed(page,{present:g,past:[],future:[]});
 await drag(page,page.getByRole('button',{name:'Povleci kartico',exact:true}),page.locator('.intro h1'));
 await expect(page.locator('.title-button')).toContainText('Doživetje 3');await expect(page.getByTestId('undecided-total')).toHaveText('3');await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.getByRole('button',{name:'Razveljavi',exact:true})).toBeDisabled();
 await drag(page,page.getByTestId('undecided-pile-0').locator('.pile-grip'),page.locator('.intro h1'));await expect(page.getByTestId('undecided-pile-0').locator('.pile-top-card')).toHaveAttribute('data-activity-id','card-2');await expect(page.getByRole('button',{name:'Razveljavi',exact:true})).toBeDisabled();
});

test('deep stacks expose only top cards and support pile, board, return, undo and redo',async({page})=>{
 await page.setViewportSize({width:1440,height:2200});const g=fixture();g.undecided.piles[0]=g.deck.slice(0,60);g.undecided.piles[1]=[g.deck[60]];g.deck=g.deck.slice(61);await seed(page,{present:g,past:[],future:[]});
 const p0=page.getByTestId('undecided-pile-0'),p1=page.getByTestId('undecided-pile-1');
 await expect(p0).toHaveAttribute('data-count','60');await expect(p0.locator('.pile-under-card')).toHaveCount(5);await expect(p0.locator('.pile-top-card')).toHaveCount(1);await expect(p0.locator('.pile-under-card [role=button]')).toHaveCount(0);
 const boxes=await p0.locator('.pile-under-card').evaluateAll(els=>els.map(e=>({top:(e as HTMLElement).offsetTop,height:(e as HTMLElement).offsetHeight,pointer:getComputedStyle(e).pointerEvents})));expect(boxes.every((b,i)=>b.top===i*10&&b.height===148&&b.pointer==='none')).toBe(true);
 await drag(page,p0.locator('.pile-grip'),p1.locator('.pile-surface'));await expect(p0).toHaveAttribute('data-count','59');await expect(p1).toHaveAttribute('data-count','2');await expect(p0.locator('.pile-top-card')).toHaveAttribute('data-activity-id','card-58');await expect(p1.locator('.pile-top-card')).toHaveAttribute('data-activity-id','card-59');
 await page.getByRole('button',{name:'Razveljavi',exact:true}).click();await expect(p0).toHaveAttribute('data-count','60');await page.getByRole('button',{name:'Uveljavi',exact:true}).click();await expect(p1).toHaveAttribute('data-count','2');
 await drag(page,p1.locator('.pile-grip'),page.locator('.day-column').first().locator('.empty-slot').nth(1));await expect(page.getByRole('dialog')).toBeVisible();await expect(p1).toHaveAttribute('data-count','2');await page.getByRole('button',{name:'Prekliči',exact:true}).click();await expect(p1).toHaveAttribute('data-count','2');
 await drag(page,p1.locator('.pile-grip'),page.locator('.day-column').first().locator('.empty-slot').nth(1));await page.getByRole('button',{name:'Potrdi termin'}).click();await expect(p1).toHaveAttribute('data-count','1');await expect(page.locator('.scheduled-card')).toHaveCount(1);
 await drag(page,page.locator('.scheduled-card .mini-grip'),p0.locator('.pile-surface'));await expect(page.locator('.scheduled-card')).toHaveCount(0);await expect(p0).toHaveAttribute('data-count','60');await expect(p0.locator('.pile-top-card')).toHaveAttribute('data-activity-id','card-59');
 await page.getByRole('button',{name:'Vrni vrhnjo kartico kupčka 1 na kupček',exact:true}).click();await expect(page.locator('.title-button')).toContainText('Doživetje 59');await expect(p0).toHaveAttribute('data-count','59');await page.getByRole('button',{name:'Razveljavi',exact:true}).click();await expect(p0).toHaveAttribute('data-count','60');
 await expect(page.locator('.save-indicator')).toContainText('Vse je shranjeno');await page.reload();await expect(page.getByTestId('undecided-total')).toHaveText('61');await expect(p0).toHaveAttribute('data-count','60');
});

test('ninth and tenth cards can be dragged onto occupied piles; quick hold balances piles',async({page})=>{
 await page.setViewportSize({width:1440,height:2200});const g=fixture();g.undecided.piles=g.undecided.piles.map((_,i)=>[g.deck[i]]) as Game['undecided']['piles'];g.deck=g.deck.slice(8);await seed(page,{present:g,past:[],future:[]});
 const target=page.getByTestId('undecided-pile-7');for(let n=2;n<=3;n++){await drag(page,page.getByRole('button',{name:'Povleci kartico',exact:true}),target.locator('.pile-surface'));await expect(target).toHaveAttribute('data-count',String(n))}await expect(page.getByTestId('undecided-total')).toHaveText('10');
 await page.getByRole('button',{name:'Za pozneje',exact:true}).click();await expect(page.getByTestId('undecided-pile-0')).toHaveAttribute('data-count','2');await expect(target).toHaveAttribute('data-count','3');
 await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);await page.getByRole('button',{name:'Preglej kupček 8',exact:true}).click();await expect(page.locator('.expanded-pile li')).toHaveCount(3);
});


