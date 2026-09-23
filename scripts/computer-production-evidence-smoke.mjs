// Run only after the Computer release. Uses a legitimate temporary release session.
// The failed request is real and read-only; resulting feedback is explicitly an acceptance test.
import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const session=JSON.parse(readFileSync(process.env.RELEASE_SESSION_FILE||'/tmp/smm-release-session.json','utf8'));
const secrets=Object.fromEntries(readFileSync('.dev.vars','utf8').trim().split('\n').filter(Boolean).map(line=>{const i=line.indexOf('=');return[line.slice(0,i),JSON.parse(line.slice(i+1))]}));
const computer='https://computer.mosoo.ai',backend='https://smm-explore-demo.evanchen.workers.dev';
const request=await fetch(computer+'/api/agents/smm-acceptance-missing-'+crypto.randomUUID(),{headers:{Cookie:session.cookie}});
assert.equal(request.status,404,'Expected a read-only missing resource response');
const requestEvidence=request.headers.get('x-mosoo-support-evidence');assert.ok(requestEvidence,'New Computer evidence release is not active');
const description='[验收测试] 只读查询不存在的 Agent 得到真实 404。请读取当前事件的 Cloudflare 执行日志与响应凭据，说明它们的关联；这是日志接入验收，不是真实客户故障，不需要截图或源码调查。';
const response=await fetch(computer+'/api/support/cases',{method:'POST',headers:{Origin:computer,Cookie:session.cookie,'Content-Type':'application/json'},body:JSON.stringify({description,checkpoint:{computer:{page:'agents',hasError:true},capturedAt:new Date().toISOString(),requestEvidence}})});
assert.equal(response.status,201);const incident=await response.json();assert.ok(incident.checkpoint.requestId);
const submitted=await fetch(computer+`/api/support/cases/${incident.id}/submit`,{method:'POST',headers:{Origin:computer,Cookie:session.cookie,'Content-Type':'application/json'},body:JSON.stringify({description})});assert.equal(submitted.status,200);
const login=await fetch(backend+'/api/login',{method:'POST',headers:{Origin:backend,'Content-Type':'application/json'},body:JSON.stringify({username:'founder',password:secrets.FOUNDER_PASSWORD})});assert.equal(login.status,200);
const cookie=login.headers.get('set-cookie').split(';')[0];
try{
 let found;for(let attempt=0;attempt<15;attempt++){
  const inbox=await(await fetch(backend+'/api/team/cases',{headers:{Cookie:cookie}})).json();found=inbox.cases.find(c=>c.id===incident.id);
  if(found?.logs.some(log=>log.details.origin==='cloudflare-tail-worker'))break;
  await new Promise(resolve=>setTimeout(resolve,1000));
 }
 assert.ok(found);
 const cloudflare=found.logs.find(log=>log.details.origin==='cloudflare-tail-worker');assert.ok(cloudflare,'Cloudflare Tail delivery missing');assert.equal(cloudflare.id,incident.checkpoint.requestId);assert.equal(cloudflare.status,404);
 const log=found.logs.find(log=>log.details.origin==='computer-server-signed-response');assert.equal(log.id,incident.checkpoint.requestId);assert.equal(log.status,404);assert.equal(log.details.route,'/api/agents/:id');assert.equal(log.details.origin,'computer-server-signed-response');
 assert.equal(found.source.repository,'Yevanchen/mosoo-computer');
 const proof={ok:true,caseId:incident.id,requestId:log.id,status:log.status,route:log.details.route,evidenceOrigin:log.details.origin,cloudflare,autoExploreRequested:true,limitations:'Real Cloudflare Tail delivery verified. Model completion and native browser capture are separate checks.'};
 writeFileSync('/tmp/smm-cloudflare-acceptance.json',JSON.stringify(proof,null,2),{mode:0o600});console.log(JSON.stringify(proof));
}finally{await fetch(backend+'/api/logout',{method:'POST',headers:{Origin:backend,Cookie:cookie,'Content-Type':'application/json'},body:'{}'});}
