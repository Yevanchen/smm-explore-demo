import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac,randomUUID} from 'node:crypto';
import {verifyComputerRequest} from '../src/computer-request-evidence.mjs';
const secret='test-only-key',user='test-owner';
const sign=r=>{const payload=btoa(JSON.stringify(r));return payload+'.'+createHmac('sha256',secret).update(`computer-request-evidence:v1\n${user}\n${payload}`).digest('hex');};
const record=()=>({id:randomUUID(),route:'/api/agents/:id',method:'GET',status:404,occurredAt:new Date().toISOString(),durationMs:25});
test('Computer receipt rejects different users, tampering, expiry and arbitrary paths',async()=>{
 const r=record(),token=sign(r);
 assert.equal((await verifyComputerRequest(token,user,secret)).id,r.id);
 assert.equal(await verifyComputerRequest(token,'other-user',secret),null);
 assert.equal(await verifyComputerRequest(token,user,'wrong-key'),null);
 assert.equal(await verifyComputerRequest(token.replace(/.$/,'z'),user,secret),null);
 assert.equal(await verifyComputerRequest(sign({...r,occurredAt:new Date(Date.now()-310000).toISOString()}),user,secret),null);
 assert.equal(await verifyComputerRequest(sign({...r,route:'/api/secrets/private'}),user,secret),null);
 assert.equal(await verifyComputerRequest(sign({...r,status:200}),user,secret),null);
 const clean=await verifyComputerRequest(sign({...r,body:'secret-message'}),user,secret);
 assert.equal(JSON.stringify(clean).includes('secret-message'),false);
});
