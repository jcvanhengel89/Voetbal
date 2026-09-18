import {validateTraining} from './training.js';
export const VERSION = 1;
export const FORMATIONS = {
  '1-2-2-1':['Keeper','Linksachter','Rechtsachter','Linksmidden','Rechtsmidden','Spits'],
  '1-2-1-2':['Keeper','Linksachter','Rechtsachter','Middenvelder','Linksspits','Rechtsspits']
};
export const positionNames = m => FORMATIONS[m.formation || '1-2-2-1'];
export function normalizeTeamUrl(value) {
  if(typeof value!=='string'||value.length>2048)throw Error('Gebruik de link van de teampagina op voetbal.nl.');
  if(!value.trim())return '';
  let url;try{url=new URL(value.trim());}catch{throw Error('Gebruik een volledige https-link naar voetbal.nl.');}
  if(url.protocol!=='https:'||!(url.hostname==='voetbal.nl'||url.hostname.endsWith('.voetbal.nl'))||url.username||url.password||url.port||url.pathname==='/'||/^\/(inloggen|gebruiker)(\/|$)/.test(url.pathname))throw Error('Gebruik de link van de teampagina op voetbal.nl, zonder inloggegevens.');
  return url.href;
}
export const uid = () => globalThis.crypto.randomUUID();
export function freshMatch() { return { id:uid(), opponent:'', date:'', home:true, halfMinutes:25, half:1, elapsed:0, startedAt:null, status:'ready', halfStartedAt:0, timeouts:[], swapSnoozeAt:0, summary:'', summarySaved:false, notes:'', formation:'1-2-2-1', initialFormation:'1-2-2-1', lineup:Array(6).fill(null), initialLineup:Array(6).fill(null), events:[] }; }
export function freshState() { return {version:VERSION, teamUrl:'', players:[], match:freshMatch(), history:[], undoHistory:[], trainings:[], selectedTrainingId:'', swapInterval:0, backupAt:0, backupMatches:0}; }
export function elapsed(m, now=Date.now()) {
  const current=m.elapsed+(m.startedAt===null?0:Math.max(0,now-m.startedAt));
  if(m.status!=='live'||m.startedAt===null)return current;
  return Math.max(current,m.halfStartedAt||0,m.events.at(-1)?.at||0);
}
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
export function setFormation(m, formation, now=Date.now()) {
  if(m.status==='ended') throw Error('Deze wedstrijd is afgelopen.');
  if(!Object.hasOwn(FORMATIONS,formation)) throw Error('Kies een beschikbare formatie.');
  if(m.formation===formation) return;
  if(m.status==='ready') m.initialFormation=formation;
  else m.events.push({id:uid(),type:'formation',at:elapsed(m,now),beforeFormation:m.formation,formation});
  m.formation=formation;
}
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
  if(e.type==='formation') m.formation=e.beforeFormation;
  return true;
}
export function validateState(s) {
  const fail=()=>{throw Error('Dit is geen geldige Zijlijn-back-up (versie 1).');};
  const str=v=>typeof v==='string' && v.length<=200;
  const num=v=>Number.isFinite(v)&&v>=0;
  if(!s||s.version!==1||!Array.isArray(s.players)||s.players.length>100||!Array.isArray(s.history)||s.history.length>1000) fail();
  s.teamUrl=normalizeTeamUrl(s.teamUrl===undefined?'':s.teamUrl);
  const ids=new Set();
  for(const p of s.players) {if(!p||!str(p.id)||!str(p.name)||!p.name.trim()||typeof p.present!=='boolean'||ids.has(p.id))fail();ids.add(p.id);}
  const line=(l,known)=>Array.isArray(l)&&l.length===6&&l.every(v=>v===null||(str(v)&&(!known||ids.has(v))))&&new Set(l.filter(Boolean)).size===l.filter(Boolean).length;
  function match(m,known) {
    if(!m||!str(m.id)||!str(m.opponent)||!str(m.date)||typeof m.home!=='boolean'||!Number.isInteger(m.halfMinutes)||m.halfMinutes<1||m.halfMinutes>60||![1,2].includes(m.half)||!num(m.elapsed)||!(m.startedAt===null||num(m.startedAt))||!['ready','live','ended'].includes(m.status)||!line(m.lineup,known)||!line(m.initialLineup,known)||!Array.isArray(m.events)||m.events.length>10000)fail();
    m.halfStartedAt??=m.half===2?Math.min(m.elapsed,m.halfMinutes*60000):0;
    m.timeouts??=[];m.swapSnoozeAt??=0;m.summary??='';m.summarySaved??=!!m.summary;m.notes??='';
    if(!num(m.halfStartedAt)||m.halfStartedAt>elapsed(m)+1000||!num(m.swapSnoozeAt)||!Array.isArray(m.timeouts)||m.timeouts.length>2||m.timeouts.some(v=>![1,2].includes(v))||typeof m.summarySaved!=='boolean'||typeof m.summary!=='string'||m.summary.length>10000||typeof m.notes!=='string'||m.notes.length>10000)fail();
    if(m.formation===undefined)m.formation='1-2-2-1';
    if(m.initialFormation===undefined)m.initialFormation='1-2-2-1';
    if(!Object.hasOwn(FORMATIONS,m.formation)||!Object.hasOwn(FORMATIONS,m.initialFormation))fail();
    let last=0, current=[...m.initialLineup], formation=m.initialFormation;
    for(const e of m.events) {if(!e||!str(e.id)||!num(e.at)||e.at<last||e.at>elapsed(m)+1000)fail();last=e.at;
      if(e.type==='goal'){if(!['us','them'].includes(e.side))fail();}
      else if(e.type==='lineup'){if(!line(e.before,known)||!line(e.lineup,known)||JSON.stringify(e.before)!==JSON.stringify(current))fail();current=e.lineup;}
      else if(e.type==='formation'){if(e.beforeFormation!==formation||!Object.hasOwn(FORMATIONS,e.formation))fail();formation=e.formation;}
      else fail();
    }
    if(JSON.stringify(current)!==JSON.stringify(m.lineup))fail();
    if(formation!==m.formation)fail();
    if(m.status!=='live'&&m.startedAt!==null)fail();
  }
  match(s.match,true);
  s.undoHistory??=[];s.trainings??=[];s.selectedTrainingId??='';s.swapInterval??=0;s.backupAt??=0;s.backupMatches??=0;
  if(!Array.isArray(s.undoHistory)||s.undoHistory.length>20||!Array.isArray(s.trainings)||s.trainings.length>500||!str(s.selectedTrainingId)||!Number.isInteger(s.swapInterval)||s.swapInterval<0||s.swapInterval>60||!num(s.backupAt)||!Number.isInteger(s.backupMatches)||s.backupMatches<0)fail();
  for(const u of s.undoHistory){if(!u||!str(u.label)||!u.before)fail();match({...s.match,...u.before},true);}
  const trainingIds=new Set();for(const t of s.trainings){validateTraining(t);if(trainingIds.has(t.id))fail();trainingIds.add(t.id);}
  if(s.trainings.filter(t=>t.run.status==='live').length>1)fail();
  if(s.selectedTrainingId&&!trainingIds.has(s.selectedTrainingId))s.selectedTrainingId='';
  for(const h of s.history){match(h.match,false);if(h.match.status!=='ended'||!Array.isArray(h.players)||h.players.some(p=>!p||!str(p.id)||!str(p.name)))fail();}
  return s;
}

