export const VERSION = 1;
export const uid = () => globalThis.crypto.randomUUID();
export function freshMatch() { return { id:uid(), opponent:'', date:'', home:true, halfMinutes:25, half:1, elapsed:0, startedAt:null, status:'ready', lineup:Array(6).fill(null), initialLineup:Array(6).fill(null), events:[] }; }
export function freshState() { return {version:VERSION, players:[], match:freshMatch(), history:[]}; }
export function elapsed(m, now=Date.now()) { return m.elapsed + (m.startedAt === null ? 0 : Math.max(0,now-m.startedAt)); }
export function score(m) { return m.events.reduce((s,e)=>{if(e.type==='goal') s[e.side]++; return s;},{us:0,them:0}); }
export function minutes(m, now=Date.now()) {
  const total=elapsed(m,now), result={}; let previous=0, lineup=m.initialLineup;
  const add = until => { for(const id of lineup) if(id) result[id]=(result[id]||0)+Math.max(0,until-previous); previous=until; };
  for(const e of m.events) if(e.type==='lineup') {add(Math.min(total,e.at));lineup=e.lineup;}
  add(total);return result;
}
export function start(m, now=Date.now()) {
  if(m.status==='ended'||m.startedAt!==null) return;
  if(m.status==='ready') {m.initialLineup=[...m.lineup];m.status='live';}
  m.startedAt=now;
}
export function pause(m, now=Date.now()) {m.elapsed=elapsed(m,now);m.startedAt=null;}
export function setLineup(m, lineup, now=Date.now()) {
  if(m.status==='ended') throw Error('Deze wedstrijd is afgelopen.');
  if(lineup.length!==6 || new Set(lineup.filter(Boolean)).size!==lineup.filter(Boolean).length) throw Error('Een speler kan maar op één positie staan.');
  if(m.status==='ready') m.initialLineup=[...lineup];
  else m.events.push({id:uid(),type:'lineup',at:elapsed(m,now),before:[...m.lineup],lineup:[...lineup]});
  m.lineup=[...lineup];
}
export function undo(m) {
  if(m.status==='ended') return false;
  const e=m.events.pop();if(!e) return false;
  if(e.type==='lineup') m.lineup=[...e.before];
  return true;
}
export function validateState(s) {
  const fail=()=>{throw Error('Dit is geen geldige Zijlijn-back-up (versie 1).');};
  const str=v=>typeof v==='string' && v.length<=200;
  const num=v=>Number.isFinite(v)&&v>=0;
  if(!s||s.version!==1||!Array.isArray(s.players)||s.players.length>100||!Array.isArray(s.history)||s.history.length>1000) fail();
  const ids=new Set();
  for(const p of s.players) {if(!p||!str(p.id)||!str(p.name)||!p.name.trim()||typeof p.present!=='boolean'||ids.has(p.id))fail();ids.add(p.id);}
  const line=(l,known)=>Array.isArray(l)&&l.length===6&&l.every(v=>v===null||(str(v)&&(!known||ids.has(v))))&&new Set(l.filter(Boolean)).size===l.filter(Boolean).length;
  function match(m,known) {
    if(!m||!str(m.id)||!str(m.opponent)||!str(m.date)||typeof m.home!=='boolean'||!Number.isInteger(m.halfMinutes)||m.halfMinutes<1||m.halfMinutes>60||![1,2].includes(m.half)||!num(m.elapsed)||!(m.startedAt===null||num(m.startedAt))||!['ready','live','ended'].includes(m.status)||!line(m.lineup,known)||!line(m.initialLineup,known)||!Array.isArray(m.events)||m.events.length>10000)fail();
    let last=0, current=[...m.initialLineup];
    for(const e of m.events) {if(!e||!str(e.id)||!num(e.at)||e.at<last||e.at>elapsed(m)+1000)fail();last=e.at;
      if(e.type==='goal'){if(!['us','them'].includes(e.side))fail();}
      else if(e.type==='lineup'){if(!line(e.before,known)||!line(e.lineup,known)||JSON.stringify(e.before)!==JSON.stringify(current))fail();current=e.lineup;}
      else fail();
    }
    if(JSON.stringify(current)!==JSON.stringify(m.lineup))fail();
    if(m.status!=='live'&&m.startedAt!==null)fail();
  }
  match(s.match,true);
  for(const h of s.history){match(h.match,false);if(h.match.status!=='ended'||!Array.isArray(h.players)||h.players.some(p=>!p||!str(p.id)||!str(p.name)))fail();}
  return s;
}
