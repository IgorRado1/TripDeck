import {describe,it,expect} from 'vitest';
import {demo} from './demo';
import {addDays,check,normalize,slots} from './engine';
import {boardDays,dayDestination,itineraryDates,outsideTrip} from './board';
import {historySchema} from './storage';
import {moveCard,sourceFor} from './piles';

describe('trip dates are reference dates',()=>{
 it('navigates before/after the trip, across months, years and leap days',()=>{
  expect(boardDays(addDays('2027-03-25',-3))).toEqual(['2027-03-22','2027-03-23','2027-03-24']);
  expect(boardDays(addDays('2027-03-01',-1),true)).toEqual(['2027-02-28']);
  expect(boardDays('2027-04-15')).toEqual(['2027-04-15','2027-04-16','2027-04-17']);
  expect(boardDays('2026-12-31')).toEqual(['2026-12-31','2027-01-01','2027-01-02']);
  expect(boardDays('2028-02-28')).toEqual(['2028-02-28','2028-02-29','2028-03-01']);
 });
 it('allows manual scheduling before and after the reference period with a warning',()=>{
  const g=demo(),a={...g.activities[0],availability:'any day',rule:normalize('any day')};g.activities[0]=a;
  for(const d of ['2027-03-23','2027-04-15','2026-12-31','2035-05-01']){const result=check(a,d,600,g);expect(result.valid).toBe(true);expect(result.errors).toEqual([]);expect(result.warnings).toContain('Ta datum je izven prvotno načrtovanega potovanja.');expect(slots(a,g,d).length).toBeGreaterThan(0)}
  expect(check(a,g.trip.start,600,g).warnings).not.toContain('Ta datum je izven prvotno načrtovanega potovanja.');
 });
 it('keeps exact-date, weekday, window and exception validation outside the trip',()=>{
  const g=demo(),a=g.activities[0];expect(check(a,'2027-03-23',600,g).valid).toBe(false);
  a.rule=normalize('every Sunday');expect(check(a,'2027-04-18',600,g).valid).toBe(true);expect(check(a,'2027-04-19',600,g).valid).toBe(false);
  expect(check(a,'2027-04-18',1020,g).valid).toBe(false);a.exceptions=['2027-04-18'];expect(check(a,'2027-04-18',600,g).valid).toBe(false);
  expect(check(a,'not-a-date',600,g).errors).toContain('Izberite veljaven koledarski datum.');
 });
 it('permits overnight activities past the final reference day and checks conflicts',()=>{
  let g=demo();const a={...g.activities[0],rule:normalize('any day'),availability:'any day',windows:[[1380,1560]] as [number,number][],duration:120};g.activities[0]=a;
  const placement={id:'overnight',activityId:a.id,date:g.trip.end,time:1380,duration:120,override:false};expect(check(a,placement.date,placement.time,g).valid).toBe(true);
  g=moveCard(g,sourceFor(g,a.id),{kind:'board',placement}).game;
  expect(itineraryDates(g)).toContain('2027-04-15');const other={...a,id:'other',windows:[[0,1440]] as [number,number][]};expect(check(other,'2027-04-15',30,g).valid).toBe(false);
 });
 it('does not infer an outside-trip destination and keeps manual assignments',()=>{
  const g=demo();expect(dayDestination(g.trip,'2027-03-24')).toBe('Lokacija ni določena.');expect(dayDestination(g.trip,'2027-04-15')).toBe('Lokacija ni določena.');expect(dayDestination(g.trip,'2027-03-25')).toBe('Tokyo');
  g.trip.dayDestinations['2027-03-24']='Yokohama';expect(dayDestination(g.trip,'2027-03-24')).toBe('Yokohama');g.trip.start='2027-03-20';expect(dayDestination(g.trip,'2027-03-24')).toBe('Yokohama');
 });
 it('retains outside placements and locations through JSON without expanding empty years',()=>{
  let g=demo();const a={...g.activities[0],rule:normalize('any day'),availability:'any day'};g.activities[0]=a;g.trip.dayDestinations['2035-05-01']='Naha';g=moveCard(g,sourceFor(g,a.id),{kind:'board',placement:{id:'far',activityId:a.id,date:'2035-05-01',time:600,duration:120,override:false}}).game;
  const restored=historySchema.parse(JSON.parse(JSON.stringify({present:g,past:[],future:[]}))).present;expect(restored.placements).toEqual(g.placements);expect(restored.trip.dayDestinations).toEqual(g.trip.dayDestinations);expect(itineraryDates(restored)).toHaveLength(22);expect(itineraryDates(restored).at(-1)).toBe('2035-05-01');expect(outsideTrip(restored.trip,'2035-05-01')).toBe(true);
 });
 it('loads older saved trips without per-date destinations',()=>{const g=demo();const {dayDestinations:_,...trip}=g.trip;expect(historySchema.parse({present:{...g,trip},past:[],future:[]}).present.trip.dayDestinations).toEqual({})});
});
