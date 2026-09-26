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
export function proposeSubstitutions(s,{count=2,keeper=false,now=Date.now()}={}){
 const m=s.match,p={matchId:m.id,stamp:stamp(m),keeper,changes:[]};if(m.status!=='live'||keeper&&m.half!==2)return p;
 const time=minutes(m,now),byLine=lineMinutes(m,now),players=s.players.filter(x=>x.present);
 const lastExit=id=>m.events.filter(e=>e.type==='lineup'&&e.before.includes(id)&&!e.lineup.includes(id)).at(-1)?.at||0;
 const least=(a,b)=>(time[a.id]||0)-(time[b.id]||0)||lastExit(a.id)-lastExit(b.id)||a.name.localeCompare(b.name,'nl');
 if(keeper){
  const candidates=players.filter(x=>x.id!==m.lineup[0]).sort((a,b)=>(time[a.id]||0)-(time[b.id]||0)||(byLine[a.id]?.keeper||0)-(byLine[b.id]?.keeper||0)||least(a,b));
  if(candidates[0])p.changes.push({index:0,outId:m.lineup[0],inId:candidates[0].id});return p;
 }
 const end=elapsed(m,now);
 const lastEntry=id=>m.events.filter(e=>e.type==='lineup'&&!e.before.includes(id)&&e.lineup.includes(id)).at(-1)?.at||0;
 const waiting=players.filter(x=>!m.lineup.includes(x.id)&&end-lastExit(x.id)>=60000).sort(least),used=new Set();
 for(const incoming of waiting.slice(0,Math.max(1,Math.min(2,count)))){
  let slots=m.lineup.map((id,index)=>({id,index,time:id?(time[id]||0):Infinity})).filter(x=>x.index>0&&!used.has(x.index));
  // Rotate the whole bench; avoid immediately reversing a substitution.
  slots=slots.filter(x=>!x.id||end-lastEntry(x.id)>=60000);if(!slots.length)continue;
  const max=Math.max(...slots.map(x=>x.time));slots=slots.filter(x=>max===Infinity?!x.id:x.time>=max-60000);
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
