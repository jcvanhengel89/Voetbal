import {BLOCKS,nextTrainingDate,defaultStart,createTraining,schedule,trainingElapsed,startTraining,pauseTraining,nextBlock,trainingText} from './training.js';
import {freshState,freshMatch,uid,elapsed,score,minutes,start,pause,setLineup,setFormation,positionNames,FORMATIONS,normalizeTeamUrl,undo,validateState,removeGoal,matchSummary,changeGame,undoGame,reminders,backupDue,topScorers} from './model.js';
const APP_VERSION='1.5.0';
const KEY='zijlijn-v1', $=s=>document.querySelector(s), app=$('#app'), dialog=$('#dialog');
let state=freshState(), storageError='', tab=location.hash.slice(1)||'wedstrijd', toastTimer, wakeLock=null, wakePending=false, presentationOpen=false, presentationFullscreen=false;
let swRegistration, waitingWorker, updateCheck='Nog niet gecontroleerd', latestVersion='', lastUpdateCheck=0, checkingUpdate=false;
try {const raw=localStorage.getItem(KEY);if(raw)state=validateState(JSON.parse(raw));}catch(e){storageError='Je opgeslagen gegevens konden niet worden geladen. Download eerst een herstelbestand via Mijn team. Nieuwe wijzigingen worden nog niet opgeslagen.';}
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const name=id=>state.players.find(p=>p.id===id)?.name||'Lege plek';
const initials=n=>n.trim().split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase();
const clock=ms=>`${Math.floor(ms/60000).toString().padStart(2,'0')}:${Math.floor(ms/1000%60).toString().padStart(2,'0')}`;
const present=()=>state.players.filter(p=>p.present);
const bench=()=>{const t=minutes(state.match);return present().filter(p=>!state.match.lineup.includes(p.id)).sort((a,b)=>(t[a.id]||0)-(t[b.id]||0)||a.name.localeCompare(b.name,'nl'));};
const dateLabel=m=>m.date?new Date(m.date).toLocaleString('nl-NL',{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}):'Nog geen aftraptijd';
function toast(s){$('#toast').textContent=storageError||s;$('#toast').style.display='block';clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').style.display='none',4000);}
function save(){if(storageError)return;try{localStorage.setItem(KEY,JSON.stringify(state));}catch{storageError='Opslaan lukt niet. Je gegevens staan nu alleen in dit scherm. Maak een back-up via Mijn team.';toast(storageError);}}
function update(){save();render();}
function modal(title,html){$('#dialog-content').innerHTML=`<div class="dialog-head"><h2 id="dialog-title">${title}</h2><button class="close" data-action="close" aria-label="Sluiten">×</button></div>${html}`;if(!dialog.open)dialog.showModal();}
function confirmAction(title,text,action,label='Bevestigen'){modal(title,`<p>${text}</p><div class="row"><button data-action="close">Annuleren</button><button class="primary" data-action="${action}">${label}</button></div>`);}
function render(){
 if(!['wedstrijd','opstelling','training','team'].includes(tab))tab='wedstrijd';
 document.querySelectorAll('[data-tab]').forEach(b=>{b.classList.toggle('active',b.dataset.tab===tab);b.setAttribute('aria-current',b.dataset.tab===tab?'page':'false');});
 app.innerHTML=(storageError?`<div class="warning" role="alert">${esc(storageError)}</div>`:'')+(tab==='wedstrijd'?matchView():tab==='opstelling'?lineupView():tab==='training'?trainingView():teamView());tick();
}
function pitch(readOnly=false){
 const m=state.match, labels=positionNames(m), tag=readOnly?'div':'button';
 return `<div class="pitch formation-${m.formation}" aria-label="Opstelling ${m.formation}">${m.lineup.map((id,i)=>`<${tag} class="position pos-${i} ${id?'':'empty'}" ${readOnly?'':`data-action="position" data-index="${i}" ${m.status==='ended'?'disabled':''}`} aria-label="${labels[i]}: ${esc(name(id))}"><span class="shirt">${id?esc(initials(name(id))):'+'}</span><span class="position-name">${labels[i]}</span><span class="player-name">${id?esc(name(id)):readOnly?'Vrije plek':'Kies speler'}</span></${tag}>`).join('')}</div>`;
}
function formationSelect(){return `<label class="formation-select">Formatie<select id="formation" ${state.match.status==='ended'?'disabled':''}>${Object.keys(FORMATIONS).map(f=>`<option value="${f}" ${state.match.formation===f?'selected':''}>${f}</option>`).join('')}</select></label>`;}

function benchButtons(){const times=minutes(state.match);return bench().map(p=>`<button data-action="bench" data-id="${esc(p.id)}" ${state.match.status==='ended'?'disabled':''}><strong>${esc(p.name)}</strong><small>${clock(times[p.id]||0)} gespeeld</small></button>`).join('');}
function lineupCard(showBench=true){return `<section class="card"><div class="card-head"><h2>Op het veld</h2><span class="pill">${state.match.lineup.filter(Boolean).length} / 6</span></div>${formationSelect()}${pitch()}<button class="wide presentation-button" data-action="show-lineup">${expandIcon()} Opstelling tonen</button>${showBench?`<div class="subtle-row"><h3>Wisselbank</h3><span class="small muted">${bench().length} spelers</span></div><div class="bench">${benchButtons()}</div>`:''}<p class="hint">${state.players.length?'Tik op een positie of bankspeler om te wisselen.':'Voeg je spelers toe bij Mijn team en tik op een positie.'}</p></section>`;}
function matchView(){
 const m=state.match,s=score(m),live=m.status==='live',ended=m.status==='ended',last=state.undoHistory.at(-1);
 const team=(side,label)=>`<div><span class="team-name">${esc(label)}</span><strong class="score-value">${s[side]}</strong><div class="score-controls"><button class="goal-minus" data-action="minus-${side}" aria-label="Doelpunt verwijderen voor ${esc(label)}" ${s[side]===0?'disabled':''}>−</button><button class="goal ${side==='us'?'us':''}" data-action="goal-${side}" aria-label="Doelpunt voor ${esc(label)}" ${!live&&!ended?'disabled':''}>+ Goal</button></div></div>`;
 return `<div class="heading"><div><p class="eyebrow">Aan de zijlijn</p><h1>Wedstrijddag</h1></div><button data-action="edit-match" class="ghost" ${ended?'disabled':''}>Instellen</button></div>${backupNotice()}<div class="grid"><div><section class="card scoreboard"><div class="card-head"><span class="small muted">${esc(dateLabel(m))} · ${m.home?'Thuis':'Uit'}</span><span class="pill">${ended?'Afgelopen':live?'Bezig':'Voor de aftrap'}</span></div><div class="score-line">${team('us','Nieuwerkerk JO10-8')}<span class="separator">:</span>${team('them',m.opponent||'Tegenstander')}</div><div class="timer"><div class="clock" id="clock">00:00</div><p class="timer-label" id="timer-label"></p><div class="row"><button class="primary" data-action="clock" ${ended?'disabled':''}>${m.startedAt!==null?'Ⅱ Pauze':m.status==='ready'?'▶ Aftrap':'▶ Hervatten'}</button>${m.half===1&&!ended?`<button class="ghost" data-action="second-half" ${!live?'disabled':''}>2e helft</button>`:`<button class="ghost" data-action="finish" ${ended?'disabled':''}>Afronden</button>`}</div></div></section><div id="match-reminders" aria-live="polite"></div><div class="match-tools"><button class="text-button" data-action="undo" ${!last?'disabled':''}>${last?'Herstel: '+esc(last.label):'Niets te herstellen'}</button><button class="text-button" data-action="${ended?'new-match':'finish'}" ${m.status==='ready'?'disabled':''}>${ended?'Nieuwe wedstrijd':'Wedstrijd afronden'}</button></div><section class="card quick-bench"><div class="card-head"><h2>Wisselbank</h2><span class="small muted">Minste speeltijd eerst</span></div><div class="bench">${benchButtons()||'<span class="muted small">Geen bankspelers aanwezig.</span>'}</div></section><button class="wide summary-button" data-action="summary">💬 Samenvatting voor ouders</button><details class="card"><summary>Notities voor het verslag</summary><label class="stack">Leuke momenten & aandachtspunten<textarea data-match-notes maxlength="10000" rows="3" placeholder="Bijvoorbeeld een mooie samenwerking of iets om te oefenen…">${esc(m.notes)}</textarea></label><p class="hint">Wordt automatisch bewaard. Je kunt deze notities meenemen in de samenvatting.</p></details><details class="card"><summary>Wedstrijdverloop · ${m.events.length} acties</summary>${timeline()}</details></div><div>${lineupCard(false)}<details class="card"><summary>Speeltijd per speler</summary>${playingTimes()}</details></div></div><p class="offline-note" id="connection"></p>`;
}
function eventDescription(e){if(e.type==='formation')return `<strong>Formatie gewijzigd</strong><small>${e.beforeFormation} → ${e.formation}</small>`;if(e.type==='goal')return `<strong>Doelpunt ${e.side==='us'?'Nieuwerkerk':esc(state.match.opponent||'tegenstander')}</strong>${e.side==='us'?scorerButton(state.match,e):''}`;const out=e.before.filter(id=>id&&!e.lineup.includes(id)),incoming=e.lineup.filter(id=>id&&!e.before.includes(id));return `<strong>${out.length||incoming.length?'Wissel':'Posities gewisseld'}</strong><small>${incoming.length?'In: '+incoming.map(id=>esc(name(id))).join(', '):''}${incoming.length&&out.length?' · ':''}${out.length?'Uit: '+out.map(id=>esc(name(id))).join(', '):''}</small>`;}
function timeline(){return state.match.events.length?`<ol class="timeline">${[...state.match.events].reverse().map(e=>`<li><time>${clock(e.at)}</time><div>${eventDescription(e)}</div></li>`).join('')}</ol>`:'<div class="empty-state">Klaar voor de aftrap.<br>Doelpunten en wissels verschijnen hier.</div>';}
function playingTimes(){const activeIds=new Set([...present().map(p=>p.id),...state.match.initialLineup,...state.match.events.filter(e=>e.type==='lineup').flatMap(e=>e.lineup)]);const players=state.players.filter(p=>activeIds.has(p.id));return players.length?players.map(p=>`<div class="player-row"><span class="avatar">${esc(initials(p.name))}</span><div class="player-info"><strong>${esc(p.name)}</strong><small>${state.match.lineup.includes(p.id)?positionNames(state.match)[state.match.lineup.indexOf(p.id)]:p.present?'Op de bank':'Afwezig'}</small><div class="bar"><span data-bar="${esc(p.id)}"></span></div></div><span class="player-time" data-time="${esc(p.id)}">00:00</span></div>`).join(''):'<div class="empty-state">Voeg eerst je spelers toe.</div>';}
function lineupView(){return `<div class="single"><div class="heading"><div><p class="eyebrow">Iedereen zijn plek</p><h1>De opstelling</h1></div><span class="pill">${state.match.formation}</span></div>${lineupCard()}<section class="card"><h2>Speeltijd per speler</h2><p class="hint">De klok telt alleen mee wanneer de wedstrijd loopt. Herstel je een wissel, dan wordt de speeltijd opnieuw berekend.</p>${playingTimes()}</section></div>`;}
function teamView(){const m=state.match,locked=m.status!=='ready';return `<div class="single"><div class="heading"><div><p class="eyebrow">vv Nieuwerkerk JO10-8</p><h1>Mijn team</h1></div><span class="pill">${present().length} aanwezig</span></div><section class="card"><div class="card-head"><h2>Spelers</h2><span class="small muted">${state.players.length} totaal</span></div><form id="add-player" class="form-inline"><input name="name" aria-label="Naam nieuwe speler" placeholder="Voornaam speler" maxlength="40" required><button type="submit" class="primary">Toevoegen</button></form>${!state.players.length?'<div class="empty-state">Begin met de voornamen van je team.<br>Je gegevens blijven op dit toestel.</div>':state.players.map(p=>`<div class="player-row"><span class="avatar">${esc(initials(p.name))}</span><div class="player-info"><strong>${esc(p.name)}</strong><label class="check small muted"><input type="checkbox" data-present="${esc(p.id)}" ${p.present?'checked':''} ${locked?'disabled':''}> Aanwezig</label></div><button class="text-button" data-action="edit-player" data-id="${esc(p.id)}">Bewerk</button></div>`).join('')}${locked?'<p class="hint">Aanwezigheid en verwijderen zijn weer beschikbaar bij een nieuwe wedstrijd. Spelers toevoegen kan altijd.</p>':''}</section>${topScorersCard()}<section class="card"><h2>Volgende tegenstander</h2><p class="muted">Neem het programma over uit voetbal.nl. Automatisch ophalen is nog niet gekoppeld.</p><div class="row"><button data-action="edit-match" ${m.status==='ended'?'disabled':''}>Wedstrijd invoeren</button><a href="${esc(state.teamUrl||'https://www.voetbal.nl/')}" target="_blank" rel="noopener noreferrer">${state.teamUrl?'Open JO10-8 in voetbal.nl ↗':'Open voetbal.nl ↗'}</a></div><button class="text-button" data-action="team-link">${state.teamUrl?'Teamlink aanpassen':'Teamlink instellen'}</button></section><section class="card"><h2>Wisselherinnering</h2><label class="stack">Herinner mij tijdens de wedstrijd<select id="swap-interval">${[0,5,7,10,12,15].map(n=>`<option value="${n}" ${state.swapInterval===n?'selected':''}>${n?'Na '+n+' speelminuten':'Uit'}</option>`).join('')}</select></label><p class="hint">Verschijnt in de app als er bankspelers zijn. Een wissel start de herinnering opnieuw.</p></section><section class="card"><h2>Gegevens & back-up</h2><p class="small muted">Laatste back-upexport: ${state.backupAt?esc(new Date(state.backupAt).toLocaleString('nl-NL')):'nog niet gemaakt'}</p><p class="muted">Opgeslagen in deze browser. Maak af en toe een back-up; bij wissen van browsergegevens raak je anders je team en wedstrijden kwijt.</p><div class="row"><button data-action="export">Back-up opslaan</button><button data-action="import">Back-up terugzetten</button></div>${storageError?'<button class="wide" data-action="recovery">Oorspronkelijke opslag downloaden</button>':''}<input type="file" id="import-file" accept="application/json,.json" hidden><details><summary>Gebruiken als app</summary><p class="small muted">Open de app via de gehoste website. Op iPhone: Safari → Deel → Zet op beginscherm. Op Android: browsermenu → App installeren of Toevoegen aan startscherm. Open de app eerst met internet en wacht tot ‘Offline beschikbaar’ onder de wedstrijd staat.</p><p class="small muted">Gebruik tijdens de wedstrijd één tabblad. Als je de app sluit terwijl de klok loopt, telt de tijd door. Druk bij rust of een time-out op Pauze.</p></details></section><section class="card"><div class="card-head"><h2>Vorige wedstrijden</h2><span class="small muted">${state.history.length}</span></div>${state.history.length?[...state.history].reverse().map(h=>{const s=score(h.match);return `<button class="history-row wide" data-action="history" data-id="${esc(h.match.id)}"><span>${esc(h.match.opponent||'Tegenstander')}<div class="small muted">${esc(dateLabel(h.match))}</div></span><strong>${s.us} – ${s.them} ›</strong></button>`;}).join(''):'<p class="muted small">Een afgeronde wedstrijd blijft hier bewaard.</p>'}</section></div>`;}
let scorerSelection=null;
function matchById(id){return id===state.match.id?state.match:state.history.find(h=>h.match.id===id)?.match;}
function matchPlayers(m){return m.id===state.match.id?state.players:state.history.find(h=>h.match.id===m.id)?.players||[];}
function scorerButton(m,e,history=false){
 const scorer=matchPlayers(m).find(p=>p.id===e.scorerId);
 return `<button class="text-button scorer-edit" data-action="edit-scorer" data-match="${esc(m.id)}" data-event="${esc(e.id)}" data-history="${history}">${scorer?esc(scorer.name)+' · Wijzigen':'Maker kiezen'}</button>`;
}
function historyScorers(m){
 const goals=m.events.filter(e=>e.type==='goal'&&e.side==='us');
 return goals.length?`<details open><summary>Doelpuntenmakers</summary>${goals.map((e,i)=>`<div class="history-row"><span>Goal ${i+1} · ${clock(e.at)}</span>${scorerButton(m,e,true)}</div>`).join('')}</details>`:'';
}
function topScorersCard(){
 const totals=topScorers(state);let rank=0;
 return `<section class="card"><h2>Topscorers</h2><p class="hint">Alle bewaarde wedstrijden, inclusief de huidige wedstrijd. Alleen doelpunten met een maker tellen bij een speler mee.</p>${totals.players.length?`<ol class="scorer-ranking">${totals.players.map((p,i)=>{if(i===0||p.goals!==totals.players[i-1].goals)rank=i+1;return `<li><span class="scorer-rank">${rank}.</span><span class="player-info"><strong>${esc(p.name)}</strong></span><strong>${p.goals} ${p.goals===1?'goal':'goals'}</strong></li>`;}).join('')}</ol>`:'<p class="muted small">Nog geen doelpuntenmakers geregistreerd.</p>'}${totals.unknown?`<p class="hint">Nog zonder maker: ${totals.unknown} ${totals.unknown===1?'doelpunt':'doelpunten'}. Vul namen aan bij Wedstrijdverloop of open een vorige wedstrijd hieronder.</p>`:''}</section>`;
}
function chooseScorer(matchId,eventId,newGoal=false,history=false){
 const m=matchById(matchId),event=m?.events.find(e=>e.id===eventId&&e.type==='goal'&&e.side==='us');if(!event)return;
 scorerSelection={matchId,eventId,newGoal,history};
 const players=matchPlayers(m),field=newGoal?players.filter(p=>m.lineup.includes(p.id)):[],others=players.filter(p=>!field.includes(p));
 const choice=p=>`<button class="choice" data-action="assign-scorer" data-id="${esc(p.id)}"><span class="avatar">${esc(initials(p.name))}</span><span class="choice-info"><strong>${esc(p.name)}</strong>${event.scorerId===p.id?'<small>Huidige doelpuntenmaker</small>':''}</span></button>`;
 modal('Wie scoorde?',`<p class="muted small">${newGoal?'Het doelpunt telt al mee. Kies de maker of sla over.':'Pas alleen de maker aan; de stand blijft gelijk.'}</p>${field.length?`<h3 class="choice-heading">Op het veld</h3>${field.map(choice).join('')}`:''}${others.length?`${field.length?'<h3 class="choice-heading">Overige spelers</h3>':''}${others.map(choice).join('')}`:''}<button class="wide" data-action="assign-scorer" data-id="">${newGoal?'Onbekend / overslaan':'Zonder doelpuntenmaker'}</button>${history?`<button class="wide text-button" data-action="history" data-id="${esc(m.id)}">Terug naar wedstrijd</button>`:''}`);
}
function assignScorer(id){
 const selection=scorerSelection;scorerSelection=null;if(!selection)return;
 const m=matchById(selection.matchId),event=m?.events.find(e=>e.id===selection.eventId&&e.type==='goal'&&e.side==='us');
 if(!event){dialog.close();toast('Dit doelpunt is niet meer beschikbaar.');return;}
 if(id&&!matchPlayers(m).some(p=>p.id===id))throw Error('Kies een speler uit deze wedstrijd.');
 const apply=()=>{event.scorerId=id;};
 if(m===state.match){
  // Choosing the maker immediately is part of the same undoable goal action.
  const latest=state.undoHistory.at(-1),sameGoal=selection.newGoal&&m.events.at(-1)?.id===event.id&&latest&&!latest.before.events.some(e=>e.id===event.id);
  if(sameGoal)apply();else changeGame(state,'doelpuntenmaker',apply);
  syncHistory();
 }else apply();
 dialog.close();update();if(selection.history)showHistory({dataset:{id:m.id}});toast('Doelpuntenmaker opgeslagen');
}
function tick(){tickTraining();tickReminders();const m=state.match,t=elapsed(m),c=$('#clock');if(c)c.textContent=clock(Math.max(0,t-m.halfStartedAt));const l=$('#timer-label');if(l)l.textContent=`${m.half}e helft · totaal ${clock(t)}${m.startedAt===null?' · Klok staat stil':''}${t-m.halfStartedAt>=m.halfMinutes*60000?' · Richttijd bereikt':''}`;const times=minutes(m);document.querySelectorAll('[data-time]').forEach(el=>el.textContent=clock(times[el.dataset.time]||0));document.querySelectorAll('[data-bar]').forEach(el=>el.style.width=`${t?Math.min(100,(times[el.dataset.bar]||0)/t*100):0}%`);const connection=$('#connection');if(connection)connection.textContent=!navigator.onLine?'Offline · gegevens blijven op dit toestel':offlineReady?'Offline beschikbaar · opgeslagen op dit toestel':'Opgeslagen op dit toestel';}
function choosePosition(index){
 const m=state.match;if(m.status==='ended')return;
 const available=bench(), field=present().filter(p=>m.lineup.includes(p.id));
 const choice=(p,onField)=>{const current=m.lineup.indexOf(p.id), here=current===index;return `<button class="choice ${onField?'already-field':''}" data-action="assign" data-index="${index}" data-id="${esc(p.id)}" ${here?'disabled':''}><span class="avatar">${esc(initials(p.name))}</span><span class="choice-info"><strong>${esc(p.name)}</strong><small>${clock(minutes(m)[p.id]||0)} gespeeld · ${onField?`${positionNames(m)[current]} · ${here?'Deze positie':'Al opgesteld'}`:'Beschikbaar op de bank'}</small></span></button>`;};
 modal(positionNames(m)[index],`<p class="muted small">Kies een bankspeler of ruil met een speler op het veld.</p><h3 class="choice-heading">Op de bank</h3>${available.length?available.map(p=>choice(p,false)).join(''):'<p class="hint">Geen bankspelers beschikbaar.</p>'}${field.length?`<h3 class="choice-heading">Al opgesteld</h3>${field.map(p=>choice(p,true)).join('')}`:''}${m.lineup[index]?`<button class="wide ghost" data-action="assign" data-index="${index}" data-id="">Positie leegmaken</button>`:''}${!present().length?'<p>Voeg eerst aanwezige spelers toe bij Mijn team.</p>':''}`);
}
function assign(index,id){const m=state.match;if(id&&!present().some(p=>p.id===id))throw Error('Deze speler is niet aanwezig.');const line=[...m.lineup];if(line[index]===id){dialog.close();return;}const oldIndex=line.indexOf(id);if(id&&oldIndex!==-1)line[oldIndex]=line[index];line[index]=id||null;changeGame(state,m.status==='ready'?'opstelling':'wissel',()=>setLineup(m,line));dialog.close();update();toast(m.status==='ready'?'Opstelling opgeslagen':'Wissel opgeslagen');}
function editMatch(){const m=state.match;modal('Wedstrijd instellen',`<form id="match-form" class="stack"><label>Tegenstander<input name="opponent" value="${esc(m.opponent)}" maxlength="80" placeholder="Bijvoorbeeld: tegenstander JO10-…"></label><label>Aftrap<input type="datetime-local" name="date" value="${esc(m.date)}"></label><label>Thuis of uit<select name="home"><option value="true" ${m.home?'selected':''}>Thuis</option><option value="false" ${!m.home?'selected':''}>Uit</option></select></label><label>Minuten per helft<input type="number" name="halfMinutes" min="1" max="60" value="${m.halfMinutes}" required></label><button class="primary" type="submit">Opslaan</button></form>`);}
function wantsWakeLock(){return presentationOpen||state.match.startedAt!==null||state.trainings.some(t=>t.run.startedAt!==null);}
async function keepAwake(){
 try{
  if(wantsWakeLock()&&document.visibilityState==='visible'&&navigator.wakeLock&&!wakeLock&&!wakePending){
   wakePending=true;
   try{
    const lock=await navigator.wakeLock.request('screen');
    if(!wantsWakeLock()||document.visibilityState!=='visible'){await lock.release();return;}
    wakeLock=lock;lock.addEventListener('release',()=>{if(wakeLock===lock)wakeLock=null;});
   }finally{wakePending=false;}
  }else if(!wantsWakeLock()&&wakeLock){const lock=wakeLock;wakeLock=null;await lock.release();}
 }catch{}
}
function expandIcon(){return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/></svg>';}
function endPresentation(){
 if(!presentationOpen)return;
 presentationOpen=false;dialog.classList.remove('presentation');
 if(presentationFullscreen&&document.fullscreenElement===document.documentElement)document.exitFullscreen?.().catch(()=>{});
 presentationFullscreen=false;
 keepAwake();
}
async function showLineup(){
 presentationOpen=true;dialog.classList.add('presentation');
 $('#dialog-content').innerHTML=`<header class="presentation-head"><div><p class="eyebrow">Voorbespreking · ${state.match.formation}</p><h2 id="dialog-title">Nieuwerkerk JO10-8</h2></div><button class="close" data-action="close" aria-label="Voorbespreking sluiten">×</button></header>${pitch(true)}<footer class="presentation-bench"><strong>Wisselbank</strong><div>${bench().map(p=>`<span>${esc(p.name)}</span>`).join('')||'<span>Geen bankspelers</span>'}</div></footer>`;
 if(!dialog.open)dialog.showModal();
 keepAwake();
 try{
  if(!document.fullscreenElement&&document.documentElement.requestFullscreen){
   await document.documentElement.requestFullscreen();
   if(presentationOpen)presentationFullscreen=true;
   else if(document.fullscreenElement===document.documentElement)await document.exitFullscreen?.();
  }
 }catch{}
}
dialog.addEventListener('close',()=>{if(!dialog.open)endPresentation();});
function download(text,filename){const u=URL.createObjectURL(new Blob([text],{type:'application/json'}));const a=document.createElement('a');a.href=u;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);}
let pendingImport=null;
const actions={
 'show-lineup':showLineup, 'close':()=>{endPresentation();dialog.close();}, 'edit-match':editMatch,
 'team-link':()=>modal('Link naar JO10-8',`<form id="team-link-form" class="stack"><p class="muted small">Plak de link van de teampagina uit voetbal.nl. Deze wordt alleen op dit toestel opgeslagen. Of de link de voetbal.nl-app opent, hangt af van je telefoon en de link.</p><label>Voetbal.nl-teamlink<input name="teamUrl" type="url" value="${esc(state.teamUrl)}" maxlength="2048" placeholder="https://…" autocomplete="off"></label><button class="primary" type="submit">Opslaan</button><p class="hint">Laat het veld leeg om de algemene voetbal.nl-pagina te gebruiken. Een link openen haalt geen wedstrijden op in Zijlijn.</p></form>`), 'version':showVersion, 'check-update':()=>checkForUpdate(true), 'apply-update':applyUpdate,
 'position':b=>choosePosition(Number(b.dataset.index)),
 'assign':b=>assign(Number(b.dataset.index),b.dataset.id),
 'bench':b=>{modal(`${esc(name(b.dataset.id))} inbrengen`,`<p class="muted small">Kies de positie voor deze speler.</p>`+state.match.lineup.map((id,i)=>`<button class="choice" data-action="assign" data-index="${i}" data-id="${esc(b.dataset.id)}"><span class="choice-info"><strong>${positionNames(state.match)[i]}</strong><small>${id?'Voor '+esc(name(id))+' · '+clock(minutes(state.match)[id]||0)+' gespeeld':'Vrije positie'}</small></span></button>`).join(''));},
 'clock':()=>{const m=state.match;if(m.status==='ended')return;if(m.startedAt!==null)pause(m);else {if(m.status==='ready'&&!m.lineup.some(Boolean)){toast('Zet eerst spelers in de opstelling.');tab='opstelling';location.hash=tab;render();return;}if(m.status==='ready')state.undoHistory=[];start(m);}keepAwake();update();},
 'goal-us':()=>goal('us'),'goal-them':()=>goal('them'),
 'minus-us':()=>subtractGoal('us'),'minus-them':()=>subtractGoal('them'),
 'edit-scorer':b=>chooseScorer(b.dataset.match,b.dataset.event,false,b.dataset.history==='true'),
 'assign-scorer':b=>assignScorer(b.dataset.id||null),
 'summary':showSummary,'copy-summary':copySummary,'share-summary':shareSummary,
 'undo':()=>{const label=undoGame(state);if(label){syncHistory();update();toast(label+' hersteld');}},
 'second-half':()=>confirmAction('Tweede helft','De klok wordt gepauzeerd. Tik bij de aftrap van de tweede helft op Hervatten. De totale speeltijd blijft behouden.','confirm-half','Naar 2e helft'),
 'confirm-half':()=>{pause(state.match);changeGame(state,'tweede helft',m=>{m.half=2;m.halfStartedAt=elapsed(m);});keepAwake();dialog.close();update();},
 'finish':()=>confirmAction('Wedstrijd afronden','De klok stopt en de wedstrijd wordt bewaard. Controleer eerst de score en de wissels.','confirm-finish','Afronden'),
 'confirm-finish':()=>{const m=state.match;if(m.status!=='live')return;pause(m);m.status='ended';state.undoHistory=[];state.history.push({match:structuredClone(m),players:state.players.map(p=>({id:p.id,name:p.name}))});keepAwake();dialog.close();update();toast('Wedstrijd bewaard');},
 'new-match':()=>confirmAction('Nieuwe wedstrijd','Je team blijft bewaard. De score, klok en opstelling beginnen opnieuw.','confirm-new','Nieuwe wedstrijd'),
 'confirm-new':()=>{if(state.match.status!=='ended')return;state.match=freshMatch();state.undoHistory=[];dialog.close();update();},
 'edit-player':b=>{const p=state.players.find(p=>p.id===b.dataset.id);modal('Speler bewerken',`<form id="player-form" data-id="${esc(p.id)}" class="stack"><label>Voornaam<input name="name" value="${esc(p.name)}" maxlength="40" required></label><button type="submit" class="primary">Opslaan</button></form>${state.match.status==='ready'?`<button class="text-button danger" data-action="delete-player" data-id="${esc(p.id)}">Speler verwijderen</button>`:''}`);},
 'delete-player':b=>{const id=b.dataset.id;if(state.match.status!=='ready')return;state.undoHistory=[];state.players=state.players.filter(p=>p.id!==id);setLineup(state.match,state.match.lineup.map(x=>x===id?null:x));dialog.close();update();},
 'export':exportBackup,
 'import':()=>$('#import-file').click(),
 'confirm-import':()=>{if(!pendingImport)return;state=pendingImport;pendingImport=null;storageError='';pause(state.match);state.undoHistory=[];state.trainings.forEach(t=>pauseTraining(t));keepAwake();dialog.close();update();toast('Back-up teruggezet. Wedstrijd- en trainingstimers staan op pauze.');},
 'recovery':()=>{try{download(localStorage.getItem(KEY)||'null','zijlijn-herstelbestand.json');}catch{toast('De browser geeft geen toegang tot de opslag.');}}
};
function goal(side){const m=state.match;if(m.status==='ready')return;const event={id:uid(),type:'goal',side,at:elapsed(m)};changeGame(state,side==='us'?'doelpunt Nieuwerkerk':'doelpunt tegenstander',()=>m.events.push(event));syncHistory();update();toast(side==='us'?'Doelpunt Nieuwerkerk!':'Doelpunt tegenstander');if(side==='us')chooseScorer(m.id,event.id,true);}
document.addEventListener('click',e=>{const nav=e.target.closest('[data-tab]');if(nav){tab=nav.dataset.tab;location.hash=tab;render();return;}const b=e.target.closest('[data-action]');if(b&&!b.disabled){try{actions[b.dataset.action]?.(b);}catch(err){toast(err.message);}}});
document.addEventListener('submit',e=>{e.preventDefault();const f=e.target,d=new FormData(f);if(f.id==='team-link-form'){try{state.teamUrl=normalizeTeamUrl(String(d.get('teamUrl')));dialog.close();update();toast('Teamlink opgeslagen');}catch(err){toast(err.message);}return;}if(f.id==='add-player'){const n=String(d.get('name')).trim();if(!n)return;if(state.players.length>=100){toast('Maximaal 100 spelers.');return;}state.players.push({id:uid(),name:n,present:true});update();$('#add-player input').focus();}if(f.id==='match-form'){const m=state.match;if(m.status==='ended')return;const duration=Number(d.get('halfMinutes'));if(!Number.isInteger(duration)||duration<1||duration>60)return;Object.assign(m,{opponent:String(d.get('opponent')).trim(),date:String(d.get('date')),home:d.get('home')==='true',halfMinutes:duration});dialog.close();update();}if(f.id==='player-form'){const n=String(d.get('name')).trim();if(!n)return;state.players.find(p=>p.id===f.dataset.id).name=n;dialog.close();update();}});
document.addEventListener('change',async e=>{if(e.target.id==='formation'){try{changeGame(state,'formatie',m=>setFormation(m,e.target.value));update();toast('Formatie opgeslagen');}catch(err){toast(err.message);}return;}if(e.target.dataset.present){if(state.match.status!=='ready')return;const p=state.players.find(p=>p.id===e.target.dataset.present);p.present=e.target.checked;if(!p.present){state.undoHistory=[];setLineup(state.match,state.match.lineup.map(x=>x===p.id?null:x));}update();}if(e.target.id==='import-file'){const file=e.target.files[0];if(!file)return;try{if(file.size>25*1024*1024)throw Error('Bestand is te groot (maximaal 25 MB).');pendingImport=validateState(JSON.parse(await file.text()));if(pendingImport.match.startedAt!==null){pendingImport.match.elapsed=elapsed(pendingImport.match);pendingImport.match.startedAt=null;}confirmAction('Back-up terugzetten',`Dit vervangt je huidige gegevens door ${pendingImport.players.length} spelers, ${pendingImport.history.length} wedstrijden en ${pendingImport.trainings.length} trainingen. Sla zo nodig eerst je huidige back-up op.`,'confirm-import','Terugzetten');}catch(err){pendingImport=null;toast(err.message);}e.target.value='';}});
window.addEventListener('hashchange',()=>{tab=location.hash.slice(1);render();});
window.addEventListener('storage',e=>{if(e.key===KEY&&e.newValue){try{state=validateState(JSON.parse(e.newValue));dialog.close();render();toast('Gegevens bijgewerkt vanuit een ander tabblad.');}catch{}}});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){tick();keepAwake();checkForUpdate();}});
window.addEventListener('online',()=>{tick();checkForUpdate(true);});window.addEventListener('offline',tick);
let offlineReady=false;
function versionContent(){return `<p>Je gebruikt <strong>Zijlijn ${APP_VERSION}</strong>.</p><p class="muted small" id="update-status" role="status">${esc(updateCheck)}</p><div class="stack"><button data-action="check-update">Controleer op updates</button>${waitingWorker?'<button class="primary" data-action="apply-update">Update laden</button>':''}</div><p class="hint">Je spelers en wedstrijden blijven bewaard bij een update.</p>`;}
function showVersion(){modal('Versie & updates',versionContent());checkForUpdate();}
function refreshVersion(){const badge=$('#app-version');if(badge){badge.textContent=`v${APP_VERSION}${waitingWorker?' · Update':''}`;badge.setAttribute('aria-label',`Zijlijn versie ${APP_VERSION}. ${waitingWorker?'Update beschikbaar. ':''}Versie en updates bekijken`);}if(dialog.open&&$('#update-status'))modal('Versie & updates',versionContent());}
function observeRegistration(reg){swRegistration=reg;const found=()=>{if(reg.waiting){waitingWorker=reg.waiting;updateCheck='Er staat een update klaar. Tik op Update laden.';refreshVersion();}};found();reg.addEventListener('updatefound',()=>{const worker=reg.installing;worker?.addEventListener('statechange',()=>{if(worker.state==='installed'&&(reg.waiting||navigator.serviceWorker.controller)){waitingWorker=reg.waiting||worker;updateCheck='Er staat een update klaar. Tik op Update laden.';refreshVersion();}});});}
const workerUrl=version=>`./sw.js?v=${encodeURIComponent(version)}`;
async function checkForUpdate(force=false){
 if(checkingUpdate||(!force&&Date.now()-lastUpdateCheck<60000))return;
 checkingUpdate=true;lastUpdateCheck=Date.now();
 try{
  if(!navigator.onLine)throw Error('offline');
  const response=await fetch(`./release.json?t=${Date.now()}`,{cache:'no-store'});
  if(!response.ok)throw Error('release');
  const release=await response.json();if(!/^\d+\.\d+\.\d+$/.test(release.version))throw Error('release');
  latestVersion=release.version;
  if(swRegistration){
   if(latestVersion!==APP_VERSION){const reg=await navigator.serviceWorker.register(workerUrl(latestVersion),{updateViaCache:'none'});observeRegistration(reg);}
   else await swRegistration.update();
   if(swRegistration.waiting){waitingWorker=swRegistration.waiting;}
  }
  updateCheck=waitingWorker?'Er staat een update klaar. Tik op Update laden.':latestVersion===APP_VERSION?`Nieuwste versie bevestigd om ${new Date().toLocaleTimeString('nl-NL',{hour:'2-digit',minute:'2-digit'})}.`:`Versie ${latestVersion} is beschikbaar. De update wordt voorbereid; controleer zo nog eens.`;
 }catch{updateCheck=navigator.onLine?'De nieuwste versie kon niet worden gecontroleerd. Probeer het later opnieuw.':'Je bent offline. Controleer de nieuwste versie zodra je internet hebt.';}
 finally{checkingUpdate=false;refreshVersion();}
}
function applyUpdate(){
 if(!waitingWorker){checkForUpdate(true);return;}
 save();if(storageError){toast('Maak eerst een back-up; je gegevens konden niet worden opgeslagen.');return;}
 waitingWorker.postMessage({type:'ACTIVATE_UPDATE'});toast('Update wordt geladen…');
}
if('serviceWorker' in navigator){
 let controlled=!!navigator.serviceWorker.controller;
 navigator.serviceWorker.addEventListener('controllerchange',()=>{if(controlled)location.reload();else controlled=true;});
 navigator.serviceWorker.register(workerUrl(APP_VERSION),{updateViaCache:'none'}).then(reg=>{observeRegistration(reg);return navigator.serviceWorker.ready;}).then(()=>{offlineReady=true;tick();checkForUpdate();}).catch(()=>{});
}
refreshVersion();checkForUpdate();
const modelContext=document.modelContext;
if(modelContext?.registerTool){const lifecycle=new AbortController();window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});try{Promise.resolve(modelContext.registerTool({name:'read_match',title:'Wedstrijd bekijken',description:'Lees score, klok, opstelling en speeltijd van de huidige wedstrijd.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:true},execute(input){if(!input||typeof input!=='object'||Object.keys(input).length)throw Error('Geen parameters toegestaan.');return {opponent:state.match.opponent,status:state.match.status,score:score(state.match),elapsedMs:elapsed(state.match),players:state.players.map(p=>({name:p.name,onField:state.match.lineup.includes(p.id),playedMs:minutes(state.match)[p.id]||0}))};}},{signal:lifecycle.signal})).catch(()=>{});}catch{}}


function syncHistory(){
 if(state.match.status!=='ended')return;
 const entry=state.history.find(h=>h.match.id===state.match.id);
 if(entry){entry.match=structuredClone(state.match);for(const p of state.players)if(!entry.players.some(x=>x.id===p.id))entry.players.push({id:p.id,name:p.name});}
}
function subtractGoal(side){
 if(!score(state.match)[side])return;changeGame(state,'doelpunt verwijderd',m=>removeGoal(m,side));
 syncHistory();update();toast('Doelpunt verwijderd. Vergist? Gebruik Herstel.');
}
const composeSummary=m=>(matchSummary(m,matchPlayers(m))+(m.notes?'\n\n'+m.notes:'')).slice(0,10000);
let summaryTargetId='';
function summaryMatch(){return summaryTargetId===state.match.id?state.match:state.history.find(h=>h.match.id===summaryTargetId)?.match;}
function showSummary(b){
 summaryTargetId=b?.dataset.id||state.match.id;const m=summaryMatch();if(!m)return;
 const text=m.summarySaved?m.summary:composeSummary(m);
 modal('Samenvatting voor ouders',`<p class="muted small">Je wijzigingen worden automatisch bewaard.</p><label class="stack" for="summary-text">Jouw bericht<textarea id="summary-text" maxlength="10000" rows="10">${esc(text)}</textarea></label><div class="row"><button class="primary" data-action="copy-summary">Kopiëren</button>${navigator.share?'<button data-action="share-summary">Delen…</button>':''}</div><button class="text-button" data-action="regenerate-summary">Opnieuw maken met de huidige stand</button><p class="hint">Je kiest zelf waar en met wie je het bericht deelt. Na een scorecorrectie kun je het bericht opnieuw maken.</p>`);
}
async function copySummary(){
 const field=$('#summary-text');if(!field)return;
 try{await navigator.clipboard.writeText(field.value);toast('Gekopieerd! Plak het bericht in de oudergroep.');}
 catch{field.focus();field.select();field.setSelectionRange(0,field.value.length);toast('Selecteer Kopieer in het tekstmenu en plak het bericht in de oudergroep.');}
}
async function shareSummary(){
 const field=$('#summary-text');if(!field)return;
 try{await navigator.share({text:field.value});}
 catch(err){if(err.name!=='AbortError')toast('Delen lukt niet. Gebruik Kopiëren om het bericht te delen.');}
}

function backupNotice(){return backupDue(state)?'<div class="backup-notice"><span>Bewaar je team, wedstrijden en trainingen in een back-up.</span><button data-action="export">Back-up opslaan</button></div>':'';}
function exportBackup(){
 const exportedAt=Date.now(),snapshot=structuredClone(state);
 snapshot.backupAt=exportedAt;snapshot.backupMatches=state.history.length;snapshot.undoHistory=[];
 pause(snapshot.match);snapshot.trainings.forEach(t=>pauseTraining(t));
 download(JSON.stringify(snapshot,null,2),`zijlijn-backup-${new Date().toISOString().slice(0,10)}.json`);
 state.backupAt=exportedAt;state.backupMatches=state.history.length;update();toast('Back-up aangeboden als download. Bewaar het bestand op een veilige plek.');
}
function tickReminders(){
 const host=$('#match-reminders');if(!host)return;
 const r=reminders(state),html=(r.timeout?'<div class="reminder"><span>Tijd voor de time-out van deze helft.</span><button data-action="timeout">Time-out starten</button></div>':'')+(r.swap?'<div class="reminder"><span>Wisselmoment: bekijk de speeltijden op de bank.</span><button data-action="snooze-swap">Later herinneren</button></div>':'');
 if(host.innerHTML!==html)host.innerHTML=html;
}
function showHistory(b){
 const h=state.history.find(h=>h.match.id===b.dataset.id);if(!h)return;
 const m=h.match,s=score(m),times=minutes(m),player=id=>h.players.find(p=>p.id===id)?.name||'Onbekende speler';
 const events=m.events.map(e=>e.type==='goal'?`Doelpunt ${e.side==='us'?'Nieuwerkerk'+(e.scorerId?' · '+player(e.scorerId):''):m.opponent||'tegenstander'}`:e.type==='formation'?`Formatie ${e.beforeFormation} → ${e.formation}`:`Opstelling: ${e.lineup.filter(Boolean).map(player).join(', ')}`);
 modal('Wedstrijd terugkijken',`<p class="eyebrow">${esc(dateLabel(m))}</p><h3>Nieuwerkerk ${s.us} – ${s.them} ${esc(m.opponent||'Tegenstander')}</h3><p class="muted small">${m.home?'Thuis':'Uit'} · ${clock(elapsed(m))} gespeeld</p>${historyScorers(m)}<details open><summary>Eindopstelling · ${m.formation}</summary>${m.lineup.map((id,i)=>`<div class="history-row"><span>${positionNames(m)[i]}</span><strong>${esc(id?player(id):'Lege plek')}</strong></div>`).join('')}</details><details><summary>Speeltijden</summary>${h.players.filter(p=>times[p.id]||m.initialLineup.includes(p.id)||m.lineup.includes(p.id)).map(p=>`<div class="history-row"><span>${esc(p.name)}</span><strong>${clock(times[p.id]||0)}</strong></div>`).join('')||'<p>Geen speeltijd geregistreerd.</p>'}</details><details><summary>Wissels & doelpunten</summary><ol class="timeline">${m.events.map((e,i)=>`<li><time>${clock(e.at)}</time><span>${esc(events[i])}</span></li>`).join('')}</ol></details>${m.notes?`<p class="preserve-lines">${esc(m.notes)}</p>`:''}<button class="wide" data-action="summary" data-id="${esc(m.id)}">Samenvatting bekijken</button>`);
}
Object.assign(actions,{
 'history':showHistory,
 'timeout':()=>{pause(state.match);changeGame(state,'time-out',m=>{m.timeouts=[...new Set([...m.timeouts,m.half])];});keepAwake();update();toast('Klok gepauzeerd. Tik op Hervatten bij de aftrap.');},
 'snooze-swap':()=>{state.match.swapSnoozeAt=elapsed(state.match);update();},
 'regenerate-summary':()=>confirmAction('Bericht opnieuw maken','Dit vervangt jouw bewerkte tekst door een nieuw bericht met de huidige stand en notities.','confirm-summary','Opnieuw maken'),
 'confirm-summary':()=>{const m=summaryMatch();if(!m)return;m.summary='';m.summarySaved=false;syncHistory();save();showSummary({dataset:{id:m.id}});}
});
document.addEventListener('input',e=>{
 if(e.target.id==='summary-text'){const m=summaryMatch();if(m){m.summary=e.target.value;m.summarySaved=true;syncHistory();save();}}
 if(e.target.hasAttribute('data-match-notes')){state.match.notes=e.target.value;syncHistory();save();}
 if(e.target.hasAttribute('data-training-notes')){const t=currentTraining();if(t){t.notes=e.target.value;save();}}
});
document.addEventListener('change',e=>{if(e.target.id==='swap-interval'){state.swapInterval=Number(e.target.value);state.match.swapSnoozeAt=elapsed(state.match);update();}});

let trainingDraft=null;
const currentTraining=()=>state.trainings.find(t=>t.id===state.selectedTrainingId);
const trainingDateLabel=t=>new Date(`${t.date}T12:00:00`).toLocaleDateString('nl-NL',{weekday:'long',day:'numeric',month:'long'});
function trainingForm(){
 const d=trainingDraft,date=d?.date||nextTrainingDate();
 return `<section class="card"><h2>${d?.id?'Training aanpassen':'Nieuwe training'}</h2><p class="muted small">Vier vaste onderdelen, samen 70 minuten. Vul de drie oefenlinks in; de tijden worden automatisch berekend.</p><form id="training-form" class="stack"><label>Trainingsdatum<input name="date" type="date" value="${esc(date)}" required></label><div class="training-time-preview small muted" id="training-time-preview">${esc(d?.start||defaultStart(date))} · ${esc(d?.field||'Veld 5')}</div>${BLOCKS.map((b,i)=>`<label>${b.name} · ${b.minutes} min${i===3?' (link optioneel)':''}<input name="link${i}" type="url" value="${esc(d?.links?.[i]||'')}" maxlength="2048" placeholder="https://rinus.knvb.nl/…" ${i<3?'required':''} autocapitalize="off" autocomplete="off"></label>`).join('')}<details><summary>Thema, begintijd of veld aanpassen</summary><div class="stack"><label>Thema (optioneel)<input name="theme" maxlength="200" value="${esc(d?.theme||'')}" placeholder="Bijvoorbeeld: aanvallen"></label><label>Begintijd<input name="start" type="time" required value="${esc(d?.start||defaultStart(date))}"></label><label>Veld<input name="field" maxlength="100" value="${esc(d?.field||'Veld 5')}"></label></div></details><button class="primary" type="submit">Schema opslaan</button><button type="button" data-action="cancel-training">Annuleren</button></form></section>`;
}
function trainingView(){
 const t=currentTraining();
 return `<div class="single"><div class="heading"><div><p class="eyebrow">Samen beter worden</p><h1>Training</h1></div><button data-action="new-training">Nieuwe training</button></div>${trainingDraft?trainingForm():t?trainingDetail(t):`<section class="card"><h2>Je training in vier stappen</h2><p>Warming-up, twee oefeningen en afsluiten met partijen. Voeg Rinus-links toe en het schema staat klaar.</p><p class="small muted">Woensdag 17.30–18.40 · vrijdag 17.45–18.55<br>Veld 5 · tijden zijn aanpasbaar</p><button class="primary wide" data-action="new-training">Eerste training maken</button></section>`}<section class="card"><h2>Bewaarde trainingen</h2>${state.trainings.length?[...state.trainings].sort((a,b)=>b.date.localeCompare(a.date)).map(x=>`<button class="history-row wide" data-action="open-training" data-id="${esc(x.id)}"><span>${esc(trainingDateLabel(x))}<small class="block muted">${esc(x.theme||'Warming-up · oefeningen · partijen')}</small></span><span class="small">${x.run.status==='ended'?'Afgerond':x.run.status==='live'?'Bezig':'Gepland'} ›</span></button>`).join(''):'<p class="muted small">Je opgeslagen schema’s verschijnen hier.</p>'}</section><p class="offline-note">Schema en notities blijven op dit toestel. Rinus-instructies openen met internet.</p></div>`;
}
function trainingDetail(t){
 const blocks=schedule(t),r=t.run,b=blocks[r.index];
 return `<section class="card"><div class="card-head"><h2>${esc(trainingDateLabel(t))}</h2><span class="pill">${r.status==='ended'?'Afgerond':'70 minuten'}</span></div><p class="muted small">${t.start}–${blocks[3].end} · ${esc(t.field)}${t.theme?' · '+esc(t.theme):''}</p>${r.status!=='ended'?`<div class="training-active"><p class="eyebrow">${r.status==='ready'?'Begin met':'Nu aan de beurt'}</p><h2>${b.name}</h2><div class="clock" id="training-clock"></div><p class="small muted" id="training-timer-label"></p>${b.url?`<a class="button-link wide" href="${esc(b.url)}" target="_blank" rel="noopener noreferrer">Open oefening in Rinus ↗</a>`:'<p class="small muted">Partijspel naar eigen invulling.</p>'}<div class="row"><button class="primary" data-action="training-clock">${r.startedAt!==null?'Ⅱ Pauze':r.status==='ready'?'▶ Start training':'▶ Hervatten'}</button><button data-action="training-next" ${r.status==='ready'?'disabled':''}>${r.index===3?'Afronden':'Volgende'}</button></div></div>`:'<p>Training afgerond. Bewaar hieronder wat goed ging en wat je nog wilt oefenen.</p>'}<ol class="training-schedule">${blocks.map((x,i)=>`<li class="${r.status!=='ready'&&r.status!=='ended'&&r.index===i?'current':''}"><span class="schedule-time">${x.start}–${x.end}</span><span><strong>${x.name}</strong><small>${x.minutes} minuten</small></span>${x.url?`<a href="${esc(x.url)}" target="_blank" rel="noopener noreferrer" aria-label="${x.name} openen in Rinus">Rinus ↗</a>`:''}</li>`).join('')}</ol><p class="hint">Dit zijn geplande tijden. De timer volgt jouw start en pauzes; tik zelf op Volgende om door te gaan.</p><div class="row"><button data-action="share-training">Schema delen</button><button data-action="reuse-training">Hergebruiken</button></div>${r.status==='ready'?'<button class="text-button" data-action="edit-training">Links of datum aanpassen</button>':''}<details><summary>Notities & materialen</summary><label class="stack">Voorbereiding en terugblik<textarea data-training-notes maxlength="10000" rows="4" placeholder="Materialen, coachpunten, wat ging goed…">${esc(t.notes)}</textarea></label><p class="hint">Wordt automatisch bewaard.</p></details></section>`;
}
function tickTraining(){
 const el=$('#training-clock'),t=currentTraining();if(!el||!t)return;
 const remaining=BLOCKS[t.run.index].minutes*60000-trainingElapsed(t);
 el.textContent=clock(Math.max(0,remaining));
 $('#training-timer-label').textContent=remaining<=0?'Tijd verstreken · tik op Volgende wanneer je klaar bent':t.run.startedAt!==null?'Resterende tijd':t.run.status==='ready'?'Klaar om te beginnen':'Gepauzeerd';
}
Object.assign(actions,{
 'new-training':()=>{if(state.trainings.length>=500){toast('Maximaal 500 trainingen.');return;}trainingDraft={};render();},
 'cancel-training':()=>{trainingDraft=null;render();},
 'open-training':b=>{state.selectedTrainingId=b.dataset.id;trainingDraft=null;update();},
 'edit-training':()=>{const t=currentTraining();if(t?.run.status==='ready'){trainingDraft=structuredClone(t);render();}},
 'reuse-training':()=>{const t=currentTraining();if(!t)return;trainingDraft={...structuredClone(t),id:null,date:nextTrainingDate(),start:defaultStart(nextTrainingDate())};render();},
 'training-clock':()=>{const t=currentTraining();if(!t)return;if(t.run.startedAt!==null)pauseTraining(t);else{if(state.trainings.some(x=>x.id!==t.id&&x.run.status==='live')){toast('Rond eerst de andere lopende training af.');return;}startTraining(t);}keepAwake();update();},
 'training-next':()=>{const t=currentTraining();if(!t||t.run.status!=='live')return;confirmAction(t.run.index===3?'Training afronden':'Volgende onderdeel',t.run.index===3?'De training wordt afgerond en blijft bewaard.':'Je sluit dit onderdeel af. De timer begint opnieuw voor het volgende onderdeel.','confirm-training-next',t.run.index===3?'Afronden':'Volgende');},
 'confirm-training-next':()=>{const t=currentTraining();if(!t)return;nextBlock(t);dialog.close();keepAwake();update();},
 'share-training':()=>{const t=currentTraining();if(!t)return;modal('Trainingsschema delen',`<label class="stack">Bericht<textarea id="summary-text" rows="12">${esc(trainingText(t))}</textarea></label><div class="row"><button class="primary" data-action="copy-summary">Kopiëren</button>${navigator.share?'<button data-action="share-summary">Delen…</button>':''}</div>`);summaryTargetId='';}
});
document.addEventListener('change',e=>{
 if(e.target.form?.id==='training-form'&&e.target.name==='date'){const start=e.target.form.elements.start;start.value=defaultStart(e.target.value);$('#training-time-preview').textContent=`${start.value} · ${e.target.form.elements.field.value}`;}
});
document.addEventListener('submit',e=>{
 if(e.target.id!=='training-form')return;e.preventDefault();
 const f=e.target,d=new FormData(f);
 try{
  const t=createTraining({date:String(d.get('date')),start:String(d.get('start')),field:String(d.get('field')).trim(),theme:String(d.get('theme')).trim(),links:BLOCKS.map((_,i)=>String(d.get('link'+i)))});
  if(trainingDraft?.id){const old=state.trainings.find(x=>x.id===trainingDraft.id);if(!old||old.run.status!=='ready')throw Error('Deze training kan niet meer worden aangepast.');Object.assign(old,{date:t.date,start:t.start,field:t.field,theme:t.theme,links:t.links});state.selectedTrainingId=old.id;}
  else {if(state.trainings.length>=500)throw Error('Maximaal 500 trainingen.');t.notes=trainingDraft?.notes||'';state.trainings.push(t);state.selectedTrainingId=t.id;}
  trainingDraft=null;update();toast('Trainingsschema opgeslagen');
 }catch(err){toast(err.message);}
});

render();setInterval(tick,1000);keepAwake();
