import {elapsed,minutes,setLineup,changeGame} from './model.js';

export const PREFERRED_LINES={any:'Geen voorkeur',defence:'Verdediging',midfield:'Middenveld',attack:'Aanval'};
export function positionLine(formation,index){
 if(index===0)return 'keeper';
 if(index<3)return 'defence';
 return index<(formation==='1-2-1-2'?4:5)?'midfield':'attack';
}
// Integrate actual intervals, including changes in formation and goalkeeping.
export function lineMinutes(m,now=Date.now()){
 const result={},end=elapsed(m,now);let at=0,lineup=m.initialLineup,formation=m.initialFormation||'1-2-2-1';
 const add=until=>{for(let i=0;i<lineup.length;i++){const id=lineup[i];if(!id)continue;result[id]??={keeper:0,defence:0,midfield:0,attack:0};result[id][positionLine(formation,i)]+=Math.max(0,until-at);}at=until;};
 for(const e of m.events){if(e.at>end)break;if(e.type==='lineup'||e.type==='formation'){add(e.at);if(e.type==='lineup')lineup=e.lineup;else formation=e.formation;}}
 add(end);return result;
}
export function playingStatistics(s){
 const games=new Map(s.history.map(h=>[h.match.id,h]));
 if(s.match.status==='ended')games.set(s.match.id,{match:s.match,players:games.get(s.match.id)?.players||s.players});
 const rows=new Map();
 const ensure=p=>{if(!rows.has(p.id))rows.set(p.id,{id:p.id,name:p.name,total:0,matches:0,last:null,average:0});return rows.get(p.id);};
 for(const h of games.values())for(const p of h.players)ensure(p);
 for(const p of s.players)ensure(p).name=p.name;
 const all=[...games.values()];
 for(let i=0;i<all.length;i++){
  const h=all[i],times=minutes(h.match),used=new Set([...h.match.initialLineup,...h.match.lineup,...h.match.events.filter(e=>e.type==='lineup').flatMap(e=>e.lineup)]);
  for(const p of h.players){const row=ensure(p),played=times[p.id]||0,attended=p.present===true||used.has(p.id)||played>0;
   row.total+=played;if(attended)row.matches++;if(i===all.length-1&&attended)row.last=played;
  }
 }
 for(const row of rows.values())row.average=row.matches?row.total/row.matches:0;
 return [...rows.values()].sort((a,b)=>a.total-b.total||a.name.localeCompare(b.name,'nl'));
}
export function needsKeeperChange(m){
 if(m.status!=='live'||m.half!==2)return false;
 let old=m.initialLineup[0];for(const e of m.events){if(e.at>=m.halfStartedAt)break;if(e.type==='lineup')old=e.lineup[0];}
 return !m.lineup[0]||m.lineup[0]===old;
}
const stamp=m=>JSON.stringify([m.id,m.half,m.formation,m.lineup,m.events.at(-1)?.id]);
const MINUTE=60000;
function rotationContext(s,now){
 const m=s.match,at=elapsed(m,now),halfMs=m.halfMinutes*MINUTE;
 const plannedDurationMs=m.half===2?m.halfStartedAt+halfMs:halfMs*2,remainingMs=Math.max(0,plannedDurationMs-at);
 const present=s.players.filter(p=>p.present),time=minutes(m,now),byLine=lineMinutes(m,now);
 let firstKeeperId=m.half===1?m.lineup[0]:m.initialLineup[0];
 if(m.half===2)for(const e of m.events){if(e.at>=m.halfStartedAt)break;if(e.type==='lineup')firstKeeperId=e.lineup[0];}
 const candidates=present.filter(p=>p.id!==firstKeeperId);
 // Keep this recommendation stable throughout the first half. A child initially
 // on the bench needs less field time because a full keeper half is reserved.
 candidates.sort((a,b)=>Number(m.initialLineup.includes(a.id))-Number(m.initialLineup.includes(b.id))||a.name.localeCompare(b.name,'nl')||a.id.localeCompare(b.id));
 const nextKeeperId=m.half===2&&!needsKeeperChange(m)?m.lineup[0]:candidates[0]?.id||null;
 const targetMs=present.length?plannedDurationMs*Math.min(6,present.length)/present.length:0;
 const lastExit=id=>m.events.filter(e=>e.type==='lineup'&&e.before.includes(id)&&!e.lineup.includes(id)).at(-1)?.at||0;
 const lastEntry=id=>m.events.filter(e=>e.type==='lineup'&&!e.before.includes(id)&&e.lineup.includes(id)).at(-1)?.at||0;
 const rows=present.map(p=>{
  let reservedKeeperMs=0,availableFieldMs=remainingMs;
  if(m.half===1){
   if(p.id===m.lineup[0])reservedKeeperMs=Math.max(0,halfMs-at);
   if(p.id===nextKeeperId)reservedKeeperMs+=Math.min(halfMs,remainingMs);
  }else if(p.id===nextKeeperId)reservedKeeperMs=remainingMs;
  reservedKeeperMs=Math.min(remainingMs,reservedKeeperMs);availableFieldMs-=reservedKeeperMs;
  const actualMs=time[p.id]||0,remainingFieldMs=Math.max(0,targetMs-actualMs-reservedKeeperMs);
  return {...p,actualMs,targetMs,reservedKeeperMs,remainingFieldMs,availableFieldMs,
   slackMs:availableFieldMs-remainingFieldMs,urgency:availableFieldMs?remainingFieldMs/availableFieldMs:remainingFieldMs?Infinity:0,
   eligibleAtMs:lastExit(p.id)+MINUTE,entryAtMs:lastEntry(p.id)+MINUTE};
 });
 return {at,plannedDurationMs,remainingMs,targetMs,rows,byLine,lastExit,lastEntry,nextKeeperId};
}
// Times are match-clock milliseconds: pausing never consumes the remaining plan.
// Feasibility is a necessary per-player bound, not a promise after manual choices.
export function playingTimePlan(s,{now=Date.now()}={}){
 const m=s.match,c=rotationContext(s,now),bench=c.rows.filter(p=>!m.lineup.includes(p.id)&&p.remainingFieldMs>1);
 const field=c.rows.filter(p=>m.lineup.slice(1).includes(p.id));
 let nextSwapAtMs=null,status=m.status==='ended'||!c.remainingMs?'complete':'unavailable';
 if(m.status==='live'&&c.remainingMs&&bench.length&&field.length){
  // A bench player's slack is the latest possible entry that still allows its
  // target. Leave one minute per additional batch when the bench exceeds two.
  const benchDeadline=Math.min(...bench.map(p=>c.at+p.slackMs))-Math.max(0,Math.ceil(bench.length/2)-1)*MINUTE;
  const deadline=Math.min(benchDeadline,...field.map(p=>c.at+p.remainingFieldMs));
  const benchReady=Math.min(...bench.map(p=>p.eligibleAtMs)),fieldReady=Math.min(...field.map(p=>p.entryAtMs));
  const lastBatch=m.events.filter(e=>e.type==='lineup'&&e.before[0]===e.lineup[0]&&e.before.some(id=>id&&!e.lineup.includes(id))).at(-1)?.at;
  nextSwapAtMs=Math.max(c.at,deadline,benchReady,fieldReady,lastBatch===undefined?0:lastBatch+MINUTE);
  if(nextSwapAtMs>=c.plannedDurationMs)nextSwapAtMs=null;
  else status=nextSwapAtMs<=c.at+1?'due':'scheduled';
 }
 return {plannedDurationMs:c.plannedDurationMs,elapsedMs:c.at,remainingMs:c.remainingMs,targetMinutes:c.targetMs/MINUTE,
  players:c.rows.map(({id,name,actualMs,targetMs,reservedKeeperMs,remainingFieldMs,availableFieldMs})=>({id,name,actualMs,targetMs,reservedKeeperMs,remainingFieldMs,availableFieldMs})),
  keeper:{currentKeeperId:m.lineup[0],nextKeeperId:c.nextKeeperId,changeAtMs:m.half===1?m.halfMinutes*MINUTE:m.halfStartedAt,changeDue:needsKeeperChange(m)},
  nextSwapAtMs,nextSwapInMs:nextSwapAtMs===null?null:Math.max(0,nextSwapAtMs-c.at),status,
  equalityFeasible:c.rows.every(p=>p.actualMs+p.reservedKeeperMs<=c.targetMs+1&&p.remainingFieldMs<=p.availableFieldMs+1)};
}
export function proposeSubstitutions(s,{count=2,keeper=false,now=Date.now()}={}){
 const m=s.match,p={matchId:m.id,stamp:stamp(m),keeper,changes:[]};if(m.status!=='live'||keeper&&m.half!==2)return p;
 const context=rotationContext(s,now),{byLine,lastExit}=context,time=minutes(m,now),players=s.players.filter(x=>x.present);
 const least=(a,b)=>(time[a.id]||0)-(time[b.id]||0)||lastExit(a.id)-lastExit(b.id)||a.name.localeCompare(b.name,'nl');
 if(keeper){
  const candidates=players.filter(x=>x.id!==m.lineup[0]).sort((a,b)=>Number(b.id===context.nextKeeperId)-Number(a.id===context.nextKeeperId)||least(a,b));
  if(candidates[0])p.changes.push({index:0,outId:m.lineup[0],inId:candidates[0].id});return p;
 }
 const end=context.at,rows=new Map(context.rows.map(p=>[p.id,p]));
 const waiting=context.rows.filter(x=>!m.lineup.includes(x.id)&&end>=x.eligibleAtMs).sort((a,b)=>a.slackMs-b.slackMs||least(a,b)),used=new Set();
 for(const incoming of waiting.slice(0,Math.max(1,Math.min(2,count)))){
  let slots=m.lineup.map((id,index)=>({id,index,time:id?(time[id]||0):Infinity,urgency:rows.get(id)?.urgency??-Infinity})).filter(x=>x.index>0&&!used.has(x.index));
  // Rotate the whole bench; avoid immediately reversing a substitution.
  slots=slots.filter(x=>!x.id||end>=context.lastEntry(x.id)+MINUTE);if(!slots.length)continue;
  const min=Math.min(...slots.map(x=>x.urgency));slots=slots.filter(x=>Math.abs(x.urgency-min)<1e-9||x.urgency===min);
  const fit=x=>{const line=positionLine(m.formation,x.index);return (byLine[incoming.id]?.[line]||0)/300000-(incoming.preferredLine===line?1:0);};
  // Preference is worth five minutes of familiarity; variety can outweigh it.
  slots.sort((a,b)=>fit(a)-fit(b)||b.time-a.time||a.index-b.index);
  const out=slots[0];used.add(out.index);p.changes.push({index:out.index,outId:out.id,inId:incoming.id});
 }
 return p;
}
export function applySubstitutionProposal(s,p,now=Date.now()){
 const m=s.match;if(m.status!=='live'||!p||p.stamp!==stamp(m)||p.matchId!==m.id)throw Error('De wedstrijd of opstelling is gewijzigd. Maak een nieuw voorstel.');
 if(!Array.isArray(p.changes)||!p.changes.length||p.changes.length>(p.keeper?1:2)||p.keeper&&m.half!==2)throw Error('Geen geldige wissels gekozen.');
 const next=[...m.lineup],incoming=new Set(),positions=new Set();
 for(const c of p.changes){
  if(!Number.isInteger(c.index)||c.index<0||c.index>5||(p.keeper?c.index!==0:c.index===0)||positions.has(c.index)||incoming.has(c.inId)||!s.players.some(x=>x.id===c.inId&&x.present)||c.outId!==m.lineup[c.index]||c.inId===c.outId)throw Error('Kies verschillende aanwezige spelers en posities.');
  const from=m.lineup.indexOf(c.inId);if(!p.keeper&&from!==-1)throw Error('Kies een speler van de bank.');
  if(p.keeper&&from!==-1)next[from]=c.outId;
  next[c.index]=c.inId;positions.add(c.index);incoming.add(c.inId);
 }
 if(new Set(next.filter(Boolean)).size!==next.filter(Boolean).length)throw Error('Een speler staat dubbel opgesteld.');
 changeGame(s,p.keeper?'keeperwissel':'wisselvoorstel',()=>setLineup(m,next,now));return next;
}
