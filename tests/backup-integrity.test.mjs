import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState,freshMatch,setLineup,start,pause,minutes,validateState} from '../dist/model.js';

function archivedState(){
 const s=freshState(),m=freshMatch();
 const players='abcdefg'.split('').map(id=>({id,name:id,present:true}));
 setLineup(m,'abcdef'.split(''));start(m,0);
 setLineup(m,['g','b','c','d','e','f'],1000);pause(m,2000);m.status='ended';
 s.history=[{match:m,players}];
 s.players=[{id:'new',name:'Nieuw teamlid',present:true}];
 return s;
}

test('archief valideert spelers tegen de eigen selectie en behoudt historische minuten',()=>{
 const s=archivedState(),restored=validateState(structuredClone(s));
 assert.deepEqual(restored,s);
 assert.equal(minutes(restored.history[0].match).a,1000);
 assert.equal(minutes(restored.history[0].match).g,1000);
});

for(const id of ['a','g','b'])test(`archief weigert ontbrekende speler ${id} uit begin-, wissel- of eindopstelling`,()=>{
 const s=archivedState();s.history[0].players=s.history[0].players.filter(p=>p.id!==id);
 // The same ID in the current roster cannot repair an incomplete archived roster.
 s.players.push({id,name:id,present:true});
 assert.throws(()=>validateState(s),/geldige Zijlijn-back-up/);
});

test('archief weigert ontbrekende speler die uitsluitend tussen twee wissels speelde',()=>{
 const s=archivedState(),h=s.history[0],m=h.match;
 m.events.push({id:'return',type:'lineup',at:1500,before:[...m.lineup],lineup:[...m.initialLineup]});
 m.lineup=[...m.initialLineup];
 assert.equal(minutes(validateState(structuredClone(s)).history[0].match).g,500);
 h.players=h.players.filter(p=>p.id!=='g');
 assert.throws(()=>validateState(s),/geldige Zijlijn-back-up/);
});

for(const invalid of ['empty-id','whitespace-id','empty-name','whitespace-name','duplicate-id'])test(`archief weigert beschadigde selectie: ${invalid}`,()=>{
 const s=archivedState(),roster=s.history[0].players;
 if(invalid==='empty-id')roster.push({id:'',name:'Extra'});
 if(invalid==='whitespace-id')roster.push({id:'  ',name:'Extra'});
 if(invalid==='empty-name')roster[0].name='';
 if(invalid==='whitespace-name')roster[0].name='  ';
 if(invalid==='duplicate-id')roster.push({...roster[0]});
 assert.throws(()=>validateState(s),/geldige Zijlijn-back-up/);
});

for(const location of ['current','archive'])for(const id of ['', '  '])for(const kind of ['player','match','event'])test(`back-up weigert leeg ${kind}-ID in ${location}: ${JSON.stringify(id)}`,()=>{
  const s=archivedState(),m=location==='current'?s.match:s.history[0].match;
  if(kind==='player')(location==='current'?s.players:s.history[0].players).push({id,name:'Extra',present:true});
  if(kind==='match')m.id=id;
  if(kind==='event')m.events.push({id,type:'goal',side:'us',at:m.elapsed});
  assert.throws(()=>validateState(s),/geldige Zijlijn-back-up/,kind);
});

for(const location of ['current','archive'])test(`back-up weigert dubbele actie-ID binnen ${location}`,()=>{
 const s=archivedState(),m=location==='current'?s.match:s.history[0].match;
 m.events.push({id:'duplicate',type:'goal',side:'us',at:m.elapsed},{id:'duplicate',type:'goal',side:'them',at:m.elapsed});
 assert.throws(()=>validateState(s),/geldige Zijlijn-back-up/);
});

test('back-up weigert dubbele wedstrijden binnen historie',()=>{
 const s=archivedState();s.history.push(structuredClone(s.history[0]));
 assert.throws(()=>validateState(s),/geldige Zijlijn-back-up/);
});

test('afgeronde huidige wedstrijd mag ook in historie staan, actie-ID mag per wedstrijd terugkomen',()=>{
 const s=archivedState();s.players=structuredClone(s.history[0].players);s.match=structuredClone(s.history[0].match);
 const second=structuredClone(s.history[0]);second.match.id='other-match';s.history.push(second);
 assert.deepEqual(validateState(structuredClone(s)),s);
});

test('oude archieven met volledige selectie zonder aanwezigheid en optionele velden blijven geldig',()=>{
 const s=archivedState(),h=s.history[0];h.players=h.players.map(({id,name})=>({id,name}));
 delete s.teamUrl;
 for(const key of ['formation','initialFormation','halfStartedAt','timeouts','swapSnoozeAt','summary','summarySaved','notes'])delete h.match[key];
 const restored=validateState(s);
 assert.deepEqual(restored.history[0].players,h.players);
 assert.equal(restored.history[0].match.formation,'1-2-2-1');
 assert.equal(minutes(restored.history[0].match).a,1000);
});
