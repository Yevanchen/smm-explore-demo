const $=id=>document.getElementById(id);
async function api(path,body){const r=await fetch(path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});const data=await r.json();if(!r.ok)throw Error(data.message||'请求失败');return data;}
function el(tag,value){const n=document.createElement(tag);n.textContent=value;return n;}
const statuses={captured:'尚未启动',starting:'正在启动',investigating:'调查中',completed:'已完成',needs_review:'需要人工检查',unavailable:'启动失败'};
function renderResult(details,result,status,error){
 if(!result){details.append(el('p',error||(status==='investigating'?'Agent 正在查看证据，请稍候。':status==='starting'?'正在连接 Agent。':'尚未启动调查。')));return;}
 details.append(el('p',result.customerMessage));
 let summary=result.developerSummary;
 try{summary=JSON.parse(summary);}catch{}
 if(summary&&typeof summary==='object'){
  const names={intent:'用户意图',request:'用户诉求',observedEvidence:'已观察到的证据',missingEvidence:'缺失的证据',suggestedNextStep:'建议下一步'};
  for(const [key,value]of Object.entries(summary)){details.append(el('h4',names[key]||key));if(Array.isArray(value)){const list=el('ul','');for(const item of value)list.append(el('li',String(item)));details.append(list);}else details.append(el('p',String(value)));}
 }else details.append(el('p',summary||''));
}
async function load(){
 const me=await api('/api/me');if(me.role!=='developer')throw Error('请使用开发者账号登录');
 $('admin-login').hidden=true;$('admin-workspace').hidden=false;
 const {cases}=await api('/api/team/cases');
 const previous=new Set([...document.querySelectorAll('details[data-key]')].map(d=>d.dataset.key));
 const expanded=new Set([...document.querySelectorAll('details[open][data-key]')].map(d=>d.dataset.key));
 $('inbox').replaceChildren();if(!cases.length)$('inbox').append(el('p','还没有来自 Mosoo Computer 的反馈。'));
 for(const c of cases){
  const article=el('article','');article.className='record';
  let structured;try{structured=JSON.parse(c.diagnosis?.developerSummary||'null');}catch{}
  const title=typeof structured?.request==='string'?structured.request:c.description;
  article.id='ticket-'+c.id;
  article.append(el('h3',title.length>100?title.slice(0,100)+'…':title),el('small',`${c.id.slice(0,8).toUpperCase()} · ${c.scope==='explore'?'Explore':'历史调查'} ${statuses[c.status]||c.status} · ${new Date(c.createdAt).toLocaleString()}`));
  const original=el('details','');original.append(el('summary','用户原文'),el('p',c.description));article.append(original);
  const sourceStatus=c.scope==='explore'?c.sourceReview?.status:c.status;
  const start=el('button',sourceStatus==='investigating'?'源码调查中':'启动源码调查');
  start.disabled=['starting','investigating','completed','needs_review'].includes(sourceStatus);
  const error=el('p','');error.setAttribute('role','status');
  start.onclick=async()=>{start.disabled=true;try{await api(`/api/team/cases/${c.id}/start`,{});await load();}catch(e){error.textContent=e.message;start.disabled=false;}};
  article.append(start,error);
  for(const name of ['浏览器现场','Explore 结果','源码调查','服务端日志','源码']){
   const d=el('details','');d.dataset.key=c.id+name;d.open=expanded.has(d.dataset.key)||(!previous.has(d.dataset.key)&&name==='浏览器现场'&&c.hasScreenshot);d.append(el('summary',name));
   if(name==='浏览器现场'){
    if(c.hasScreenshot){const image=el('img','');image.src=`/api/cases/${c.id}/image`;image.alt='用户授权分享的浏览器现场截图';image.loading='lazy';image.className='incident-screenshot';const full=el('a','查看原图');full.href=image.src;full.target='_blank';full.rel='noopener';image.onerror=()=>{image.hidden=true;full.textContent='截图暂时无法加载，点击重试';};d.append(image,full,el('p','用户授权的真实浏览器截图，与这条反馈绑定。'));}else d.append(el('p','未收到截图；Agent 需要时会向在线用户请求授权。'));
    const metadata=el('details','');metadata.append(el('summary','初始页面上下文'),el('pre',JSON.stringify(c.checkpoint,null,2)));d.append(metadata);
   }else if(name==='Explore 结果')renderResult(d,c.diagnosis,c.status,c.agentError);
   else if(name==='源码调查')renderResult(d,c.scope==='explore'?c.sourceReview?.diagnosis:c.diagnosis,c.scope==='explore'?c.sourceReview?.status:c.status,c.scope==='explore'?c.sourceReview?.error:c.agentError);
   else if(name==='服务端日志'){if(c.logs.length){for(const log of c.logs){d.append(el('h4',log.details.origin==='cloudflare-tail-worker'?'Cloudflare 执行日志':'服务端响应凭据'),el('pre',JSON.stringify(log,null,2)));}if(!c.logs.some(log=>log.details.origin==='cloudflare-tail-worker'))d.append(el('p','尚未收到对应的 Cloudflare 执行日志；历史请求不会补采，日志也可能延迟送达。'));}else d.append(el('p','这条反馈没有关联到可验证的失败请求。不会扩大范围读取其他用户日志；空记录不代表服务端没有错误。'));}
   else d.append(el('pre',JSON.stringify(c.source,null,2)));
   article.append(d);
  }
  $('inbox').append(article);
 }
}
$('admin-form').onsubmit=async event=>{event.preventDefault();try{await api('/api/login',{username:'founder',password:new FormData(event.target).get('password')});await load();}catch(e){$('login-message').textContent=e.message;}};
$('admin-logout').onclick=async()=>{await api('/api/logout',{});location.reload();};
load().catch(()=>{});
setInterval(()=>{if(!document.hidden&&!$('admin-workspace').hidden)load().catch(e=>{$('admin-message').textContent=e.message;});},10000);
