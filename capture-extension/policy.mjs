export const ORIGINS=new Set(['https://smm-explore-demo.evanchen.workers.dev','http://localhost:8794']);
export function originOf(url){try{const u=new URL(url);return ORIGINS.has(u.origin)?u.origin:null;}catch{return null;}}
export function networkEvidence(response,origin){
  try{
    const url=new URL(response.url);
    if(url.origin!==origin||url.pathname!=='/api/reports/export')return null;
    const requestHeader=Object.entries(response.headers||{}).find(([key])=>key.toLowerCase()==='x-request-id')?.[1];
    const requestId=/^[a-f0-9-]{36}$/.test(requestHeader||'')?requestHeader:null;
    return {requestId,path:url.pathname,status:Math.trunc(response.status),protocol:String(response.protocol||'').slice(0,20),observedAt:new Date().toISOString()};
  }catch{return null;}
}
