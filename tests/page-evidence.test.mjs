import test from 'node:test';
import assert from 'node:assert/strict';
import {sanitizePageEvidence} from '../src/page-evidence.mjs';
import {createRecorder} from '../public/recorder.js';
test('page recorder expires old events and freezes independent checkpoints',()=>{
  let time=0;const recorder=createRecorder({clock:()=>time,limit:2});
  recorder.record({type:'action',action:'export-report'});const frozen=recorder.snapshot();
  time=61000;recorder.record({type:'error',code:'uncaught_error'});
  assert.equal(recorder.snapshot().length,1);assert.equal(frozen[0].action,'export-report');
  recorder.clear();assert.equal(recorder.snapshot().length,0);
});
test('server strips input, headers, raw DOM and arbitrary event strings',()=>{
  const at=Date.now();const result=sanitizePageEvidence({html:'secret',state:{view:'reports',input:'secret'},events:[{at,type:'action',action:'export-report',value:'secret'},{at,type:'request',path:'/api/reports/export',status:422,headers:{authorization:'secret'},body:'secret'},{at,type:'error',code:'secret'},{at:0,type:'action',action:'export-report'}]},at);
  assert.equal(result.events.length,2);assert.equal(JSON.stringify(result).includes('secret'),false);
});
