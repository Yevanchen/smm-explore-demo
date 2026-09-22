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

test('structured developer summary is preserved without leaking it into customer text',()=>{
 const summary={intent:'截图核对',observedEvidence:['8 results'],missingEvidence:['No logs']};
 const result=parseDiagnosis(JSON.stringify({customerMessage:'截图显示 8 个 Agent。',developerSummary:summary,confidence:'confirmed'}));
 assert.deepEqual(JSON.parse(result.developerSummary),summary);
 assert.equal(result.customerMessage,'截图显示 8 个 Agent。');
 assert.equal(parseDiagnosis(JSON.stringify({customerMessage:'hello',developerSummary:[],confidence:'confirmed'})),null);
});
