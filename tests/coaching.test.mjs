import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState,freshMatch,setLineup,start,pause,validateState,deleteHistory,setFormation,undoGame} from '../dist/model.js';
import * as coaching from '../dist/coaching.js';
function fixture(){const s=freshState();s.players='abcdefgh'.split('').map(id=>({id,name:id,present:true}));setLineup(s.match,'abcdef'.split(''));start(s.match,0);pause(s.match,600000);return s;}
test('voorkeurslinie is optioneel in oude opslag en ongeldige waarden worden geweigerd',()=>{
 const s=fixture();validateState(s);s.players[0].preferredLine='defence';validateState(s);s.players[0].preferredLine='keeper';assert.throws(()=>validateState(s));
});
test('voorstel zet minst spelende bankspelers in, behoudt keeper en verandert niets zonder bevestiging',()=>{
 const s=fixture(),before=JSON.stringify(s);const p=coaching.proposeSubstitutions(s,{now:600000});assert.equal(p.changes.length,2);
 assert.deepEqual(p.changes.map(x=>x.inId),['g','h']);assert.ok(p.changes.every(x=>x.index!==0));assert.equal(JSON.stringify(s),before);
 coaching.applySubstitutionProposal(s,p,600000);assert.equal(s.match.lineup[0],'a');assert.equal(new Set(s.match.lineup).size,6);assert.ok(s.match.lineup.includes('g'));assert.equal(s.match.events.length,1);
 undoGame(s);assert.deepEqual(s.match.lineup,'abcdef'.split(''));
});
test('speeltijd wint van voorkeur; binnen gelijke minuten telt linie mee',()=>{
 const s=fixture();s.players.find(p=>p.id==='g').preferredLine='attack';
 let p=coaching.proposeSubstitutions(s,{count:1,now:600000});assert.equal(p.changes[0].index,5);
 setLineup(s.match,['a','g','c','d','e','f'],600000);start(s.match,600000);pause(s.match,900000);
 // b has ten minutes, h none: h goes first even if b matches a position.
 s.players.find(p=>p.id==='b').preferredLine='attack';p=coaching.proposeSubstitutions(s,{count:1,now:900000});assert.equal(p.changes[0].inId,'h');assert.notEqual(p.changes[0].outId,'g');
});
test('gelijke kansen geven afwisseling in linies ondanks voorkeur',()=>{
 const s=fixture();s.players.find(p=>p.id==='b').preferredLine='defence';setLineup(s.match,['a','g','c','d','e','f'],600000);start(s.match,600000);pause(s.match,1200000);
 // b spent ten minutes defending, so a fresh line can beat its soft preference.
 s.players.find(p=>p.id==='h').present=false;const p=coaching.proposeSubstitutions(s,{count:1,now:1200000});assert.equal(p.changes[0].inId,'b');assert.notEqual(coaching.positionLine(s.match.formation,p.changes[0].index),'defence');
});
test('geen herhalingswissel zonder speeltijdvoordeel, afwezigen en afgelopen wedstrijd uitgesloten',()=>{
 const s=fixture();s.players.find(p=>p.id==='h').present=false;
 const p=coaching.proposeSubstitutions(s,{now:600000});assert.equal(p.changes.length,1);coaching.applySubstitutionProposal(s,p,600000);
 assert.equal(coaching.proposeSubstitutions(s,{now:600000}).changes.length,0);s.match.status='ended';assert.equal(coaching.proposeSubstitutions(s,{now:600000}).changes.length,0);
});
test('keepervoorstel kiest andere speler voor tweede helft en een veldkeeper ruilt van plek',()=>{
 const s=fixture();s.match.half=2;s.match.halfStartedAt=600000;
 const p=coaching.proposeSubstitutions(s,{keeper:true,now:600000});assert.equal(p.changes.length,1);assert.equal(p.changes[0].index,0);assert.equal(p.changes[0].inId,'g');
 p.changes[0].inId='b';coaching.applySubstitutionProposal(s,p,600000);assert.equal(s.match.lineup[0],'b');assert.equal(s.match.lineup[1],'a');assert.equal(new Set(s.match.lineup).size,6);
});
test('gewijzigde opstelling, ongeldige of dubbele keuzes worden veilig geweigerd',()=>{
 for(const change of ['stale','absent','duplicate','keeper']){
  const s=fixture(),p=coaching.proposeSubstitutions(s,{now:600000});
  if(change==='stale')setFormation(s.match,'1-2-1-2',600000);
  if(change==='absent')s.players.find(x=>x.id===p.changes[0].inId).present=false;
  if(change==='duplicate')p.changes[1].inId=p.changes[0].inId;
  if(change==='keeper')p.changes[0].index=0;
  const before=JSON.stringify(s);assert.throws(()=>coaching.applySubstitutionProposal(s,p,600000));assert.equal(JSON.stringify(s),before);
 }
});
test('speeltijdstatistieken tellen afgeronde wedstrijd eenmaal, ook keeper, en volgen verwijderen',()=>{
 const s=fixture();s.match.status='ended';s.history=[{match:structuredClone(s.match),players:structuredClone(s.players)}];
 let rows=coaching.playingStatistics(s);assert.equal(rows.find(x=>x.id==='a').total,600000);assert.equal(rows.find(x=>x.id==='g').matches,1);assert.equal(rows.find(x=>x.id==='g').total,0);
 const live=freshMatch();live.status='live';live.elapsed=100000;live.lineup=['a',null,null,null,null,null];live.initialLineup=[...live.lineup];s.match=live;
 rows=coaching.playingStatistics(s);assert.equal(rows.find(x=>x.id==='a').total,600000);assert.equal(rows.find(x=>x.id==='a').average,600000);
 deleteHistory(s,s.history[0].match.id);assert.equal(coaching.playingStatistics(s).find(x=>x.id==='a').total,0);
});
test('oude historie leidt af wie speelde en houdt afwezigheid uit het gemiddelde',()=>{
 const s=fixture();s.match.status='ended';s.history=[{match:structuredClone(s.match),players:s.players.map(({id,name})=>({id,name}))}];s.match=freshMatch();
 s.players=s.players.filter(x=>x.id!=='b');const rows=coaching.playingStatistics(s);assert.equal(rows.find(x=>x.id==='b').total,600000);assert.equal(rows.find(x=>x.id==='h').matches,0);assert.equal(rows.find(x=>x.id==='h').last,null);
});
test('linietijd volgt formatiewijzigingen en pauzes voor beide formaties',()=>{
 const s=fixture();setFormation(s.match,'1-2-1-2',600000);start(s.match,700000);pause(s.match,1000000);
 const t=coaching.lineMinutes(s.match,1000000);assert.equal(t.a.keeper,900000);assert.equal(t.e.midfield,600000);assert.equal(t.e.attack,300000);assert.equal(coaching.positionLine('1-2-1-2',3),'midfield');
});
test('voorkeur kan een groter verschil in uitgaande speeltijd niet overstemmen',()=>{
 const s=fixture();s.match.elapsed=480000;setLineup(s.match,['a','b','c','d','e','h'],480000);start(s.match,480000);pause(s.match,600000);
 s.players.find(p=>p.id==='g').preferredLine='attack';const p=coaching.proposeSubstitutions(s,{count:1,now:600000});
 assert.equal(p.changes[0].inId,'g');assert.notEqual(p.changes[0].outId,'h');
});
test('aanwezigheid in nieuwe archieven wordt gevalideerd terwijl oude archieven geldig blijven',()=>{
 const s=fixture();s.match.status='ended';s.history=[{match:structuredClone(s.match),players:[{id:'a',name:'a'}]}];validateState(s);
 s.history[0].players[0].present='ja';assert.throws(()=>validateState(s));
});
test('beide bankspelers wisselen mee, ook wanneer tweede evenveel minuten heeft',()=>{
 const s=fixture();setLineup(s.match,['a','g','c','d','e','f'],600000);
 start(s.match,600000);pause(s.match,660000);
 // b heeft 10 minuten, h 0; overige veldspelers 11. Na 1 minuut beiden beschikbaar.
 let p=coaching.proposeSubstitutions(s,{now:660000});assert.equal(p.changes.length,2);
 coaching.applySubstitutionProposal(s,p,660000);
 start(s.match,660000);pause(s.match,720000);
 // Een groepswissel mag ook zonder individueel minuutvoordeel voor ieder kind.
 p=coaching.proposeSubstitutions(s,{now:720000});assert.equal(p.changes.length,2);
 coaching.applySubstitutionProposal(s,p,720000);assert.equal(coaching.proposeSubstitutions(s,{now:720000}).changes.length,0);
});
test('bankspeler met evenveel keeperminuten blijft in dubbel voorstel',()=>{
 const s=fixture();
 s.match.initialLineup=['g','b',null,null,null,'f'];
 s.match.events=[
  {id:'swap',type:'lineup',at:60000,before:['g','b',null,null,null,'f'],lineup:['g','a','c','d','e','h']},
  {id:'keeper',type:'lineup',at:570000,before:['g','a','c','d','e','h'],lineup:['a','b','c','d','e','f']}
 ];
 s.match.lineup=['a','b','c','d','e','f'];s.match.elapsed=630000;
 // g: 9:30 keepen; h: 8:30 veld; c/d/e: 9:30 veld. Oude regel koos alleen h.
 const p=coaching.proposeSubstitutions(s,{now:630000});assert.equal(p.changes.length,2);
 assert.deepEqual(p.changes.map(x=>x.inId),['h','g']);
});
