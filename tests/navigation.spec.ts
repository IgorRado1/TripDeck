import {test,expect,type Page,type Locator} from '@playwright/test';
import {readFile} from 'node:fs/promises';

// Native date inputs have platform-specific roles; their accessible label is stable.
const datePicker=(page:Page)=>page.getByLabel('Izberi dan',{exact:true});
const column=(page:Page,date:string)=>page.locator(`.day-column[data-date="${date}"]`);
async function drag(page:Page,source:Locator,target:Locator){const s=await source.boundingBox(),t=await target.boundingBox();if(!s||!t)throw Error('Missing drag target');await page.mouse.move(s.x+s.width/2,s.y+s.height/2);await page.mouse.down();await page.mouse.move(t.x+t.width/2,t.y+t.height/2,{steps:25});await page.mouse.up();}

test('date navigation crosses trip, month and year boundaries in both board modes',async({page})=>{
 await page.goto('/');await expect(datePicker(page)).toHaveValue('2027-03-25');await expect(page.getByRole('button',{name:'Prejšnji dnevi',exact:true})).toBeEnabled();
 await page.getByRole('button',{name:'En dan',exact:true}).click();await page.getByRole('button',{name:'Prejšnji dnevi',exact:true}).click();await expect(datePicker(page)).toHaveValue('2027-03-24');await expect(column(page,'2027-03-24')).toContainText('Izven načrtovanega potovanja');
 await datePicker(page).fill('2027-03-01');await page.getByRole('button',{name:'Prejšnji dnevi',exact:true}).click();await expect(datePicker(page)).toHaveValue('2027-02-28');
 await datePicker(page).fill('2027-01-01');await page.getByRole('button',{name:'Prejšnji dnevi',exact:true}).click();await expect(datePicker(page)).toHaveValue('2026-12-31');await page.getByRole('button',{name:'Naslednji dnevi',exact:true}).click();await expect(datePicker(page)).toHaveValue('2027-01-01');
 await datePicker(page).fill('2027-04-14');await expect(page.getByRole('button',{name:'Naslednji dnevi',exact:true})).toBeEnabled();await page.getByRole('button',{name:'Naslednji dnevi',exact:true}).click();await expect(datePicker(page)).toHaveValue('2027-04-15');
 await page.getByRole('button',{name:'Več dni',exact:true}).click();for(const d of ['2027-04-15','2027-04-16','2027-04-17'])await expect(column(page,d)).toHaveCount(1);
 await page.getByRole('button',{name:'Nazaj na začetek potovanja',exact:true}).click();await page.getByRole('button',{name:'Prejšnji dnevi',exact:true}).click();await expect(datePicker(page)).toHaveValue('2027-03-22');for(const d of ['2027-03-22','2027-03-23','2027-03-24'])await expect(column(page,d)).toHaveCount(1);
 await page.reload();await expect(datePicker(page)).toHaveValue('2027-03-22');await page.getByRole('button',{name:'Nazaj na začetek potovanja',exact:true}).click();await expect(datePicker(page)).toHaveValue('2027-03-25');
 await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'En dan',exact:true}).click();await datePicker(page).fill('2050-05-01');await expect(column(page,'2050-05-01')).toHaveCount(1);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
});

test('manual placements before and after the reference trip survive reload and appear in exports',async({page})=>{
 await page.goto('/');await page.locator('.title-button').click();await page.getByLabel('Razpoložljivost',{exact:true}).fill('any day');await page.getByRole('button',{name:'Shrani kartico'}).click();
 for(const date of ['2027-03-23','2027-04-15']){
  await datePicker(page).fill(date);await column(page,date).locator('.empty-slot').nth(1).click();
  await expect(page.getByRole('dialog')).toContainText('Ta datum je izven prvotno načrtovanega potovanja.');await expect(page.getByLabel('Datum',{exact:true})).not.toHaveAttribute('min');await expect(page.getByLabel('Datum',{exact:true})).not.toHaveAttribute('max');await expect(page.getByRole('button',{name:'Potrdi termin'})).toBeEnabled();await page.getByRole('button',{name:'Potrdi termin'}).click();await expect(column(page,date).locator('.scheduled-card')).toHaveCount(1);
 }
 await expect(page.locator('.save-indicator')).toContainText('Vse je shranjeno');await page.reload();await expect(datePicker(page)).toHaveValue('2027-04-15');await expect(column(page,'2027-04-15').locator('.scheduled-card')).toHaveCount(1);await datePicker(page).fill('2027-03-23');await expect(column(page,'2027-03-23').locator('.scheduled-card')).toHaveCount(1);
 await page.getByRole('button',{name:'Pregled potovanja',exact:true}).click();await expect(page.locator('.overview-grid [data-date="2027-03-23"]')).toContainText('Sprehod pod sakurami');await expect(page.locator('.overview-grid [data-date="2027-04-15"]')).toContainText('TeamLab');
 await page.getByRole('button',{name:'Izvozi potovanje'}).click();const downloaded=page.waitForEvent('download');await page.getByRole('button',{name:'Načrt v preglednici'}).click();const file=await (await downloaded).path();if(!file)throw Error('Missing export');const content=await readFile(file,'utf8');expect(content).toContain('2027-03-23');expect(content).toContain('2027-04-15');
});

