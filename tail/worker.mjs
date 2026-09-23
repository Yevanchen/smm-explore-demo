import {tailRecords} from '../src/cloudflare-logs.mjs';
export default {
 async tail(events,env){
  const records=tailRecords(events);if(!records.length)return;
  const response=await fetch('https://smm-explore-demo.evanchen.workers.dev/internal/cloudflare/tail',{method:'POST',headers:{Authorization:`Bearer ${env.SMM_TAIL_SECRET}`,'Content-Type':'application/json'},body:JSON.stringify({records}),signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw Error(`Support log delivery failed: ${response.status}`);
 }
};
