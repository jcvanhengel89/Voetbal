import test from 'node:test';
import assert from 'node:assert/strict';
import {freshMatch,start,pause,setLineup,minutes,score,removeGoal,matchSummary} from '../dist/model.js';
test('scorecorrectie laat latere wissels en speeltijd intact en stopt bij nul',()=>{
 const m=freshMatch();setLineup(m,['a','b','c','d','e','f']);start(m,0);
 m.events.push({id:'g1',type:'goal',side:'us',at:1000},{id:'g2',type:'goal',side:'them',at:2000});
 setLineup(m,['g','b','c','d','e','f'],3000);pause(m,4000);
 const before=minutes(m);assert.equal(removeGoal(m,'us'),true);
 assert.deepEqual(score(m),{us:0,them:1});assert.deepEqual(minutes(m),before);
 assert.equal(m.events.at(-1).type,'lineup');assert.equal(removeGoal(m,'us'),false);
 m.status='ended';assert.equal(removeGoal(m,'them'),true);assert.deepEqual(score(m),{us:0,them:0});
});
test('samenvatting onderscheidt tussenstand en eindstand en volgt correcties',()=>{
 const m=freshMatch();m.opponent='Testclub';m.home=false;
 assert.match(matchSummary(m),/uit bij Testclub/);assert.doesNotMatch(matchSummary(m),/Eindstand/);
 start(m,0);m.events.push({id:'g',type:'goal',side:'us',at:1000});pause(m,2000);
 assert.match(matchSummary(m),/Tussenstand: 0–1/);
 m.status='ended';assert.match(matchSummary(m),/Gewonnen/);
 removeGoal(m,'us');assert.match(matchSummary(m),/Eindstand: 0–0/);assert.match(matchSummary(m),/Gelijkgespeeld/);
});
