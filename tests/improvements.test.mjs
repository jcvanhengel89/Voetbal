import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState,setLineup,setFormation,start,pause,elapsed,score,minutes,removeGoal,changeGame,undoGame,validateState,reminders,backupDue} from '../dist/model.js';
function setup(){const s=freshState();s.players='abcdefg'.split('').map(id=>({id,name:id,present:true}));setLineup(s.match,['a','b','c','d','e','f']);start(s.match,0);return s;}
test('herstel van een verwijderd doelpunt behoudt latere wissel en speeltijd',()=>{
 const s=setup(),m=s.match;m.events.push({id:'goal',type:'goal',at:1000,side:'us'});setLineup(m,['g','b','c','d','e','f'],2000);pause(m,5000);
 changeGame(s,'doelpunt verwijderd',m=>removeGoal(m,'us'));assert.equal(score(m).us,0);
 m.summary='Mijn eigen bericht';const times=minutes(m);const restored=validateState(JSON.parse(JSON.stringify(s)));
 assert.equal(undoGame(restored),'doelpunt verwijderd');assert.equal(score(restored.match).us,1);assert.deepEqual(minutes(restored.match),times);assert.equal(restored.match.summary,'Mijn eigen bericht');assert.equal(elapsed(restored.match),5000);
 assert.equal(undoGame(restored),false);
});
test('meerdere herstelacties blijven in volgorde na doelpunt, wissel en formatie',()=>{
 const s=setup();changeGame(s,'goal',m=>m.events.push({id:'g',type:'goal',side:'them',at:1000}));changeGame(s,'wissel',m=>setLineup(m,['g','b','c','d','e','f'],2000));changeGame(s,'formatie',m=>setFormation(m,'1-2-1-2',3000));pause(s.match,4000);
 assert.equal(undoGame(s),'formatie');assert.equal(s.match.formation,'1-2-2-1');assert.equal(undoGame(s),'wissel');assert.equal(s.match.lineup[0],'a');assert.equal(score(s.match).them,1);assert.equal(undoGame(s),'goal');assert.equal(score(s.match).them,0);validateState(s);
});
test('time-out per helft en wisselherinnering volgen werkelijk gespeelde tijd',()=>{
 const s=setup();s.swapInterval=5;
 assert.deepEqual(reminders(s,299999),{timeout:false,swap:false});assert.equal(reminders(s,300000).swap,true);
 setLineup(s.match,['g','b','c','d','e','f'],310000);assert.equal(reminders(s,500000).swap,false);
 assert.equal(reminders(s,750000).timeout,true);s.match.timeouts=[1];assert.equal(reminders(s,760000).timeout,false);
 pause(s.match,1600000);s.match.half=2;s.match.halfStartedAt=elapsed(s.match);start(s.match,2000000);
 assert.equal(reminders(s,2749999).timeout,false);assert.equal(reminders(s,2750000).timeout,true);
 s.match.status='ended';pause(s.match,2750000);assert.deepEqual(reminders(s,3000000),{timeout:false,swap:false});
});
test('oude back-ups krijgen veilige defaults, notities en archief blijven behouden',()=>{
 const s=setup();pause(s.match,10000);s.match.status='ended';s.history.push({match:structuredClone(s.match),players:structuredClone(s.players)});
 for(const key of ['undoHistory','trainings','selectedTrainingId','swapInterval','backupAt','backupMatches'])delete s[key];
 for(const m of [s.match,s.history[0].match])for(const key of ['summary','notes','halfStartedAt','timeouts','swapSnoozeAt'])delete m[key];
 const r=validateState(s);assert.deepEqual(r.trainings,[]);assert.equal(r.history[0].match.notes,'');assert.equal(r.match.halfStartedAt,0);assert.equal(r.players.length,7);
});
test('back-upherinnering na eerste wedstrijd, drie nieuwe wedstrijden of een week',()=>{
 const s=freshState();assert.equal(backupDue(s,1000000000),false);s.history.push({});assert.equal(backupDue(s),true);
 s.backupAt=1000000;s.backupMatches=1;assert.equal(backupDue(s,1000001),false);assert.equal(backupDue(s,1000000+7*86400000),true);
 s.history.push({},{},{});assert.equal(backupDue(s,1000001),true);
});
