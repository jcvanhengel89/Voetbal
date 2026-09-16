import test from 'node:test';
import assert from 'node:assert/strict';
import {createTraining,defaultStart,nextTrainingDate,schedule,trainingElapsed,startTraining,pauseTraining,nextBlock,rinusUrl,validateTraining,trainingText} from '../dist/training.js';
import {freshState,validateState} from '../dist/model.js';
const links=['https://rinus.knvb.nl/exercise/id/1','https://rinus.knvb.nl/nl/exercise/id/2','https://rinus.knvb.nl/exercise/id/3',''];
const training=date=>createTraining({date,links});
test('schema woensdag en vrijdag past precies binnen 70 minuten',()=>{
 const wed=training('2026-09-16'),fri=training('2026-09-18');
 assert.equal(wed.start,'17:30');assert.equal(fri.start,'17:45');
 assert.deepEqual(schedule(wed).map(b=>[b.start,b.end]),[['17:30','17:40'],['17:40','17:55'],['17:55','18:10'],['18:10','18:40']]);
 assert.equal(schedule(fri).at(-1).end,'18:55');assert.equal(schedule(fri).at(-1).url,'');
 assert.equal(nextTrainingDate(new Date('2026-09-19T12:00:00')),'2026-09-23');
 assert.equal(defaultStart('2026-09-18'),'17:45');
});
test('timer hervat na herladen, pauze telt niet en volgende stap is handmatig',()=>{
 let t=training('2026-09-16');startTraining(t,1000);t=JSON.parse(JSON.stringify(t));
 assert.equal(trainingElapsed(t,901000),900000);assert.equal(t.run.index,0);
 pauseTraining(t,901000);assert.equal(trainingElapsed(t,2000000),900000);
 nextBlock(t,2000000);assert.equal(t.run.index,1);assert.equal(trainingElapsed(t),0);assert.equal(t.run.startedAt,null);
 startTraining(t,3000000);nextBlock(t,3100000);assert.equal(t.run.index,2);assert.equal(trainingElapsed(t,3160000),60000);
 nextBlock(t,3200000);nextBlock(t,3300000);assert.equal(t.run.status,'ended');assert.equal(t.run.startedAt,null);
 startTraining(t,4000000);assert.equal(t.run.status,'ended');assert.equal(trainingElapsed(t,4000000),100000);
});
test('Rinus-links begrensd tot oefenpagina; partijen optioneel',()=>{
 assert.equal(rinusUrl('',true),'');assert.equal(rinusUrl(links[0]+'?a=1'),links[0]+'?a=1');
 for(const url of ['','javascript:alert(1)','https://rinus.knvb.nl.evil.test/exercise/id/1','http://rinus.knvb.nl/exercise/id/1','https://user:pass@rinus.knvb.nl/exercise/id/1','https://rinus.knvb.nl/','https://rinus.knvb.nl/login'])assert.throws(()=>rinusUrl(url));
 assert.throws(()=>createTraining({date:'2026-02-30',links}));assert.throws(()=>createTraining({date:'2026-09-16',start:'25:00',links}));
});
test('back-up bewaart training, notities en timer; corrupte toestand geweigerd',()=>{
 const s=freshState();const t=training('2026-09-18');t.notes='Ballen en pionnen';s.trainings.push(t);s.selectedTrainingId=t.id;startTraining(t,1000);
 assert.deepEqual(validateState(JSON.parse(JSON.stringify(s))),s);
 const snapshot=structuredClone(s);pauseTraining(snapshot.trainings[0],61000);assert.equal(trainingElapsed(snapshot.trainings[0],1000000),60000);
 assert.match(trainingText(t),/17:45–17:55 Warming-up/);assert.match(trainingText(t),/Ballen en pionnen/);
 const corrupt=structuredClone(t);corrupt.run.index=4;assert.throws(()=>validateTraining(corrupt));
 const double=structuredClone(s);double.trainings.push({...structuredClone(t),id:'another'});assert.throws(()=>validateState(double));
});
