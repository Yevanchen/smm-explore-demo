// In-memory SQL and fake transport; these tests make NO model or network calls.
import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import worker from '../src/worker.mjs';
import {digest,token} from '../src/security.mjs';
async function setup(){
 const db=new DatabaseSync(':memory:');
 for(const name of ['0001.sql','0002_diagnosis.sql','0003_browser_evidence.sql'])db.exec(readFileSync(new URL('../migrations/'+name,import.meta.url),'utf8'));
 const env={DB:{prepare(sql){const statement=db.prepare(sql);return {bind(...args){return {first:async()=>statement.get(...args)||null,all:async()=>({results:statement.all(...args)}),run:async()=>({meta:statement.run(...args)})};}}}},AGENT_CALLS_ENABLED:'true',MOSOO_API_BASE:'https://mock.invalid/api/v1',MOSOO_AGENT_ID:'test-agent',MOSOO_API_TOKEN:'test-only',SMM_MCP_SECRET:'test-only-mcp',BUILD_VERSION:'test'};
 const cookies={};
 for(const [user,role,tenant]of [['owner','user','one'],['other','user','one'],['founder','developer','one'],['outsider','developer','two']]){
  const value=token();cookies[user]=`smm_session=${value}`;
  db.prepare('INSERT INTO sessions VALUES(?,?,?,?,?)').run(await digest(value),user,tenant,role,Math.floor(Date.now()/1000)+3600);
 }
 const call=(path,user='owner',data)=>worker.fetch(new Request('https://smm.test'+path,{method:data?'POST':'GET',headers:{Origin:'https://smm.test',Cookie:cookies[user]||'','Content-Type':'application/json'},...(data?{body:JSON.stringify(data)}:{})}),env);
 return {db,env,call};
}
test('image ownership and developer tenant boundaries are enforced',async()=>{
 const {db,call}=await setup();
 try{
  const c=await (await call('/api/cases','owner',{checkpoint:{},description:'Synthetic test'})).json();
  const route=`/api/cases/${c.id}`;
  const fixture={source:'chrome-debugger-extension',mimeType:'image/jpeg',image:readFileSync(new URL('./fixtures/synthetic-transport.jpg',import.meta.url)).toString('base64'),capturedAt:new Date().toISOString(),viewport:{width:8,height:8},network:[]};
  assert.equal((await call(route+'/evidence','owner',fixture)).status,201);
  assert.equal((await call(route+'/image','other')).status,404);
  assert.equal((await call(route+'/image','outsider')).status,404);
  assert.equal((await call(route+'/evidence','other',fixture)).status,404);
  assert.equal((await call(route+'/image','owner')).status,200);
  assert.equal((await call(route+'/image','founder')).status,200);
 }finally{db.close();}
});
test('retry preserves exact request and capability; final output excludes developer details and revokes access',async()=>{
 const {db,env,call}=await setup(),originalFetch=globalThis.fetch,requests=[];
 let attempts=0;
 globalThis.fetch=async(url,options)=>{
  assert.ok(String(url).startsWith('https://mock.invalid/'));
  if(options.method==='POST'){
   requests.push({body:options.body,key:options.headers['Idempotency-Key']});attempts++;
   return attempts===1?Response.json({error:'synthetic transient failure'},{status:503}):Response.json({thread:{id:'test-thread'}});
  }
  return Response.json({run:{status:'completed',finalOutput:{text:JSON.stringify({customerMessage:'测试用户解释',developerSummary:'INTERNAL_TEST_DETAILS',confidence:'confirmed'})}}});
 };
 try{
  const c=await (await call('/api/cases','owner',{checkpoint:{},description:'Synthetic diagnosis'})).json();const route=`/api/cases/${c.id}`;
  assert.equal((await call(route+'/start','owner',{})).status,502);
  assert.equal((await call(route+'/start','owner',{})).status,200);
  assert.deepEqual(requests[0],requests[1]);
  assert.equal((await call(route+'/start','owner',{})).status,200);assert.equal(requests.length,2);
  const capability=JSON.parse(requests[0].body).input.content[0].text.match(/Diagnostic capability: ([a-f0-9-]{72})/)[1];
  const tool=()=>worker.fetch(new Request('https://smm.test/mcp',{method:'POST',headers:{Authorization:'Bearer test-only-mcp','Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'read_incident_checkpoint',arguments:{capability}}})}),env);
  assert.equal((await (await tool()).json()).result.isError,undefined);
  const result=await (await call(route+'/events')).json();
  assert.equal(result.status,'completed');assert.equal(result.customerMessage,'测试用户解释');assert.equal(JSON.stringify(result).includes('INTERNAL_TEST_DETAILS'),false);
  assert.equal((await (await tool()).json()).result.isError,true);
 }finally{globalThis.fetch=originalFetch;db.close();}
});

// Cost protection must reserve globally before any external request.
test('one-event limit rejects another case while allowing the original idempotent retry',async()=>{
 const {db,env,call}=await setup(),originalFetch=globalThis.fetch;env.AGENT_CASE_LIMIT='1';let starts=0;
 globalThis.fetch=async()=>{starts++;return Response.json({thread:{id:'bounded-test-thread'}});};
 try{
  const a=await(await call('/api/cases','owner',{checkpoint:{}})).json();
  const b=await(await call('/api/cases','owner',{checkpoint:{}})).json();
  assert.equal((await call(`/api/cases/${a.id}/start`,'owner',{})).status,200);
  assert.equal((await call(`/api/cases/${b.id}/start`,'owner',{})).status,429);
  assert.equal((await call(`/api/cases/${a.id}/start`,'owner',{})).status,200);
  assert.equal(starts,1);
 }finally{globalThis.fetch=originalFetch;db.close();}
});
test('Computer service integration validates secret, isolates owners and does not attach fixture evidence',async()=>{
 const {db,env}=await setup();env.SMM_COMPUTER_SECRET='integration-test-only';
 const internal=(path,user,body,secret='integration-test-only')=>worker.fetch(new Request('https://smm.test/internal/computer'+path,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+secret,'x-smm-user-id':user,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})}),env);
 try{
  assert.equal((await internal('/cases','owner',{},'bad')).status,401);
  const response=await internal('/cases','owner',{checkpoint:{computer:{page:'agents',hasError:true},requestId:'a'.repeat(36)}});assert.equal(response.status,201);const c=await response.json();
  assert.equal(c.checkpoint.title,'Mosoo Computer');assert.equal(c.checkpoint.route,'agents');assert.equal(c.checkpoint.requestId,null);
  assert.equal((await internal(`/cases/${c.id}`,'other')).status,404);
  assert.equal((await internal('/team/cases','owner')).status,404);
 }finally{db.close();}
});
