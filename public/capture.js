export function captureIncident(){
  return new Promise(resolve=>{
    const id=crypto.randomUUID();
    const timer=setTimeout(()=>finish(null),2200);
    function finish(value){clearTimeout(timer);window.removeEventListener('message',receive);resolve(value);}
    function receive(event){if(event.source===window&&event.origin===location.origin&&event.data?.type==='SMM_CAPTURE_RESULT'&&event.data.id===id)finish(event.data.result?.ok?event.data.result.evidence:null);}
    window.addEventListener('message',receive);
    window.postMessage({type:'SMM_REQUEST_CAPTURE',id},location.origin);
  });
}
