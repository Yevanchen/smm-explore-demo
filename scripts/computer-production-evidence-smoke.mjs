// Run only after the Computer release. Uses a legitimate temporary release session.
// The failed request is real and read-only; resulting feedback is explicitly an acceptance test.
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const session=JSON.parse(readFileSync(process.env.RELEASE_SESSION_FILE||'/tmp/smm-release-session.json','utf8'));
const secrets=Object.fromEntries(readFileSync('.dev.vars','utf8').trim().split('\n').filter(Boolean).map(line=>{const i=line.indexOf('=');return[line.slice(0,i),JSON.parse(line.slice(i+1))]}));
const computer='https://computer.mosoo.ai',backend='https://smm-explore-demo.evanchen.workers.dev';
const request=await fetch(computer+'/api/agents/smm-acceptance-missing-'+crypto.randomUUID(),{headers:{Cookie:session.cookie}});
assert.equal(request.status,404,'Expected a read-only missing resource response');
const requestEvidence=request.headers.get('x-mosoo-support-evidence');assert.ok(requestEvidence,'New Computer evidence release is not active');
const description='Production acceptance test: real read-only missing-resource request, signed response receipt, and incident-scoped developer evidence. Not a customer incident.';
const response=await fetch(computer+'/api/support/cases',{method:'POST',headers:{Origin:computer,Cookie:session.cookie,'Content-Type':'application/json'},body:JSON.stringify({description,checkpoint:{computer:{page:'agents',hasError:true},capturedAt:new Date().toISOString(),requestEvidence}})});
assert.equal(response.status,201);const incident=await response.json();assert.ok(incident.checkpoint.requestId);
const submitted=await fetch(computer+`/api/support/cases/${incident.id}/submit`,{method:'POST',headers:{Origin:computer,Cookie:session.cookie,'Content-Type':'application/json'},body:JSON.stringify({description})});assert.equal(submitted.status,200);
const login=await fetch(backend+'/api/login',{method:'POST',headers:{Origin:backend,'Content-Type':'application/json'},body:JSON.stringify({username:'founder',password:secrets.FOUNDER_PASSWORD})});assert.equal(login.status,200);
const cookie=login.headers.get('set-cookie').split(';')[0];
try{
 const inbox=await(await fetch(backend+'/api/team/cases',{headers:{Cookie:cookie}})).json();
 const found=inbox.cases.find(c=>c.id===incident.id);assert.ok(found);assert.equal(found.logs.length,1);
 const log=found.logs[0];assert.equal(log.id,incident.checkpoint.requestId);assert.equal(log.status,404);assert.equal(log.details.route,'/api/agents/:id');assert.equal(log.details.origin,'computer-server-signed-response');
 assert.equal(found.source.repository,'Yevanchen/mosoo-computer');
 console.log(JSON.stringify({ok:true,caseId:incident.id,requestId:log.id,status:log.status,route:log.details.route,evidenceOrigin:log.details.origin,modelCalls:0,limitations:'Read-only API acceptance; not a native browser screenshot or Luna diagnosis.'}));
}finally{await fetch(backend+'/api/logout',{method:'POST',headers:{Origin:backend,Cookie:cookie,'Content-Type':'application/json'},body:'{}'});}