test('outside-trip drag keeps availability validation and allows valid confirmed moves',async({page})=>{
 await page.setViewportSize({width:1280,height:1100});await page.goto('/');await datePicker(page).fill('2027-03-24');
 await drag(page,page.getByRole('button',{name:'Povleci kartico',exact:true}),column(page,'2027-03-24').locator('.empty-slot').nth(1));await expect(page.locator('.toast')).toContainText('ni na voljo');await expect(page.getByRole('dialog')).toHaveCount(0);
 await page.locator('.title-button').click();await page.getByLabel('Razpoložljivost',{exact:true}).fill('any day');await page.getByRole('button',{name:'Shrani kartico'}).click();
 await drag(page,page.getByRole('button',{name:'Povleci kartico',exact:true}),column(page,'2027-03-24').locator('.empty-slot').nth(1));await expect(page.getByRole('dialog')).toContainText('izven prvotno načrtovanega');await page.getByRole('button',{name:'Potrdi termin'}).click();await expect(column(page,'2027-03-24').locator('.scheduled-card')).toHaveCount(1);
 await page.getByRole('button',{name:'Razveljavi',exact:true}).click();await expect(page.locator('.scheduled-card')).toHaveCount(0);await page.getByRole('button',{name:'Uveljavi',exact:true}).click();await expect(column(page,'2027-03-24').locator('.scheduled-card')).toHaveCount(1);
});

test('manual day destinations persist without assigning outside days to the first or last city',async({page})=>{
 await page.goto('/');await datePicker(page).fill('2027-03-24');await expect(column(page,'2027-03-24').locator('.day-header')).toContainText('Lokacija ni določena.');
 await page.getByRole('button',{name:'Lokacija za 2027-03-24',exact:true}).click();await page.getByLabel('Lokacija dneva',{exact:true}).fill('Yokohama');await page.getByRole('button',{name:'Shrani lokacijo'}).click();await expect(column(page,'2027-03-24').locator('.day-header')).toContainText('Yokohama');
 await datePicker(page).fill('2027-04-15');await expect(column(page,'2027-04-15').locator('.day-header')).toContainText('Lokacija ni določena.');await page.getByRole('button',{name:'Lokacija za 2027-04-15',exact:true}).click();await page.getByLabel('Lokacija dneva',{exact:true}).fill('Naha');await page.getByRole('button',{name:'Shrani lokacijo'}).click();await expect(page.locator('.save-indicator')).toContainText('Vse je shranjeno');await page.reload();await expect(datePicker(page)).toHaveValue('2027-04-15');await expect(column(page,'2027-04-15').locator('.day-header')).toContainText('Naha');
 await datePicker(page).fill('2027-03-24');await expect(column(page,'2027-03-24').locator('.day-header')).toContainText('Yokohama');await page.getByRole('button',{name:'Nastavitve potovanja',exact:true}).click();await page.getByLabel('Začetek',{exact:true}).fill('2027-03-20');await page.getByRole('button',{name:'Shrani spremembe'}).click();await expect(datePicker(page)).toHaveValue('2027-03-24');await expect(column(page,'2027-03-24').locator('.day-header')).toContainText('Yokohama');await expect(column(page,'2027-03-24').locator('.outside-label')).toHaveCount(0);
});
