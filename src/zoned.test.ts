import {describe,it,expect} from 'vitest';
import {endInZone,instantISO,localInstant} from './zoned';
import {check,normalize} from './engine';
import {demo} from './demo';
describe('IANA time zones and daylight-saving transitions',()=>{
 it('rejects a nonexistent spring-forward local time',()=>{expect(localInstant('2027-03-28',150,'Europe/Ljubljana')).toBeNull()});
 it('flags ambiguous autumn times and selects the earlier occurrence',()=>{const result=localInstant('2027-10-31',150,'Europe/Ljubljana');expect(result?.ambiguous).toBe(true);expect(instantISO('2027-10-31',150,'Europe/Ljubljana')).toBe('2027-10-31T00:30:00Z')});
 it('uses elapsed minutes across spring-forward',()=>{expect(endInZone('2027-03-28',90,120,'Europe/Ljubljana')?.time).toBe('04:30')});
 it('uses elapsed minutes across fall-back',()=>{expect(endInZone('2027-10-31',90,180,'Europe/Ljubljana')?.time).toBe('03:30')});
 it('validates windows against actual elapsed duration on a DST day',()=>{const g=demo();g.trip={...g.trip,start:'2027-03-28',end:'2027-03-28',timezone:'Europe/Ljubljana'};const a={...g.activities[0],rule:normalize('any day'),windows:[[60,240]] as [number,number][],duration:180};expect(check(a,'2027-03-28',60,g).valid).toBe(false);a.duration=120;expect(check(a,'2027-03-28',60,g).valid).toBe(true)});
});
