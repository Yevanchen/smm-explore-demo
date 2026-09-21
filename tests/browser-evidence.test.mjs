import {readFileSync} from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {originOf,networkEvidence} from '../capture-extension/policy.mjs';
import {sanitizeBrowserEvidence} from '../src/browser-evidence.mjs';
test('capture policy rejects unrelated origins and strips all URL queries and headers',()=>{
 assert.equal(originOf('https://example.com'),null);
 assert.equal(originOf('https://smm-explore-demo.evanchen.workers.dev.evil.example'),null);
 assert.equal(networkEvidence({url:'https://example.com/api/reports/export',status:422},'http://localhost:8794'),null);
 const e=networkEvidence({url:'http://localhost:8794/api/reports/export?token=secret',status:422,headers:{authorization:'secret'},protocol:'h2'},'http://localhost:8794');
 assert.equal(e.path,'/api/reports/export');assert.equal(JSON.stringify(e).includes('secret'),false);
});
test('browser evidence rejects non-image and oversized attachments',()=>{
 const fixture={source:'chrome-debugger-extension',image:readFileSync(new URL('./fixtures/synthetic-transport.jpg',import.meta.url)).toString('base64'),mimeType:'image/jpeg',capturedAt:new Date().toISOString(),viewport:{width:1200,height:800},network:[]};
 assert.deepEqual(sanitizeBrowserEvidence(fixture).metadata.imageSize,{width:8,height:8});
 assert.equal(sanitizeBrowserEvidence({...fixture,image:'/9j/AA=='}),null);
 assert.equal(sanitizeBrowserEvidence({...fixture,image:fixture.image.slice(0,-8)}),null);
 assert.equal(sanitizeBrowserEvidence({...fixture,image:'<script>evil</script>'}),null);
 assert.equal(sanitizeBrowserEvidence({...fixture,image:'a'.repeat(350001)}),null);
 assert.equal(sanitizeBrowserEvidence({...fixture,capturedAt:'2000-01-01'}),null);
});
