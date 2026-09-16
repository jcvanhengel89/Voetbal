import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import * as model from '../dist/model.js';
import * as training from '../dist/training.js';
const code=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'');
// A small DOM adapter exercises event handlers and persistence without a browser.
function app(initial=model.freshState(),hash=''){
 const storage=new Map([['zijlijn-v1',JSON.stringify(initial)]]),elements=new Map(),handlers={};
 const element=selector=>{if(!elements.has(selector))elements.set(selector,{innerHTML:'',textContent:'',value:'',style:{},dataset:{},open:false,setAttribute(){},showModal(){this.open=true;},close(){this.open=false;},focus(){},click(){}});return elements.get(selector);};
 const context=vm.createContext({...model,...training,console,URL,Blob,structuredClone,crypto,Date,JSON,Set,Map,FormData:class{constructor(form){this.data=form.data;}get(key){return this.data[key];}},navigator:{onLine:false},location:{hash},document:{querySelector:element,querySelectorAll:()=>[],addEventListener:(type,fn)=>(handlers[type]??=[]).push(fn),visibilityState:'visible',createElement:()=>element('a')},window:{addEventListener(){}},localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},setTimeout:()=>0,clearTimeout(){},setInterval(){},fetch:async()=>{throw Error('offline');}});
 vm.runInContext(code,context);
 return {run:s=>vm.runInContext(s,context),stored:()=>JSON.parse(storage.get('zijlijn-v1')),element,emit:async(type,target)=>{for(const h of handlers[type]||[])await h({target,preventDefault(){}});}};
}
test('startschermen laden en trainingformulier bewaart drie links met correcte vrijdagtijd',async()=>{
 const a=app(undefined,'#training');assert.match(a.element('#app').innerHTML,/Eerste training maken/);
 a.run("actions['new-training']()");assert.match(a.element('#app').innerHTML,/training-form/);
 const links=['https://rinus.knvb.nl/exercise/id/1','https://rinus.knvb.nl/exercise/id/2','https://rinus.knvb.nl/exercise/id/3'];
 await a.emit('submit',{id:'training-form',data:{date:'2026-09-18',start:'17:45',field:'Veld 5',theme:'Aanvallen',link0:links[0],link1:links[1],link2:links[2],link3:''}});
 assert.equal(a.stored().trainings.length,1);assert.match(a.element('#app').innerHTML,/18:55/);assert.match(a.element('#app').innerHTML,/Open oefening in Rinus/);
 a.run("actions['training-clock']()");assert.equal(a.stored().trainings[0].run.status,'live');
 a.run("actions['training-clock']()");assert.equal(a.stored().trainings[0].run.startedAt,null);
 a.run("actions['confirm-training-next']()");assert.equal(a.stored().trainings[0].run.index,1);
});
test('samenvatting bewaart wijzigingen en blijft na heropenen en nieuwe wedstrijd beschikbaar',async()=>{
 const s=model.freshState();s.match.status='ended';s.match.opponent='Testclub';s.history.push({match:structuredClone(s.match),players:[]});
 const a=app(s);a.run("actions.summary()");
 await a.emit('input',{id:'summary-text',value:'Mooi samengespeeld!',hasAttribute:()=>false});
 assert.equal(a.stored().match.summary,'Mooi samengespeeld!');assert.equal(a.stored().history[0].match.summary,'Mooi samengespeeld!');
 a.run("actions.close();actions.summary()");assert.match(a.element('#dialog-content').innerHTML,/Mooi samengespeeld!/);
 a.run("actions['confirm-new']()");a.run(`actions.history({dataset:{id:${JSON.stringify(s.match.id)}}})`);assert.match(a.element('#dialog-content').innerHTML,/Testclub/);
 a.run(`actions.summary({dataset:{id:${JSON.stringify(s.match.id)}}})`);assert.match(a.element('#dialog-content').innerHTML,/Mooi samengespeeld!/);
});
test('scorecorrectie na afronden en herstellen werken door in archief',()=>{
 const s=model.freshState();s.match.status='ended';s.match.events.push({id:'g',type:'goal',at:0,side:'us'});s.history.push({match:structuredClone(s.match),players:[]});
 const a=app(s);a.run("actions['minus-us']()");assert.equal(model.score(a.stored().history[0].match).us,0);
 a.run("actions.undo()");assert.equal(model.score(a.stored().history[0].match).us,1);model.validateState(a.stored());
});
test('alle navigatieschermen renderen na herladen met training en wedstrijdgegevens',()=>{
 const s=model.freshState();const t=training.createTraining({date:'2026-09-18',links:['https://rinus.knvb.nl/exercise/id/1','https://rinus.knvb.nl/exercise/id/2','https://rinus.knvb.nl/exercise/id/3','']});s.trainings.push(t);s.selectedTrainingId=t.id;
 for(const tab of ['wedstrijd','opstelling','training','team']){const a=app(s,'#'+tab);assert.ok(a.element('#app').innerHTML.length>300);}
});
