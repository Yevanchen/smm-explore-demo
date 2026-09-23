// Only a private Tail Worker can ingest these records. Never accept a client-selected scope.
export const producer='mosoo-computer-lab';
const routes=new Set(['/api/bootstrap','/api/onboarding','/api/agents','/api/sessions','/api/providers','/api/providers/test','/api/agents/:id','/api/sessions/:id','/api/agents/:id/runtime/restart']);
export function cleanRecord(r){
 if(!r||!/^[a-f0-9-]{36}$/.test(r.id)||!/^[a-f0-9]{64}$/.test(r.ownerHash)||!routes.has(r.route)||!['GET','POST','PUT','PATCH','DELETE'].includes(r.method)||!Number.isInteger(r.status)||r.status<400||r.status>599||!Number.isFinite(r.durationMs)||r.durationMs<0||r.durationMs>300000)return null;
 const at=Date.parse(r.occurredAt);if(!Number.isFinite(at)||Math.abs(Date.now()-at)>300000)return null;
 return {id:r.id,ownerHash:r.ownerHash,route:r.route,method:r.method,status:r.status,durationMs:r.durationMs,occurredAt:new Date(at).toISOString()};
}
export function tailRecords(events){
 const records=[];
 for(const event of events){
  if(event.scriptName!==producer)continue;
  for(const log of event.logs||[]){
   for(let message of log.message||[]){
    if(typeof message==='string'){try{message=JSON.parse(message);}catch{continue;}}
    if(message?.kind!=='smm.request')continue;
    const record=cleanRecord(message);if(!record)continue;
    // No arbitrary log messages, headers, URLs, request bodies or exception strings leave Cloudflare.
    records.push({...record,worker:producer,outcome:['ok','exception','exceededCpu','exceededMemory','canceled','unknown'].includes(event.outcome)?event.outcome:'unknown',exceptionCount:Array.isArray(event.exceptions)?event.exceptions.length:0,origin:'cloudflare-tail-worker'});
   }
  }
 }
 return records.slice(0,20);
}
export async function ingestTail(request,env){
 const data=await request.json();
 if(!Array.isArray(data.records)||data.records.length>20)return new Response(null,{status:400});
 let accepted=0;
 for(const raw of data.records){
  const r=cleanRecord(raw);if(!r||raw.worker!==producer||raw.origin!=='cloudflare-tail-worker')continue;
  const details={...r,worker:producer,origin:'cloudflare-tail-worker',outcome:['ok','exception','exceededCpu','exceededMemory','canceled','unknown'].includes(raw.outcome)?raw.outcome:'unknown',exceptionCount:Math.min(100,Math.max(0,Math.trunc(Number(raw.exceptionCount)||0))),limitations:'Cloudflare execution log for this authenticated failed API request. Does not include container stdout, request bodies or arbitrary account logs.'};
  delete details.ownerHash;
  await env.DB.prepare('INSERT OR IGNORE INTO cloudflare_logs(id,tenant_id,owner_hash,occurred_at,status,details) VALUES(?,?,?,?,?,?)').bind(r.id,'mosoo-computer',r.ownerHash,r.occurredAt,r.status,JSON.stringify(details)).run();accepted++;
 }
 return Response.json({accepted});
}
