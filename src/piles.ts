import type {Game,Piles,Placement,UndecidedState} from './model';
import {check} from './engine';

export const emptyUndecided=():UndecidedState=>({piles:[[],[],[],[],[],[],[],[]]});
export const heldIds=(g:Game)=>g.undecided.piles.flat();
export const shortestPile=(g:Game)=>g.undecided.piles.reduce((best,p,i,all)=>p.length<all[best].length?i:best,0);
export const pileOf=(g:Game,id:string)=>g.undecided.piles.findIndex(p=>p.includes(id));
export const isPileTop=(g:Game,id:string)=>g.undecided.piles.some(p=>p.at(-1)===id);
export const withoutHeld=(g:Game,id:string):UndecidedState=>({piles:g.undecided.piles.map(p=>p.filter(x=>x!==id)) as Piles});

export type CardSource={kind:'deck';id:string}|{kind:'pile';index:number;id:string}|{kind:'skipped';id:string}|{kind:'placement';placementId:string;id:string}|{kind:'repeat';id:string};
export type CardTarget={kind:'deck'}|{kind:'pile';index:number}|{kind:'skipped'}|{kind:'board';placement:Placement;duplicate?:boolean};
export function sourceFor(g:Game,id:string,placementId?:string):CardSource|null{
 if(placementId)return g.placements.some(p=>p.id===placementId&&p.activityId===id)?{kind:'placement',placementId,id}:null;
 const index=pileOf(g,id);if(index>=0)return {kind:'pile',index,id};
 if(g.deck.includes(id))return {kind:'deck',id};
 if(g.skipped.includes(id))return {kind:'skipped',id};
 return null;
}
export function dragSource(g:Game,dragId:string):CardSource|null{
 if(dragId.startsWith('placement:')){const p=g.placements.find(p=>p.id===dragId.slice(10));return p?sourceFor(g,p.activityId,p.id):null;}
 if(dragId.startsWith('deck:'))return g.deck[0]===dragId.slice(5)?{kind:'deck',id:g.deck[0]}:null;
 const match=/^undecided-card-([0-7])$/.exec(dragId);if(match){const index=Number(match[1]),id=g.undecided.piles[index].at(-1);return id?{kind:'pile',index,id}:null;}
 return null;
}
/** Validate before changing ownership. Failure returns the original state by reference. */
export function moveCard(g:Game,source:CardSource|null,target:CardTarget):{game:Game;error?:string}{
 const fail=(error:string)=>({game:g,error});
 if(!source)return fail('Kartice ni več na prvotnem mestu.');
 const id=source.id,a=g.activities.find(a=>a.id===id);if(!a)return fail('Kartica ne obstaja.');
 if(source.kind==='repeat'&&(target.kind!=='board'||!target.duplicate||!g.placements.some(p=>p.activityId===id)))return fail('Ponovitev je dovoljena le za že načrtovano kartico.');
 if(source.kind==='pile'&&g.undecided.piles[source.index]?.at(-1)!==id)return fail('Premaknete lahko samo vrhnjo kartico kupčka.');
 if(source.kind==='deck'&&!g.deck.includes(id)||source.kind==='skipped'&&!g.skipped.includes(id)||source.kind==='placement'&&!g.placements.some(p=>p.id===source.placementId&&p.activityId===id))return fail('Kartica ni več na prvotnem mestu.');
 if(target.kind==='pile'&&(!Number.isInteger(target.index)||target.index<0||target.index>7))return fail('Izberite enega od osmih kupčkov.');
 if(source.kind==='pile'&&target.kind==='pile'&&source.index===target.index)return {game:g};
 if(target.kind==='board'){
  const p=target.placement;if(p.activityId!==id)return fail('Termin pripada drugi kartici.');
  if(g.placements.some(x=>x.id===p.id&&(source.kind!=='placement'||x.id!==source.placementId)))return fail('Termin s tem ID že obstaja.');
  if(source.kind!=='placement'&&!target.duplicate&&g.placements.some(p=>p.activityId===id))return fail('Kartica že ima termin.');
  const result=check(a,p.date,p.time,g,source.kind==='placement'?source.placementId:undefined,p.duration,p.override);if(!result.valid)return fail(result.errors.join(' '));
 }else if(g.placements.some(p=>p.activityId===id&&(source.kind!=='placement'||p.id!==source.placementId))){return fail('Kartica ima še druge termine. Za ločeno kartico najprej uporabite Podvoji v podrobnostih.');}
 const next:Game={...g,deck:g.deck.filter(x=>x!==id),undecided:withoutHeld(g,id),skipped:g.skipped.filter(x=>x!==id),placements:source.kind==='placement'?g.placements.filter(p=>p.id!==source.placementId):g.placements};
 if(target.kind==='deck')next.deck=[id,...next.deck];
 if(target.kind==='skipped')next.skipped=[...next.skipped,id];
 if(target.kind==='pile')next.undecided.piles[target.index].push(id);
 if(target.kind==='board')next.placements=[...next.placements,target.placement];
 return {game:next};
}

/** Upgrade each snapshot independently so undo and redo keep their legacy order. */
export function migrateGame(value:unknown):unknown{
 if(!value||typeof value!=='object')return value;
 const old=value as Record<string,unknown>;
 if(old.undecided!==undefined){const {held:_,...rest}=old;return rest;}
 if(!Array.isArray(old.held))return value;
 const undecided=emptyUndecided();old.held.forEach((id,i)=>undecided.piles[i%8].push(id));
 const {held:_,...rest}=old;return {...rest,undecided};
}