// Remove only the latest goal for this side; later substitutions stay intact.
export function removeGoal(m, side) {
  if(!['us','them'].includes(side)||m.status==='ready')return false;
  const index=m.events.findLastIndex(e=>e.type==='goal'&&e.side===side);
  if(index<0)return false;
  m.events.splice(index,1);return true;
}
export function matchSummary(m) {
  const s=score(m), opponent=m.opponent||'de tegenstander';
  const fixture=`Nieuwerkerk JO10-8 ${m.home?'thuis tegen':'uit bij'} ${opponent}`;
  if(m.status==='ready')return `⚽ ${fixture}\n\nWe zijn klaar voor de wedstrijd! Kom je ons aanmoedigen? 💚`;
  const result=m.status==='ended'
    ? s.us>s.them?'Gewonnen! 🎉':s.us===s.them?'Een gelijkspel! 🤝':'Op naar de volgende wedstrijd! 💪'
    :'Een update vanaf de zijlijn! 📣';
  return `⚽ ${fixture}\n\n${m.status==='ended'?'Eindstand':'Tussenstand'}: ${s.us}–${s.them} (Nieuwerkerk eerst).\n${result}\n\n${m.status==='ended'?'Bedankt voor het aanmoedigen, ouders en supporters!':'Moedig je mee aan?'} 💚`;
}

const GAME_KEYS=['lineup','initialLineup','formation','initialFormation','events','half','halfStartedAt','timeouts','swapSnoozeAt'];
export function changeGame(s,label,change){
 const before=Object.fromEntries(GAME_KEYS.map(k=>[k,structuredClone(s.match[k])]));
 change(s.match);
 if(GAME_KEYS.some(k=>JSON.stringify(before[k])!==JSON.stringify(s.match[k]))){s.undoHistory.push({label,before});s.undoHistory=s.undoHistory.slice(-20);}
}
export function undoGame(s){
 const u=s.undoHistory.pop();if(!u)return false;
 for(const k of GAME_KEYS)if(Object.hasOwn(u.before,k))s.match[k]=structuredClone(u.before[k]);
 return u.label;
}
export function reminders(s,now=Date.now()){
 const m=s.match,t=elapsed(m,now),half=t-m.halfStartedAt;
 const lastSwap=m.events.filter(e=>e.type==='lineup'&&(
  e.before.some(id=>id&&!e.lineup.includes(id))||e.lineup.some(id=>id&&!e.before.includes(id))
 )).at(-1)?.at||0;
 return {timeout:m.status==='live'&&!m.timeouts.includes(m.half)&&half>=m.halfMinutes*30000,
 swap:m.status==='live'&&s.swapInterval>0&&s.players.some(p=>p.present&&!m.lineup.includes(p.id))&&t-Math.max(lastSwap,m.swapSnoozeAt)>=s.swapInterval*60000};
}
export function backupDue(s,now=Date.now()){
 return s.history.length-s.backupMatches>=3||(!s.backupAt&&s.history.length>0)||(s.backupAt>0&&now-s.backupAt>=7*86400000);
}
