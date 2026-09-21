const advertise=()=>{document.documentElement.dataset.smmCaptureBridge='ready';};
if(document.documentElement)advertise();else document.addEventListener('DOMContentLoaded',advertise,{once:true});
// This bridge is limited to manifest-listed origins and never accepts a CDP method or tab ID.
window.addEventListener('message',async event=>{
  if(event.source!==window||event.origin!==location.origin||event.data?.type!=='SMM_REQUEST_CAPTURE'||!/^[-a-f0-9]{36}$/.test(event.data.id||''))return;
  let result;try{result=await chrome.runtime.sendMessage({type:'SMM_CAPTURE_ONCE'});}catch{result={ok:false,reason:'not_available'};}
  window.postMessage({type:'SMM_CAPTURE_RESULT',id:event.data.id,result},location.origin);
});
