import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState,setLineup,start,pause,minutes,elapsed} from '../dist/model.js';
import * as coaching from '../dist/coaching.js';
const MINUTE=60000;
function team(size){
 const s=freshState();s.players='abcdefghi'.slice(0,size).split('').map(id=>({id,name:id,present:true}));
 setLineup(s.match,'abcdef'.split(''));start(s.match,0);return s;
}
function simulate(size,{pauseAt=null}={}){
 const s=team(size),times=[];let wall=0,offset=0,halfChanged=false,paused=false;
 for(let steps=0;steps<100;steps++){
  const plan=coaching.playingTimePlan(s,{now:wall}),at=elapsed(s.match,wall);
  if(at>=50*MINUTE-1)break;
  let next=Math.min(plan.nextSwapAtMs??50*MINUTE,halfChanged?50*MINUTE:25*MINUTE,50*MINUTE);
  if(!paused&&pauseAt!==null)next=Math.min(next,pauseAt*MINUTE);
  assert.ok(next>=at,'advice cannot move the match clock backwards');
  wall=next+offset;
  if(!paused&&pauseAt!==null&&next===pauseAt*MINUTE){pause(s.match,wall);offset+=17*MINUTE;wall+=17*MINUTE;start(s.match,wall);paused=true;continue;}
  if(!halfChanged&&next===25*MINUTE){
   pause(s.match,wall);s.match.half=2;s.match.halfStartedAt=next;
   const keeper=coaching.proposeSubstitutions(s,{keeper:true,now:wall});coaching.applySubstitutionProposal(s,keeper,wall);start(s.match,wall);halfChanged=true;
  }
  const current=coaching.playingTimePlan(s,{now:wall});
  if(current.status==='due'){
   const p=coaching.proposeSubstitutions(s,{now:wall});assert.ok(p.changes.length>0,'due advice includes an eligible substitute');assert.ok(p.changes.length<=2);
   times.push(next/MINUTE);coaching.applySubstitutionProposal(s,p,wall);
  }
  if(next===50*MINUTE)break;
 }
 wall=50*MINUTE+offset;pause(s.match,wall);
 return {s,times,totals:Object.values(minutes(s.match,wall)).map(v=>v/MINUTE)};
}
test('remaining plan reserves both keeper halves and recommends a useful match-clock time',()=>{
 const s=team(8),before=JSON.stringify(s),p=coaching.playingTimePlan(s,{now:0});
 assert.equal(p.plannedDurationMs,50*MINUTE);assert.equal(p.targetMinutes,37.5);assert.equal(p.remainingMs,50*MINUTE);
 assert.equal(p.nextSwapAtMs,12.5*MINUTE);assert.equal(p.status,'scheduled');
 assert.equal(p.keeper.nextKeeperId,'g');assert.equal(p.players.find(x=>x.id==='g').reservedKeeperMs,25*MINUTE);
 assert.equal(p.players.find(x=>x.id==='a').remainingFieldMs,12.5*MINUTE);assert.equal(JSON.stringify(s),before);
});
for(const size of [7,8,9])test(`${size} players finish close to equal time using dynamic advice and a half-time keeper change`,()=>{
 const {s,totals,times}=simulate(size);
 assert.equal(totals.length,size);assert.ok(Math.max(...totals)-Math.min(...totals)<.01,JSON.stringify({size,totals,times}));
 assert.ok(times.some(t=>t%10!==0));assert.equal(s.match.lineup[0],'g');
 assert.ok(Object.values(coaching.lineMinutes(s.match,50*MINUTE)).filter(x=>x.keeper>0).every(x=>x.keeper===25*MINUTE));
});
test('pause and resume preserve recommended match time and final fairness',()=>{
 const normal=simulate(8),paused=simulate(8,{pauseAt:18});assert.deepEqual(paused.times,normal.times);assert.deepEqual(paused.totals,normal.totals);
 const s=team(8);pause(s.match,10*MINUTE);const p=coaching.playingTimePlan(s,{now:10*MINUTE});
 assert.deepEqual(coaching.playingTimePlan(s,{now:40*MINUTE}),p);
});
test('late bench deficit makes advice due immediately and reports unreachable equality',()=>{
 const s=team(8);s.match.half=2;s.match.halfStartedAt=25*MINUTE;
 setLineup(s.match,['g','b','c','d','e','f'],25*MINUTE);
 const plan=coaching.playingTimePlan(s,{now:44*MINUTE});
 assert.equal(plan.status,'due');assert.equal(plan.nextSwapInMs,0);assert.equal(plan.equalityFeasible,false);
 const p=coaching.proposeSubstitutions(s,{now:44*MINUTE});assert.ok(p.changes.some(x=>x.inId==='h'));assert.ok(p.changes.every(x=>x.index!==0));
});
test('one minute protection delays corrective advice after a manual group swap',()=>{
 const s=team(8);const p=coaching.proposeSubstitutions(s,{now:10*MINUTE});coaching.applySubstitutionProposal(s,p,10*MINUTE);
 assert.equal(coaching.proposeSubstitutions(s,{now:10*MINUTE}).changes.length,0);
 assert.ok(coaching.playingTimePlan(s,{now:10*MINUTE}).nextSwapAtMs>=11*MINUTE);
});
test('a manually changed first-half keeper gets one remaining half reserved and a different next keeper',()=>{
 const s=team(8);setLineup(s.match,['g','b','c','d','e','f'],10*MINUTE);
 const plan=coaching.playingTimePlan(s,{now:10*MINUTE});
 assert.notEqual(plan.keeper.nextKeeperId,'g');assert.equal(plan.players.find(x=>x.id==='g').reservedKeeperMs,15*MINUTE);
 s.match.half=2;s.match.halfStartedAt=25*MINUTE;
 const p=coaching.proposeSubstitutions(s,{keeper:true,now:25*MINUTE});
 assert.equal(p.changes[0].inId,plan.keeper.nextKeeperId);
});
test('a player marked absent on the field can be replaced by a present bench player',()=>{
 const s=team(8);s.players.find(p=>p.id==='b').present=false;
 const proposal=coaching.proposeSubstitutions(s,{now:10*MINUTE});
 assert.ok(proposal.changes.some(p=>p.outId==='b'));assert.ok(proposal.changes.every(p=>s.players.find(x=>x.id===p.inId).present));
});
