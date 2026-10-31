import Papa from 'papaparse';
import {z} from 'zod';
import type {Activity, Booking} from './model';
import {isDate,minutes,normalize} from './engine';
const timeSchema=z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const rowSchema=z.object({title:z.string().trim().min(1,'Naslov manjka.'),availability:z.string(),duration:z.coerce.number().positive().max(10080),price:z.coerce.number().nonnegative()});
export const fields=['title','availability','id','description','category','city','location','start_time','end_time','time_windows','duration_minutes','priority','booking_status','booking_url','notes','price','currency','exceptions'];
const aliases:Record<string,string>={naslov:'title',razpoložljivost:'availability',kategorija:'category',mesto:'city',opis:'description',trajanje:'duration_minutes',začetek:'start_time',konec:'end_time',opombe:'notes',cena:'price'};
export function parseCSV(text:string){const result=Papa.parse<Record<string,string>>(text.replace(/^\uFEFF/,''),{header:true,skipEmptyLines:'greedy',transformHeader:h=>h.trim()});return {rows:result.data,headers:result.meta.fields||[],errors:result.errors.map(e=>`Vrstica ${(e.row??0)+2}: ${e.message}`)}};
export function autoMapping(headers:string[]){return Object.fromEntries(fields.map(f=>[f,headers.find(h=>h.toLowerCase()===f||aliases[h.toLowerCase()]===f)||'']))}
export function convertRows(rows:Record<string,string>[],mapping:Record<string,string>){const activities:Activity[]=[],errors:string[]=[];rows.forEach((raw,index)=>{const get=(f:string,defaultValue='')=>raw[mapping[f]]?.trim()||defaultValue;try{
 const data=rowSchema.parse({title:get('title'),availability:get('availability'),duration:get('duration_minutes','90'),price:get('price','0')});
 if(!get('availability'))throw Error('Razpoložljivost manjka; vnesite »neznano«, če urnik ni znan.');
 const windows:[number,number][]=(get('time_windows')?get('time_windows').split('|').map(w=>w.split('-')):[[get('start_time','06:00'),get('end_time','23:59')]]).map(([s,e])=>{timeSchema.parse(s);timeSchema.parse(e);const a=minutes(s),b=minutes(e);return [a,b<=a?b+1440:b]});
 const priority=get('priority','medium');if(!['high','medium','low'].includes(priority))throw Error('Prioriteta: high, medium ali low.');
 const booking=get('booking_status','unconfirmed');if(!['unconfirmed','confirmed','pending','booked','cancelled'].includes(booking))throw Error('Neveljaven status rezervacije.');
 const exceptions=get('exceptions').split('|').filter(Boolean);if(!exceptions.every(isDate))throw Error('Izjeme morajo biti datumi YYYY-MM-DD, ločeni z |.');
 const title=data.title,city=get('city');const id=get('id')||`csv-${[title,city,data.availability].join('-').toLowerCase()}`;
 activities.push({id,title,city,description:get('description'),category:get('category','Other'),location:get('location'),availability:data.availability,rule:normalize(data.availability),windows,duration:data.duration,priority:priority as Activity['priority'],booking:booking as Booking,url:get('booking_url'),notes:get('notes'),price:data.price,currency:get('currency','EUR'),exceptions,favorite:false,votes:[]});
 }catch(e){errors.push(`Vrstica ${index+2}: ${e instanceof z.ZodError?e.issues.map(i=>`${i.path.join('.')}: ${i.message}`).join('; '):(e as Error).message}`)}});return {activities,errors};}
export const exampleCSV='id,title,category,city,availability,start_time,end_time,duration_minutes,priority,booking_status\n1,El Café Latino,Dance,Tokyo,every Saturday,19:30,23:30,120,high,unconfirmed\n2,Surf lesson,Surfing,Okinawa,2027-04-11|2027-04-12,07:00,17:00,120,high,unconfirmed\n3,Sushi cooking class,Food,Tokyo,any day,10:00,18:00,120,medium,unconfirmed\n4,Octopus Garden,Dance,Okinawa,every Sunday,18:30,23:00,120,high,unconfirmed\n5,Fuji Motorsports Museum,Cars,Fuji,2027-04-03,10:00,17:00,150,high,unconfirmed\n6,Ryokan and onsen,Accommodation,Hakone,2027-04-03,15:00,23:59,480,high,unconfirmed\n7,Restaurant dinner,Food,Osaka,any day,17:00,23:00,90,low,unconfirmed';
