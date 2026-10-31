import type {Game,Trip} from './model';
import {addDays,dates,isDate,placementEnd} from './engine';

export const outsideTrip=(trip:Trip,date:string)=>date<trip.start||date>trip.end;
export const boardDays=(date:string,single=false)=>Array.from({length:single?1:3},(_,i)=>addDays(date,i));
export function dayDestination(trip:Trip,date:string){
 if(trip.dayDestinations[date])return trip.dayDestinations[date];
 if(outsideTrip(trip,date))return 'Lokacija ni določena.';
 return trip.segments.find(s=>date>=s.start&&date<=s.end)?.city||trip.destination||'Lokacija ni določena.';
}
/** The overview is sparse: reference days plus assigned/scheduled days, never an
 * enormous continuous range merely because an activity was placed years away. */
export function itineraryDates(g:Game){
 const ds=new Set([...dates(g.trip.start,g.trip.end),...Object.keys(g.trip.dayDestinations)]);
 for(const p of g.placements){const end=placementEnd(p,g.trip.timezone);const last=end.time==='00:00'&&end.date>p.date?addDays(end.date,-1):end.date;for(const date of dates(p.date,last))ds.add(date);}
 return [...ds].filter(isDate).sort();
}
export function savedBoardDate(trip:Trip){try{const value=localStorage.getItem(`TripDeck.boardDate:${trip.id}`);return value&&isDate(value)?value:trip.start}catch{return trip.start}}
