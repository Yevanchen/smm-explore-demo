import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeCheckpoint, sameOrigin, equalSecret } from '../src/security.mjs';
import { exportReport } from '../src/report.mjs';
test('checkpoint excludes arbitrary URLs, tokens, content and untrusted user identity',()=>{
  const c=sanitizeCheckpoint({url:'https://test/?token=secret',cookies:'secret',userId:'another-user',prompt:'private',viewport:{width:999999,height:-1},requestId:'invalid'});
  assert.equal(c.viewport.width,20000);assert.equal(c.viewport.height,0);assert.equal(c.requestId,null);
  for(const name of ['url','cookies','userId','prompt'])assert.equal(c[name],undefined);
});
test('mutating requests require exact matching origin',()=>{
  assert.equal(sameOrigin(new Request('https://smm.example/api/login',{headers:{Origin:'https://evil.example'}})),false);
  assert.equal(sameOrigin(new Request('https://smm.example/api/login',{headers:{Origin:'https://smm.example'}})),true);
  assert.equal(sameOrigin(new Request('https://smm.example/api/login')),false);
});
test('missing credentials never authenticate',async()=>{assert.equal(await equalSecret(undefined,undefined),false);assert.equal(await equalSecret('wrong','correct'),false);assert.equal(await equalSecret('correct','correct'),true);});
test('controlled export failure is caused by the actual date contract',()=>{
  const start=Date.parse('2026-09-01T00:00:00Z'),end=Date.parse('2026-09-22T00:00:00Z');
  assert.equal(exportReport({start,end}).code,'TIMESTAMP_UNIT_MISMATCH');
  assert.equal(exportReport({start:start/1000,end:end/1000}).status,200);
  assert.equal(exportReport({start:'foo',end}).status,422);
});
