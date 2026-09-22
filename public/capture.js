export function captureIncident(){
  if(document.documentElement.dataset.smmCaptureBridge!=='ready')return Promise.resolve(null);
  return new Promise(resolve=>{
    const id=crypto.randomUUID();
    const timer=setTimeout(()=>finish(null),2200);
    function finish(value){clearTimeout(timer);window.removeEventListener('message',receive);resolve(value);}
    function receive(event){if(event.source===window&&event.origin===location.origin&&event.data?.type==='SMM_CAPTURE_RESULT'&&event.data.id===id)finish(event.data.result?.ok?event.data.result.evidence:null);}
    window.addEventListener('message',receive);
    window.postMessage({type:'SMM_REQUEST_CAPTURE',id},location.origin);
  });
}

// Invoked only by an explicit click. Chrome's surface picker remains authoritative.
export async function captureSharedTab(){
  if(!navigator.mediaDevices?.getDisplayMedia)throw new Error('此浏览器不支持共享截图，已保存的页面记录不受影响。');
  const stream=await navigator.mediaDevices.getDisplayMedia({video:{displaySurface:'browser'},audio:false,preferCurrentTab:true});
  try{
    const track=stream.getVideoTracks()[0];
    if(track.getSettings().displaySurface!=='browser')throw new Error('请只选择当前 SMM 标签页，不共享整个桌面。');
    const video=document.createElement('video');video.muted=true;video.srcObject=stream;
    await video.play();
    await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('截图准备超时，请重试。')),4000);video.requestVideoFrameCallback(()=>{clearTimeout(timer);resolve();});});
    const scale=Math.min(1,1280/video.videoWidth,1280/video.videoHeight),canvas=document.createElement('canvas');
    canvas.width=Math.round(video.videoWidth*scale);canvas.height=Math.round(video.videoHeight*scale);
    canvas.getContext('2d').drawImage(video,0,0,canvas.width,canvas.height);
    return {source:'user-selected-browser-tab',mimeType:'image/jpeg',image:canvas.toDataURL('image/jpeg',0.55).split(',')[1],capturedAt:new Date().toISOString(),viewport:{width:video.videoWidth,height:video.videoHeight},network:[]};
  }finally{stream.getTracks().forEach(track=>track.stop());}
}
