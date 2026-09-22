// A receipt is signed by Computer after a real failed response. It is not a browser log claim.
export async function verifyComputerRequest(receipt,userId,secret){
  if(typeof receipt!=='string'||receipt.length>2000||!secret)return null;
  const [payload,hex,...extra]=receipt.split('.');
  if(extra.length||!payload||!/^([a-f0-9]{2}){32}$/.test(hex||''))return null;
  try{
    const encoder=new TextEncoder(),key=await crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['verify']);
    const signature=Uint8Array.from(hex.match(/../g),v=>parseInt(v,16));
    if(!await crypto.subtle.verify('HMAC',key,signature,encoder.encode(`computer-request-evidence:v1\n${userId}\n${payload}`)))return null;
    const r=JSON.parse(atob(payload));
    const allowed=['/api/bootstrap','/api/onboarding','/api/agents','/api/sessions','/api/providers','/api/providers/test','/api/agents/:id','/api/sessions/:id','/api/agents/:id/runtime/restart'];
    if(!/^[a-f0-9-]{36}$/.test(r.id)||!allowed.includes(r.route)||!['GET','POST','PUT','PATCH','DELETE'].includes(r.method)||!Number.isInteger(r.status)||r.status<400||r.status>599||!Number.isFinite(r.durationMs)||r.durationMs<0||r.durationMs>300000)return null;
    const at=Date.parse(r.occurredAt);if(!Number.isFinite(at)||Date.now()-at>300000||at-Date.now()>10000)return null;
    return {id:r.id,status:r.status,occurredAt:new Date(at).toISOString(),details:{route:r.route,method:r.method,durationMs:r.durationMs,origin:'computer-server-signed-response',limitations:'Response metadata only; no request body, response body, stack trace or container logs. Correlated to this user, not independently proven as the cause of their reported issue.'}};
  }catch{return null;}
}
