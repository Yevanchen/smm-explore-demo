import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const code = readFileSync(new URL('../src/report.mjs', import.meta.url), 'utf8');
const sha256 = createHash('sha256').update(code).digest('hex');
let commit=null;
try {
  commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
  const committed=execFileSync('git',['show',`${commit}:src/report.mjs`],{encoding:'utf8'});
  if(committed!==code)throw new Error('Source differs from committed report endpoint');
} catch(error) { throw new Error('Commit the report endpoint before building its traceable source snapshot.',{cause:error}); }
writeFileSync(new URL('../src/report-source.mjs', import.meta.url), `export const source = ${JSON.stringify({ path:'src/report.mjs',sha256,origin:'private-repository-build-snapshot',repository:'Yevanchen/smm-explore-demo',commit,code })};\n`);
