import test from 'node:test';
import assert from 'node:assert/strict';
import {tailRecords,ingestTail} from '../src/cloudflare-logs.mjs';
const record=()=>({kind:'smm.request',id:crypto.randomUUID(),ownerHash:'a'.repeat(64),route:'/api/agents/:id',method:'GET',status:404,durationMs:12,occurredAt:new Date().toISOString()});
test('tail exports only scoped structured events and drops headers, bodies and exception text',()=>{
 const r=record();const events=[{scriptName:'mosoo-computer-lab',outcome:'ok',event:{request:{headers:{cookie:'secret'},url:'https://x/?token=secret'}},exceptions:[{name:'Error',message:'secret'}],logs:[{message:[JSON.stringify(r),'unrelated secret',{...r,kind:'other'}]}]},{scriptName:'other-worker',logs:[{message:[r]}]}];
 const result=tailRecords(events);assert.equal(result.length,1);assert.equal(result[0].id,r.id);assert.equal(result[0].exceptionCount,1);assert.equal(JSON.stringify(result).includes('secret'),false);
 assert.deepEqual(tailRecords([{scriptName:'mosoo-computer-lab',logs:[{message:[{...r,route:'/api/auth/session'},{...r,ownerHash:'arbitrary'},{...r,occurredAt:'2000-01-01'}]}]}]),[]);
});
test('ingestion preserves owner binding and strips arbitrary fields',async()=>{
 const writes=[];const env={DB:{prepare(){return {bind(...args){return {run:async()=>writes.push(args)}}}}}};
 const r={...record(),worker:'mosoo-computer-lab',origin:'cloudflare-tail-worker',tenant_id:'other',raw:'secret',outcome:'ok'};
 const res=await ingestTail(new Request('https://x',{method:'POST',body:JSON.stringify({records:[r,{...r,worker:'evil'}]})}),env);
 assert.equal((await res.json()).accepted,1);assert.equal(writes[0][1],'mosoo-computer');assert.equal(writes[0][2],r.ownerHash);assert.equal(writes[0][5].includes('secret'),false);
});
