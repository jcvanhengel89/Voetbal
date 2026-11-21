// A failed read protects the original file; a failed write can be retried.
export function createPersistence(getStorage,key){
 let blocked=false,error='',original=null;
 return {
  get error(){return error;},
  get canRetry(){return !!error&&!blocked;},
  load(fallback,validate){
   try{original=getStorage().getItem(key);return original==null?fallback:validate(JSON.parse(original));}
   catch{blocked=true;error='Je opgeslagen gegevens konden niet worden geladen. Download eerst het herstelbestand via Instellingen. Nieuwe wijzigingen worden nog niet opgeslagen.';return fallback;}
  },
  save(state){
   if(blocked)return false;
   try{const raw=JSON.stringify(state);getStorage().setItem(key,raw);original=raw;error='';return true;}
   catch{error='Opslaan lukt niet. Je wijzigingen staan alleen in dit scherm. Maak een back-up via Instellingen of probeer opnieuw.';return false;}
  },
  // A newer copy from another tab must not discard unsaved local changes (or vice versa).
  observeExternal(raw){
   original=raw;
   if(!error)return true;
   blocked=true;
   error='Een ander tabblad heeft gegevens opgeslagen terwijl dit scherm onopgeslagen wijzigingen heeft. Bewaar je wijzigingen met Back-up opslaan. Herlaad daarna voor de andere versie, of zet je eigen back-up bewust terug.';
   return false;
  },
  acceptImport(){blocked=false;error='';},
  recovery(){return original??getStorage().getItem(key)??'null';}
 };
}
