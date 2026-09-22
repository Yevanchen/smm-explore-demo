import {readFileSync} from 'node:fs';
const secrets=Object.fromEntries(readFileSync('.dev.vars','utf8').trim().split('\n').map(l=>{const i=l.indexOf('=');return [l.slice(0,i),JSON.parse(l.slice(i+1))]}));
const base='https://smm-explore-demo.evanchen.workers.dev';
const login=await fetch(base+'/api/login',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({username:'demo',password:secrets.DEMO_PASSWORD})});
if(!login.ok)throw Error('Login '+login.status);
const cookie=login.headers.get('set-cookie').split(';')[0],id=process.argv[2];
const r=await fetch(`${base}/api/cases/${id}/events`,{headers:{Cookie:cookie}});console.log(await r.text());
await fetch(base+'/api/logout',{method:'POST',headers:{Origin:base,Cookie:cookie,'Content-Type':'application/json'},body:'{}'});
