export type Rule = {type:'any_day'} | {type:'weekly'; weekdays:number[]} | {type:'specific_dates'; dates:string[]} | {type:'date_range';startDate:string;endDate:string} | {type:'unknown'};
export type Booking = 'unconfirmed'|'confirmed'|'pending'|'booked'|'cancelled';
export interface Activity {id:string;title:string;description:string;category:string;city:string;location:string;availability:string;rule:Rule;windows:[number,number][];duration:number;priority:'high'|'medium'|'low';booking:Booking;url:string;notes:string;price:number;currency:string;exceptions:string[];favorite:boolean;votes:string[]}
export interface Segment {city:string;start:string;end:string}
export interface Trip {id:string;name:string;destination:string;start:string;end:string;timezone:string;travelers:string[];segments:Segment[];buffer:number;grid:number;dayDestinations:Record<string,string>}
export interface Placement {id:string;activityId:string;date:string;time:number;duration:number;override:boolean;startAt?:string;endAt?:string}
export type Piles = [string[],string[],string[],string[],string[],string[],string[],string[]];
export interface UndecidedState {piles:Piles}
export interface Game {trip:Trip;activities:Activity[];deck:string[];undecided:UndecidedState;skipped:string[];placements:Placement[];seed:number}
export interface History {present:Game;past:Game[];future:Game[]}
export const bookingLabels:Record<Booking,string>={unconfirmed:'Ni potrjeno',confirmed:'Potrjeno',pending:'Čaka rezervacijo',booked:'Rezervirano',cancelled:'Odpovedano'};
export const uid=()=>crypto.randomUUID();
