// A failed read protects the original file; a failed write can be retried.
export function createPersistence(getStorage,key){
 let blocked=false,error='',original=null;
 return {
  get error(){return error;},
  get canRetry(){return !!error&&!blocked;},
  load(fallback,validate){
   try{original=getStorage().getItem(key);return original?validate(JSON.parse(original)):fallback;}
   catch{blocked=true;error='Je opgeslagen gegevens konden niet worden geladen. Download eerst het herstelbestand via Instellingen. Nieuwe wijzigingen worden nog niet opgeslagen.';return fallback;}
  },
  save(state){
   if(blocked)return false;
   try{getStorage().setItem(key,JSON.stringify(state));error='';return true;}
   catch{error='Opslaan lukt niet. Je wijzigingen staan alleen in dit scherm. Maak een back-up via Instellingen of probeer opnieuw.';return false;}
  },
  acceptImport(){blocked=false;error='';},
  recovery(){return original??getStorage().getItem(key)??'null';}
 };
}
