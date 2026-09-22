import test from 'node:test';
import assert from 'node:assert/strict';
import {selectComputerSource} from '../src/computer-source.mjs';
const snapshot={commit:'verified-release',repository:'private/product',pages:{agents:[{path:'src/client.tsx',code:'test-only source'}]}};
test('Computer source requires a matching recorded revision and exact configured page',()=>{
 assert.equal(selectComputerSource({route:'agents'},snapshot).status,'unavailable');
 assert.equal(selectComputerSource({route:'agents',sourceRevision:'old-release'},snapshot).status,'unavailable');
 for(const route of ['../../secrets','settings','__proto__'])assert.equal(selectComputerSource({route,sourceRevision:snapshot.commit},snapshot).status,'unavailable');
 const r=selectComputerSource({route:'agents',sourceRevision:snapshot.commit},snapshot);
 assert.equal(r.status,'available');assert.deepEqual(r.files,snapshot.pages.agents);
});
