import {jpegDimensions} from './jpeg.mjs';
export function sanitizeBrowserEvidence(value){
  if(!['chrome-debugger-extension','user-selected-browser-tab','user-uploaded-image'].includes(value?.source)||value.mimeType!=='image/jpeg'||typeof value.image!=='string'||value.image.length>350000||!/^\/9j\/[A-Za-z0-9+/]*={0,2}$/.test(value.image))return null;
  const imageSize=jpegDimensions(value.image);if(!imageSize)return null;
  const stamp=Date.parse(value.capturedAt);if(!Number.isFinite(stamp)||Math.abs(Date.now()-stamp)>300000)return null;
  const bounded=n=>Number.isFinite(n)&&n>0&&n<=20000?Math.round(n):null;
  const viewport={width:bounded(value.viewport?.width),height:bounded(value.viewport?.height)};
  if(!viewport.width||!viewport.height)return null;
  const network=(Array.isArray(value.network)?value.network:[]).filter(x=>x?.path==='/api/reports/export'&&Number.isInteger(x.status)&&x.status>=100&&x.status<=599).slice(-10).map(x=>({requestId:/^[a-f0-9-]{36}$/.test(x.requestId||'')?x.requestId:null,path:x.path,status:x.status,protocol:['h2','h3','http/1.1'].includes(x.protocol)?x.protocol:'unknown',observedAt:Number.isFinite(Date.parse(x.observedAt))?new Date(x.observedAt).toISOString():null}));
  return {image:value.image,metadata:{source:value.source,trust:value.source==='user-uploaded-image'?'user-uploaded image; original capture time and origin are unknown':'client-supplied; selected tab origin is not attested',mimeType:'image/jpeg',imageSize,capturedAt:value.source==='user-uploaded-image'?null:new Date(stamp).toISOString(),...(value.source==='user-uploaded-image'?{uploadedAt:new Date(stamp).toISOString()}:{}),viewport:value.source==='user-uploaded-image'?null:viewport,network:value.source==='user-uploaded-image'?[]:network}};
}
