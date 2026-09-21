import test from 'node:test';
import assert from 'node:assert/strict';
import {parseDiagnosis} from '../src/diagnosis.mjs';
test('malformed or capability-bearing output is withheld from the customer',()=>{
 assert.equal(parseDiagnosis('investigation completed'),null);
 assert.equal(parseDiagnosis(JSON.stringify({customerMessage:'a'.repeat(72),developerSummary:'internal',confidence:'confirmed'})),null);
 assert.equal(parseDiagnosis(JSON.stringify({customerMessage:'hello',confidence:'confirmed'})),null);
});
test('separate customer and developer fields survive structured output',()=>{
 const result=parseDiagnosis('```json\n'+JSON.stringify({customerMessage:'已找到导出失败的原因。',developerSummary:'Endpoint expects Unix seconds.',confidence:'confirmed'})+'\n```');
 assert.equal(result.customerMessage,'已找到导出失败的原因。');
 assert.equal(result.confidence,'confirmed');
});
