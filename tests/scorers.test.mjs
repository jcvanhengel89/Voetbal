import test from 'node:test';
import assert from 'node:assert/strict';
import * as model from '../dist/model.js';
const players=[{id:'a',name:'Ali',present:true},{id:'b',name:'Bo',present:true}];
const goal=(id,scorerId,side='us')=>({id,type:'goal',at:0,side,...(scorerId===undefined?{}:{scorerId})});
function setup(){const s=model.freshState();s.players=structuredClone(players);s.match.status='live';return s;}
test('topscorers tellen lopende wedstrijd en archief elk eenmaal, met onbekende goals apart',()=>{
 const s=setup();s.match.events=[goal('1','a'),goal('2','a'),goal('3',undefined),goal('4',undefined,'them')];
 s.match.status='ended';s.history.push({match:structuredClone(s.match),players:structuredClone(players)});
 const previous=model.freshMatch();previous.status='ended';previous.events=[goal('5','b')];s.history.unshift({match:previous,players:structuredClone(players)});
 assert.equal(typeof model.topScorers,'function');
 assert.deepEqual(model.topScorers(s),{players:[{id:'a',name:'Ali',goals:2},{id:'b',name:'Bo',goals:1}],unknown:1});
 s.match=model.freshMatch();s.match.status='live';s.match.events=[goal('6','b')];
 assert.deepEqual(model.topScorers(s),{players:[{id:'a',name:'Ali',goals:2},{id:'b',name:'Bo',goals:2}],unknown:1});
});
test('verwijderen en herstellen van goal corrigeert topscorer, verwijderde speler blijft in archief meetellen',()=>{
 const s=setup();s.match.events=[goal('1','a')];
 assert.equal(typeof model.topScorers,'function');
 model.changeGame(s,'goal verwijderd',m=>model.removeGoal(m,'us'));assert.deepEqual(model.topScorers(s).players,[]);
 model.undoGame(s);assert.equal(model.topScorers(s).players[0].goals,1);
 s.match.status='ended';s.history.push({match:structuredClone(s.match),players:structuredClone(players)});s.match=model.freshMatch();s.players=[];s.undoHistory=[];
 assert.deepEqual(model.topScorers(model.validateState(s)).players,[{id:'a',name:'Ali',goals:1}]);
});
test('oude goals zonder maker blijven geldig en scorer-ID moet bij de wedstrijd horen',()=>{
 const s=setup();s.match.events=[goal('old',undefined)];model.validateState(structuredClone(s));
 s.match.events[0].scorerId='a';assert.deepEqual(model.validateState(structuredClone(s)),s);
 for(const invalid of ['missing',7,{},'']){const bad=structuredClone(s);bad.match.events[0].scorerId=invalid;assert.throws(()=>model.validateState(bad));}
 const against=structuredClone(s);against.match.events[0].side='them';assert.throws(()=>model.validateState(against));
 const historic=setup();historic.match.status='ended';historic.match.events=[goal('1','a')];historic.history=[{match:structuredClone(historic.match),players:[players[1]]}];historic.match=model.freshMatch();
 assert.throws(()=>model.validateState(historic));
});
test('samenvatting toont doelpuntenmakers en aantallen zonder tegenstanders mee te tellen',()=>{
 const s=setup();s.match.events=[goal('1','a'),goal('2','a'),goal('3','b'),goal('4',undefined,'them')];s.match.status='ended';
 const text=model.matchSummary(s.match,players);
 assert.match(text,/Eindstand: 3–1/);assert.match(text,/Ali \(2\)/);assert.match(text,/Bo \(1\)/);
});
