// Local-only synthetic transport fixture; this does NOT validate real Chrome capture.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const base='http://localhost:8794';
const vars=Object.fromEntries(readFileSync('.dev.vars','utf8').trim().split('\n').map(line=>{const i=line.indexOf('=');return [line.slice(0,i),JSON.parse(line.slice(i+1))];}));
const request=(path,cookie,data)=>fetch(base+path,{method:data?'POST':'GET',headers:{Origin:base,...(cookie?{Cookie:cookie}:{}),'Content-Type':'application/json'},...(data?{body:JSON.stringify(data)}:{})});
const login=await request('/api/login',null,{username:'demo',password:vars.DEMO_PASSWORD});assert.equal(login.status,200);const cookie=login.headers.get('set-cookie').split(';')[0];
const incident=await (await request('/api/cases',cookie,{checkpoint:{},description:'LOCAL SYNTHETIC CAPTURE TRANSPORT TEST'})).json();
const path=`/api/cases/${incident.id}`;
assert.equal((await request(path+'/evidence',cookie,{image:'not-jpeg'})).status,400);
const fixture={source:'chrome-debugger-extension',mimeType:'image/jpeg',image:readFileSync('tests/fixtures/synthetic-transport.jpg').toString('base64'),capturedAt:new Date().toISOString(),viewport:{width:100,height:100},network:[{path:'/api/reports/export',status:422,requestId:'11111111-1111-1111-1111-111111111111',protocol:'h2'}]};
assert.equal((await request(path+'/evidence',cookie,fixture)).status,201);
assert.equal((await request(path+'/evidence',cookie,fixture)).status,409);
assert.equal((await request(path+'/image',null)).status,401);
const saved=await (await request(path,cookie)).json();assert.deepEqual(saved.browserEvidence.network,[]);
const image=await request(path+'/image',cookie);assert.equal(image.status,200);assert.equal(image.headers.get('content-type'),'image/jpeg');assert.equal(image.headers.get('cache-control'),'no-store');
await request('/api/logout',cookie,{});
console.log('PASS: invalid capture rejection, immutable attachment, anonymous access denial, unrelated request filtering, private image response. Synthetic local fixture only.');
