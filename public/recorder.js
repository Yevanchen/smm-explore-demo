// Only developer-defined identifiers and states cross this boundary. Never DOM text or input values.
export function createRecorder({clock=Date.now,windowMs=60000,limit=60}={}){
  let events=[];
  function record(event){
    const at=clock();
    events=events.filter(e=>at-e.at<=windowMs);
    events.push({...event,at});events=events.slice(-limit);
  }
  return {record,clear(){events=[];},snapshot(){return events.filter(e=>clock()-e.at<=windowMs).map(e=>({...e}));}};
}
export const recorder=createRecorder();
export function installRecorder(){
  document.addEventListener('click',event=>{
    const id=event.target.closest?.('[data-diagnostic-action]')?.dataset.diagnosticAction;
    if(['export-report','open-support'].includes(id))recorder.record({type:'action',action:id});
  },true);
  window.addEventListener('error',()=>recorder.record({type:'error',code:'uncaught_error'}));
  window.addEventListener('unhandledrejection',()=>recorder.record({type:'error',code:'unhandled_rejection'}));
}
