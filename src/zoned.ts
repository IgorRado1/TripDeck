import {Temporal} from '@js-temporal/polyfill';
const cache=new Map<string,{epoch:number;ambiguous:boolean}|null>();
/** Civil date + local clock -> instant. Reject nonexistent DST times; choose the
 * earlier occurrence of a repeated time and surface that choice to the user. */
export function localInstant(date:string,minute:number,timezone:string){
 const key=`${date}|${minute}|${timezone}`;if(cache.has(key))return cache.get(key)!;
 try{const plain=Temporal.PlainDate.from(date).add({days:Math.floor(minute/1440)});const within=((minute%1440)+1440)%1440;const input={timeZone:timezone,year:plain.year,month:plain.month,day:plain.day,hour:Math.floor(within/60),minute:within%60};const early=Temporal.ZonedDateTime.from(input,{disambiguation:'earlier'}),late=Temporal.ZonedDateTime.from(input,{disambiguation:'later'});const matches=early.hour===input.hour&&early.minute===input.minute&&early.toPlainDate().equals(plain);const result=matches?{epoch:early.epochMilliseconds/60000,ambiguous:early.epochMilliseconds!==late.epochMilliseconds}:null;if(cache.size>30000)cache.clear();cache.set(key,result);return result}catch{return null}
}
export function endInZone(date:string,start:number,duration:number,timezone:string){const instant=localInstant(date,start,timezone);if(!instant)return null;const z=Temporal.Instant.fromEpochMilliseconds((instant.epoch+duration)*60000).toZonedDateTimeISO(timezone);return {date:z.toPlainDate().toString(),time:`${String(z.hour).padStart(2,'0')}:${String(z.minute).padStart(2,'0')}`,minute:z.hour*60+z.minute,iso:z.toInstant().toString()};}
export function instantISO(date:string,minute:number,timezone:string){const x=localInstant(date,minute,timezone);return x?Temporal.Instant.fromEpochMilliseconds(x.epoch*60000).toString():null;}
