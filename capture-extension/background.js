import {originOf,networkEvidence} from './policy.mjs';
const sessions=new Map();
const send=(tabId,method,params={})=>chrome.debugger.sendCommand({tabId},method,params);
async function detach(tabId){sessions.delete(tabId);await chrome.alarms.clear(`capture-${tabId}`);await chrome.debugger.detach({tabId}).catch(()=>{});await chrome.action.setBadgeText({tabId,text:''}).catch(()=>{});}
chrome.action.onClicked.addListener(async tab=>{
  const origin=originOf(tab.url);if(!origin||!tab.id)return;
  if(sessions.has(tab.id)){await detach(tab.id);return;}
  try{
    await chrome.debugger.attach({tabId:tab.id},'1.3');
    sessions.set(tab.id,{origin,expires:Date.now()+300000,network:[],capturing:false});
    await send(tab.id,'Network.enable');
    await send(tab.id,'Page.enable');
    await chrome.alarms.create(`capture-${tab.id}`,{delayInMinutes:5});
    await chrome.action.setBadgeText({tabId:tab.id,text:'ON'});
    await chrome.action.setBadgeBackgroundColor({tabId:tab.id,color:'#163c30'});
  }catch{await detach(tab.id);await chrome.action.setBadgeText({tabId:tab.id,text:'ERR'});}
});
chrome.debugger.onEvent.addListener((source,method,params)=>{
  const s=sessions.get(source.tabId);if(!s||Date.now()>s.expires)return;
  if(method==='Network.responseReceived'){
    const event=networkEvidence(params.response,s.origin);
    if(event)s.network=[...s.network,event].slice(-10);
  }
  if(method==='Page.frameNavigated'&&!params.frame?.parentId&&originOf(params.frame?.url)!==s.origin){s.invalid=true;void detach(source.tabId);}
});
chrome.debugger.onDetach.addListener(source=>{sessions.delete(source.tabId);void chrome.action.setBadgeText({tabId:source.tabId,text:''}).catch(()=>{});});
chrome.alarms.onAlarm.addListener(alarm=>{if(alarm.name.startsWith('capture-'))void detach(Number(alarm.name.slice(8)));});
chrome.runtime.onMessage.addListener((message,sender,reply)=>{
  if(message?.type!=='SMM_CAPTURE_ONCE')return;
  const tabId=sender.tab?.id,s=sessions.get(tabId);
  if(sender.frameId!==0||!s||originOf(sender.url)!==s.origin||Date.now()>s.expires||s.capturing){reply({ok:false,reason:'not_armed'});return;}
  s.capturing=true;
  (async()=>{
    try{
      const current=await chrome.tabs.get(tabId);if(originOf(current.url)!==s.origin)throw new Error('origin_changed');
      const metrics=await send(tabId,'Page.getLayoutMetrics');
      const v=metrics.cssVisualViewport;
      if(!v?.clientWidth||!v?.clientHeight)throw new Error('missing_viewport');
      const screenshot=await send(tabId,'Page.captureScreenshot',{format:'jpeg',quality:55,captureBeyondViewport:false,clip:{x:v.pageX,y:v.pageY,width:v.clientWidth,height:v.clientHeight,scale:Math.min(1,1280/v.clientWidth,1280/v.clientHeight)}});
      if(s.invalid||sessions.get(tabId)!==s||Date.now()>s.expires||originOf((await chrome.tabs.get(tabId)).url)!==s.origin)throw new Error('capture_invalidated');
      if(!screenshot?.data||screenshot.data.length>350000)throw new Error('image_too_large');
      reply({ok:true,evidence:{source:'chrome-debugger-extension',capturedAt:new Date().toISOString(),image:screenshot.data,mimeType:'image/jpeg',viewport:{width:v.clientWidth,height:v.clientHeight},network:s.network}});
    }catch{reply({ok:false,reason:'capture_failed'});}
    finally{await detach(tabId);}
  })();
  return true;
});
