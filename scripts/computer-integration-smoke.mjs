import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const secret=Object.fromEntries(readFileSync('.dev.vars','utf8').trim().split('\n').filter(Boolean).map(l=>{const i=l.indexOf('=');return[l.slice(0,i),JSON.parse(l.slice(i+1))]}));
const base='https://smm-explore-demo.evanchen.workers.dev';
async function internal(path,user,data){return fetch(base+'/internal/computer'+path,{method:data?'POST':'GET',headers:{Authorization:'Bearer '+secret.SMM_COMPUTER_SECRET,'x-smm-user-id':user,'Content-Type':'application/json'},...(data?{body:JSON.stringify(data)}:{})});}
const response=await internal('/cases','integration-acceptance',{checkpoint:{computer:{page:'agents',hasError:false},capturedAt:new Date().toISOString()},description:'Integration acceptance test — not a real user incident'});
assert.equal(response.status,201);const c=await response.json();assert.equal(c.checkpoint.title,'Mosoo Computer');assert.equal(c.checkpoint.route,'agents');
assert.equal((await internal(`/cases/${c.id}`,'unrelated-user')).status,404);
assert.equal((await internal(`/cases/${c.id}/submit`,'integration-acceptance',{description:'Integration acceptance test — not a real user incident'})).status,200);
const login=await fetch(base+'/api/login',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({username:'founder',password:secret.FOUNDER_PASSWORD})});assert.equal(login.status,200);const cookie=login.headers.get('set-cookie').split(';')[0];
const inbox=await(await fetch(base+'/api/team/cases',{headers:{Cookie:cookie}})).json();const found=inbox.cases.find(v=>v.id===c.id);assert.ok(found);assert.equal(found.source.status,'unavailable');assert.equal(found.logs.length,0);
await fetch(base+'/api/logout',{method:'POST',headers:{Origin:base,Cookie:cookie,'Content-Type':'application/json'},body:'{}'});
console.log(JSON.stringify({ok:true,caseId:c.id,verified:['computer-context','owner-isolation','developer-inbox','no-fixture-source-or-logs'],modelCalls:0}));
