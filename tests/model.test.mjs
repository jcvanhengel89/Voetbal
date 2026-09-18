import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState,freshMatch,start,pause,elapsed,minutes,setLineup,setFormation,positionNames,normalizeTeamUrl,score,undo,validateState} from '../dist/model.js';
const setup=()=>{const m=freshMatch();setLineup(m,['a','b','c','d','e','f'],0);return m;};
test('klok blijft juist bij pauze, herladen en hervatten',()=>{const m=setup();start(m,1000);assert.equal(elapsed(m,61000),60000);const restored=JSON.parse(JSON.stringify(m));assert.equal(elapsed(restored,91000),90000);pause(m,121000);assert.equal(elapsed(m,600000),120000);start(m,600000);assert.equal(elapsed(m,660000),180000);});
test('lopende klok gaat bij teruggezette systeemtijd niet voorbij vastgelegde acties terug',()=>{
 const began=Date.now()+60000,s=freshState();s.players='abcdefg'.split('').map(id=>({id,name:id,present:true}));s.match=setup();start(s.match,began);
 setLineup(s.match,['g','b','c','d','e','f'],began+5000);
 assert.equal(elapsed(s.match,began-1000),5000);
 assert.deepEqual(validateState(structuredClone(s)),s);
 setFormation(s.match,'1-2-1-2',began-1000);
 assert.equal(s.match.events.at(-1).at,5000);
 pause(s.match,began-2000);
 assert.equal(s.match.elapsed,5000);
 assert.deepEqual(validateState(structuredClone(s)),s);
 const half=setup();half.status='live';half.elapsed=3000;half.half=2;half.halfStartedAt=4000;half.startedAt=began;
 assert.equal(elapsed(half,began-1000),4000);
});
test('validatie weigert acties voorbij de klok van stilgezette wedstrijden',()=>{
 for(const status of ['live','ended']){
  const s=freshState();s.players='abcdef'.split('').map(id=>({id,name:id,present:true}));s.match=setup();start(s.match,0);pause(s.match,1000);s.match.status=status;
  s.match.events.push({id:'te-laat',type:'goal',side:'us',at:3000});
  assert.throws(()=>validateState(s));
 }
});
test('wissels verdelen speeltijd en keeper telt mee',()=>{const m=setup();start(m,0);setLineup(m,['g','b','c','d','e','f'],600000);pause(m,1200000);const t=minutes(m,9999999);assert.equal(t.a,600000);assert.equal(t.g,600000);assert.equal(t.b,1200000);assert.equal(Object.values(t).reduce((a,b)=>a+b),6*1200000);});
test('herstellen van een wissel corrigeert minuten vanaf het wisselmoment',()=>{const m=setup();start(m,0);setLineup(m,['g','b','c','d','e','f'],600000);assert.equal(minutes(m,900000).g,300000);undo(m);assert.deepEqual(m.lineup,m.initialLineup);assert.equal(minutes(m,900000).a,900000);assert.equal(minutes(m,900000).g,undefined);});
test('meerdere wissels en positie wisselen behouden totale spelersminuten',()=>{const m=setup();start(m,0);setLineup(m,['a','g','c','d','e','f'],100000);setLineup(m,['g','a','c','d','e','f'],200000);pause(m,300000);assert.deepEqual(minutes(m),{a:300000,b:100000,c:300000,d:300000,e:300000,f:300000,g:200000});});
test('rust en time-outs worden niet bij speeltijd opgeteld',()=>{const m=setup();start(m,0);pause(m,750000);setLineup(m,['g','b','c','d','e','f'],900000);start(m,1000000);pause(m,1250000);assert.equal(elapsed(m),1000000);assert.equal(minutes(m).a,750000);assert.equal(minutes(m).g,250000);});
test('doelpunten en herstellen laten klok ongemoeid',()=>{const m=setup();start(m,0);m.events.push({id:'goal1',type:'goal',side:'us',at:1000},{id:'goal2',type:'goal',side:'them',at:2000});assert.deepEqual(score(m),{us:1,them:1});undo(m);assert.deepEqual(score(m),{us:1,them:0});assert.equal(elapsed(m,6000),6000);});
test('afgeronde wedstrijd wijzigt niet meer',()=>{const m=setup();m.status='ended';assert.throws(()=>setLineup(m,Array(6).fill(null)));assert.equal(undo(m),false);start(m,10);assert.equal(m.startedAt,null);});
test('back-up roundtrip, ongeldige spelers en beschadigde eventketen',()=>{const s=freshState();s.players='abcdefg'.split('').map(id=>({id,name:id,present:true}));s.match=setup();start(s.match,0);setLineup(s.match,['g','b','c','d','e','f'],1000);pause(s.match,2000);assert.deepEqual(validateState(JSON.parse(JSON.stringify(s))),s);const broken=structuredClone(s);broken.match.events[0].before[0]='g';assert.throws(()=>validateState(broken));const duplicate=structuredClone(s);duplicate.players.push(duplicate.players[0]);assert.throws(()=>validateState(duplicate));const missing=structuredClone(s);missing.players.shift();assert.throws(()=>validateState(missing));assert.throws(()=>validateState({version:2}));});
test('back-up snapshot houdt de tijd van export, actieve wedstrijd blijft lopen',()=>{const m=setup();start(m,0);const snapshot=structuredClone(m);pause(snapshot,2000);assert.equal(elapsed(snapshot,9000000),2000);assert.equal(elapsed(m,10000),10000);});
test('andere formatie behoudt spelers en minuten, en is herstelbaar',()=>{const m=setup();start(m,0);setFormation(m,'1-2-1-2',100000);assert.deepEqual(m.lineup,['a','b','c','d','e','f']);assert.deepEqual(positionNames(m),['Keeper','Linksachter','Rechtsachter','Middenvelder','Linksspits','Rechtsspits']);assert.equal(minutes(m,200000).a,200000);setLineup(m,['a','g','c','d','e','f'],250000);undo(m);assert.equal(m.formation,'1-2-1-2');undo(m);assert.equal(m.formation,'1-2-2-1');assert.deepEqual(minutes(m,300000),{a:300000,b:300000,c:300000,d:300000,e:300000,f:300000});});
test('formatie voor aftrap en herstel uit back-up zijn consistent',()=>{const s=freshState();setFormation(s.match,'1-2-1-2');assert.equal(s.match.events.length,0);assert.equal(s.match.initialFormation,'1-2-1-2');assert.deepEqual(validateState(structuredClone(s)),s);start(s.match,0);setFormation(s.match,'1-2-2-1',1000);pause(s.match,2000);assert.deepEqual(validateState(structuredClone(s)),s);const invalid=structuredClone(s);invalid.match.events[0].beforeFormation='1-2-2-1';assert.throws(()=>validateState(invalid));assert.throws(()=>setFormation(s.match,'__proto__'));s.match.status='ended';assert.throws(()=>setFormation(s.match,'1-2-1-2'));});
test('bestaande opslag en oude back-ups krijgen oorspronkelijke formatie',()=>{const s=freshState();delete s.teamUrl;delete s.match.formation;delete s.match.initialFormation;const upgraded=validateState(s);assert.equal(upgraded.match.formation,'1-2-2-1');assert.equal(upgraded.match.initialFormation,'1-2-2-1');assert.equal(upgraded.teamUrl,'');assert.deepEqual(upgraded.match.lineup,Array(6).fill(null));});
test('teamlink staat alleen veilige voetbal.nl-URLs zonder inloggegevens toe',()=>{assert.equal(normalizeTeamUrl(''),'');assert.equal(normalizeTeamUrl(' https://www.voetbal.nl/team/test '),'https://www.voetbal.nl/team/test');for(const url of ['javascript:alert(1)','https://voetbal.nl.example.com/team/test','https://evilvoetbal.nl/team/test','https://user:password@voetbal.nl/team/test','http://voetbal.nl/team/test','https://voetbal.nl/inloggen','https://www.voetbal.nl/'])assert.throws(()=>normalizeTeamUrl(url));});
