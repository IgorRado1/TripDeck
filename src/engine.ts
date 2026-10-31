import type {Activity, Game, Placement, Rule, Trip} from './model';
import {endInZone,localInstant} from './zoned';
export const minutes=(s:string)=>{const [h,m]=s.split(':').map(Number);return h*60+m};
export const time=(n:number)=>`${String(Math.floor(n/60)%24).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;
export const dayIndex=(d:string)=>Date.parse(d+'T00:00:00Z')/86400000;
export const addDays=(d:string,n:number)=>new Date((dayIndex(d)+n)*86400000).toISOString().slice(0,10);
export const isDate=(s:string)=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(dayIndex(s))&&new Date(dayIndex(s)*86400000).toISOString().slice(0,10)===s;
export function dates(start:string,end:string){if(!isDate(start)||!isDate(end)||end<start)return [];return Array.from({length:Math.min(3660,dayIndex(end)-dayIndex(start)+1)},(_,i)=>addDays(start,i))}
export const dateLabel=(date:string,opts:Intl.DateTimeFormatOptions={day:'numeric',month:'short'})=>new Intl.DateTimeFormat('sl-SI',{...opts,timeZone:'UTC'}).format(new Date(date+'T12:00:00Z'));
export function normalize(raw:string):Rule {
 const s=raw.toLowerCase().trim();
 if(['anytime','any day','kadarkoli','vsak dan'].includes(s))return {type:'any_day'};
 if(['unknown','neznano',''].includes(s))return {type:'unknown'};
 if(s.includes('..')){const [a,b]=s.split('..');if(isDate(a)&&isDate(b)&&a<=b)return {type:'date_range',startDate:a,endDate:b};throw Error('Neveljaven datumski razpon.');}
 if(s.split('|').every(isDate))return {type:'specific_dates',dates:s.split('|')};
 if(['weekdays','med tednom'].includes(s))return {type:'weekly',weekdays:[1,2,3,4,5]};
 if(['weekends','ob vikendih'].includes(s))return {type:'weekly',weekdays:[6,7]};
 const names=[['monday','ponedeljek'],['tuesday','torek'],['wednesday','sredo','sreda'],['thursday','četrtek'],['friday','petek'],['saturday','soboto','sobota'],['sunday','nedeljo','nedelja']];
 const clean=s.replace(/\b(every|vsak|vsako)\b/g,'').trim();const parts=clean.split(/[,|]/).map(x=>x.trim());const days=parts.map(p=>names.findIndex(ns=>ns.includes(p))+1);
 if(days.length&&days.every(Boolean))return {type:'weekly',weekdays:[...new Set(days)]};
 throw Error(`Neznana razpoložljivost: ${raw}. Uporabite »neznano«, če urnika še ne poznate.`);
}
export function onDate(rule:Rule,date:string){switch(rule.type){case 'any_day':case 'unknown':return true;case 'weekly':return rule.weekdays.includes(new Date(date+'T12:00:00Z').getUTCDay()||7);case 'specific_dates':return rule.dates.includes(date);case 'date_range':return date>=rule.startDate&&date<=rule.endDate;}}
export function check(a:Activity,date:string,start:number,g:Game,exclude?:string,duration=a.duration,override=false){
 const errors:string[]=[],warnings:string[]=[];const instant=localInstant(date,start,g.trip.timezone);const zonedEnd=endInZone(date,start,duration,g.trip.timezone);
 if(!isDate(date))errors.push('Izberite veljaven koledarski datum.');
 else if(date<g.trip.start||date>g.trip.end||(zonedEnd&&zonedEnd.date>g.trip.end&&!(zonedEnd.date===addDays(g.trip.end,1)&&zonedEnd.minute===0)))warnings.push('Ta datum je izven prvotno načrtovanega potovanja.');
 if(!Number.isFinite(start)||start<0||start>=1440||!Number.isFinite(duration)||duration<=0||duration>10080)errors.push('Preverite čas in trajanje.');
 if(!onDate(a.rule,date)||a.exceptions.includes(date))errors.push('Kartica na izbrani datum ni na voljo.');
 if(!instant)errors.push('Ta lokalni čas ne obstaja zaradi prehoda na poletni čas. Izberite drugo uro.');
 if(instant?.ambiguous)warnings.push('Ta ura se ob prehodu na zimski čas ponovi. Uporabljena je prva pojavitev.');
 if(!a.windows.some(([s,e])=>{const windowEnd=localInstant(date,e,g.trip.timezone);return start>=s&&!!instant&&!!windowEnd&&instant.epoch+duration<=windowEnd.epoch}))errors.push('Celotno trajanje mora biti znotraj razpoložljivih ur.');
 if(a.booking==='cancelled')errors.push('Aktivnost je odpovedana.');
 const abs=instant?.epoch??NaN;
 for(const p of g.placements.filter(p=>p.id!==exclude)) {const other=localInstant(p.date,p.time,g.trip.timezone)?.epoch??NaN;const title=g.activities.find(x=>x.id===p.activityId)?.title||'Aktivnost';if(abs<other+p.duration&&abs+duration>other)(override?warnings:errors).push(`Prekrivanje: ${title}.`);else if(abs<other+p.duration+g.trip.buffer&&abs+duration+g.trip.buffer>other)(override?warnings:errors).push(`Premalo časa za prevoz: ${title} (${g.trip.buffer} min).`);}
 if(a.rule.type==='unknown')warnings.push('Razpoložljivost še ni preverjena. Termin je začasen.');
 if(!['booked','confirmed'].includes(a.booking))warnings.push('Termin ne pomeni potrjene rezervacije.');
 return {valid:errors.length===0,errors,warnings};
}
export function slots(a:Activity,g:Game,onlyDate?:string,exclude?:string,duration=a.duration){const result:{date:string;time:number}[]=[];const segment=g.trip.segments.find(s=>s.city.toLowerCase()===a.city.toLowerCase());const ds=onlyDate?[onlyDate]:dates(g.trip.start,g.trip.end);for(const date of ds){if(!onDate(a.rule,date))continue;for(let t=0;t<1440;t+=g.trip.grid)if(check(a,date,t,g,exclude,duration).valid)result.push({date,time:t})}return result.sort((x,y)=>{const score=(d:string)=>segment&&d>=segment.start&&d<=segment.end?0:1;return score(x.date)-score(y.date)||x.date.localeCompare(y.date)||Math.abs(x.time-600)-Math.abs(y.time-600)});}
export function deckOrder(activities:Activity[],trip:Trip,mode='chronological',seed=1){
 const ds=dates(trip.start,trip.end);const hash=(s:string)=>{let h=seed;for(const c of s)h=(Math.imul(h,31)+c.charCodeAt(0))>>>0;return h};
 const preferred=(a:Activity)=>{const feasible=ds.filter(d=>onDate(a.rule,d)&&!a.exceptions.includes(d));const seg=trip.segments.find(s=>s.city.toLowerCase()===a.city.toLowerCase());const local=seg?feasible.filter(d=>d>=seg.start&&d<=seg.end):feasible;if(!local.length)return feasible[0]||'9999';return ['specific_dates','date_range','weekly'].includes(a.rule.type)?local[0]:local[hash(a.id)%local.length]};
 const rank=(a:Activity)=>({high:0,medium:1,low:2}[a.priority]);
 return [...activities].sort((a,b)=>mode==='random'?hash(a.id)-hash(b.id):mode==='priority'?rank(a)-rank(b)||preferred(a).localeCompare(preferred(b)):mode==='destination'?(trip.segments.findIndex(s=>s.city===a.city)-trip.segments.findIndex(s=>s.city===b.city)||a.city.localeCompare(b.city)||hash(a.id)-hash(b.id)):preferred(a).localeCompare(preferred(b))||rank(a)-rank(b)||hash(a.id)-hash(b.id)).map(a=>a.id);
}
export function transact(h:import('./model').History,next:Game){return {present:next,past:[...h.past,h.present].slice(-100),future:[]};}
export function undo(h:import('./model').History){return h.past.length?{present:h.past.at(-1)!,past:h.past.slice(0,-1),future:[h.present,...h.future]}:h;}
export function redo(h:import('./model').History){return h.future.length?{present:h.future[0],past:[...h.past,h.present],future:h.future.slice(1)}:h;}
export function placementEnd(p:Placement,timezone?:string){return (timezone?endInZone(p.date,p.time,p.duration,timezone):null)||{date:addDays(p.date,Math.floor((p.time+p.duration)/1440)),time:time(p.time+p.duration)}};
