export const BLOCKS=[{name:'Warming-up',minutes:10},{name:'Oefening 1',minutes:15},{name:'Oefening 2',minutes:15},{name:'Partijen',minutes:30}];
export const localDate=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
export function nextTrainingDate(now=new Date()) {const d=new Date(now);for(let i=0;i<7;i++){if([3,5].includes(d.getDay()))return localDate(d);d.setDate(d.getDate()+1);}return localDate(d);}
export const defaultStart=date=>new Date(`${date}T12:00:00`).getDay()===5?'17:45':'17:30';
export function rinusUrl(value,optional=false){
 if(typeof value!=='string'||value.length>2048)throw Error('Gebruik een geldige Rinus-link.');
 if(!value.trim()&&optional)return '';
 let u;try{u=new URL(value.trim());}catch{throw Error('Plak een volledige Rinus-link bij iedere oefening.');}
 if(u.protocol!=='https:'||u.hostname!=='rinus.knvb.nl'||u.username||u.password||u.port||!/^\/(?:nl\/)?exercise\/id\/\d+\/?$/.test(u.pathname))throw Error('Gebruik een oefenlink van rinus.knvb.nl (exercise/id/…).');
 return u.href;
}
export function createTraining({date=nextTrainingDate(),start=defaultStart(date),field='Veld 5',theme='',links=['','','','']}){
 const t={id:crypto.randomUUID(),date,start,field,theme,links:links.map((v,i)=>rinusUrl(v,i===3)),notes:'',run:{index:0,elapsed:0,startedAt:null,status:'ready'}};
 validateTraining(t);return t;
}
export function schedule(t){
 let minute=t.start.split(':').reduce((h,m)=>Number(h)*60+Number(m));
 const format=n=>`${String(Math.floor(n/60)%24).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;
 return BLOCKS.map((b,i)=>{const start=format(minute);minute+=b.minutes;return {...b,start,end:format(minute),url:t.links[i]};});
}
export const trainingElapsed=(t,now=Date.now())=>t.run.elapsed+(t.run.startedAt===null?0:Math.max(0,now-t.run.startedAt));
export function startTraining(t,now=Date.now()){if(t.run.status==='ended'||t.run.startedAt!==null)return;t.run.status='live';t.run.startedAt=now;}
export function pauseTraining(t,now=Date.now()){t.run.elapsed=trainingElapsed(t,now);t.run.startedAt=null;}
export function nextBlock(t,now=Date.now()){
 if(t.run.status!=='live')return;
 const running=t.run.startedAt!==null;pauseTraining(t,now);
 if(t.run.index===3){t.run.status='ended';return;}
 t.run.index++;t.run.elapsed=0;if(running)t.run.startedAt=now;
}
export function trainingText(t){return `Training JO10-8 · ${t.date}\n${t.field}${t.theme?' · Thema: '+t.theme:''}\n\n`+schedule(t).map(b=>`${b.start}–${b.end} ${b.name}${b.url?'\n'+b.url:''}`).join('\n\n')+(t.notes?'\n\n'+t.notes:'');}
export function validateTraining(t){
 const fail=()=>{throw Error('Ongeldig trainingsschema. Controleer de datum, tijden en Rinus-links.');};
 const str=(v,n)=>typeof v==='string'&&v.length<=n;
 if(!t||!str(t.id,200)||!t.id||!str(t.date,10)||!/^\d{4}-\d{2}-\d{2}$/.test(t.date)||localDate(new Date(`${t.date}T12:00:00`))!==t.date||!/^([01]\d|2[0-3]):[0-5]\d$/.test(t.start)||!str(t.field,100)||!str(t.theme,200)||!str(t.notes,10000)||!Array.isArray(t.links)||t.links.length!==4)fail();
 t.links=t.links.map((v,i)=>rinusUrl(v,i===3));
 const r=t.run;if(!r||!Number.isInteger(r.index)||r.index<0||r.index>3||!Number.isFinite(r.elapsed)||r.elapsed<0||!['ready','live','ended'].includes(r.status)||!(r.startedAt===null||Number.isFinite(r.startedAt)&&r.startedAt>=0)||r.status!=='live'&&r.startedAt!==null||r.status==='ready'&&(r.index!==0||r.elapsed!==0)||r.status==='ended'&&r.index!==3)fail();
 return t;
}
