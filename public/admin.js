const $=id=>document.getElementById(id);
async function api(path,body){const r=await fetch(path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});const data=await r.json();if(!r.ok)throw Error(data.message||'请求失败');return data;}
function el(tag,value,className){const n=document.createElement(tag);if(value!=null)n.textContent=value;if(className)n.className=className;return n;}
function icon(name){
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('fill','none');svg.setAttribute('stroke','currentColor');svg.setAttribute('stroke-width','1.6');svg.setAttribute('stroke-linecap','round');svg.setAttribute('stroke-linejoin','round');svg.setAttribute('aria-hidden','true');
 const path=document.createElementNS('http://www.w3.org/2000/svg','path');
 path.setAttribute('d',{camera:'M4 8.5A2.5 2.5 0 0 1 6.5 6H8l1.2-2h5.6L16 6h1.5A2.5 2.5 0 0 1 20 8.5v8a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5v-8Zm8 8a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z',back:'M15 5l-7 7 7 7'}[name]);
 svg.append(path);return svg;
}
function chip(label,tone){return el('span',label,'status-chip'+(tone?' '+tone:''));}
function shortId(id){return id.slice(0,8).toUpperCase();}
function fmtTime(value){const d=new Date(value);return Number.isNaN(d.getTime())?String(value):d.toLocaleString('zh-CN',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});}
function fullTime(value){const d=new Date(value);return Number.isNaN(d.getTime())?String(value):d.toLocaleString('zh-CN');}
function pre(value,code){const n=el('pre',typeof value==='string'?value:JSON.stringify(value,null,2));if(code)n.className='code';return n;}
function disclosure(label,...children){const d=el('details');d.append(el('summary',label),...children);return d;}
function defs(rows){const dl=el('dl',null,'defs');for(const [k,v] of rows){if(v==null||v==='')continue;dl.append(el('dt',k));const dd=el('dd');if(v instanceof Node)dd.append(v);else dd.textContent=String(v);dl.append(dd);}return dl;}
function mono(value,title){const c=el('code',value);if(title)c.title=title;return c;}

const STATUS={captured:'尚未启动',starting:'正在启动',investigating:'调查中',completed:'已完成',needs_review:'需要人工检查',unavailable:'启动失败'};
const TONE={needs_review:'amber',unavailable:'ember'};
const FILTERS=[['all','全部',()=>true],['active','调查中',c=>['starting','investigating'].includes(c.status)],['completed','已完成',c=>c.status==='completed'],['needs_review','需要人工',c=>c.status==='needs_review'],['idle','未启动',c=>['captured','unavailable'].includes(c.status)]];
const SUMMARY_NAMES={intent:'用户意图',request:'用户诉求',observedEvidence:'已观察到的证据',missingEvidence:'缺失的证据',suggestedNextStep:'建议下一步'};
const CONFIDENCE={confirmed:'已确认',high:'高',medium:'中',low:'低',needs_review:'需要人工复核'};
const state={cases:null,loadError:'',selected:null,filter:'all',query:'',renderedDetail:'',view:'inbox',focusDetail:false};
// Re-renders replace DOM nodes; keep keyboard focus on the equivalent control.
function keepFocus(render){
 const active=document.activeElement,id=active?.dataset?.id,filter=active?.closest?.('#ticket-filters')?[...active.parentNode.children].indexOf(active):-1;
 render();
 if(id)document.querySelector(`.ticket[data-id="${id}"]`)?.focus();
 else if(filter>=0)$('ticket-filters').children[filter]?.focus();
}

function statusChip(status){return chip(STATUS[status]||status,TONE[status]);}
function titleOf(c){let structured;try{structured=JSON.parse(c.diagnosis?.developerSummary||'null');}catch{}return (typeof structured?.request==='string'&&structured.request)||c.description||'已保存的现场';}

/* ---------- routing ---------- */
function route(){
 const hash=location.hash.slice(1);
 const caseMatch=hash.match(/^case\/([a-f0-9-]{36})$/);
 state.view=hash==='connection'?'connection':'inbox';
 state.selected=caseMatch?caseMatch[1]:null;
 $('inbox-view').hidden=state.view!=='inbox';$('connection-view').hidden=state.view!=='connection';
 document.querySelectorAll('.topbar nav a').forEach(a=>{if(a.dataset.view===state.view)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
 $('inbox-view').classList.toggle('has-selection',!!state.selected);
 keepFocus(()=>{renderList();renderDetail();});
 if(state.focusDetail){state.focusDetail=false;document.querySelector('.detail-head h2')?.focus();}
}
function select(id,focusDetail){state.focusDetail=!!(id&&focusDetail);location.hash=id?`case/${id}`:'inbox';}

/* ---------- list ---------- */
function visibleCases(){
 const test=FILTERS.find(f=>f[0]===state.filter)?.[2]||(()=>true),q=state.query.trim().toLowerCase();
 return (state.cases||[]).filter(test).filter(c=>!q||titleOf(c).toLowerCase().includes(q)||(c.description||'').toLowerCase().includes(q)||c.id.toLowerCase().includes(q)||shortId(c.id).toLowerCase().includes(q));
}
function renderFilters(){
 const wrap=$('ticket-filters');wrap.replaceChildren();
 for(const [key,label,test] of FILTERS){
  const n=(state.cases||[]).filter(test).length;
  const b=el('button',key==='all'?label:`${label} ${n}`);b.type='button';b.setAttribute('aria-pressed',String(state.filter===key));b.disabled=!state.cases;
  b.onclick=()=>{state.filter=key;renderFilters();renderList();};
  wrap.append(b);
 }
}
function renderList(){
 const list=$('ticket-list');list.replaceChildren();
 if(state.loadError&&!state.cases){const box=el('div',null,'list-error');box.append(el('strong','收件箱暂时无法加载'),el('span',state.loadError));const retry=el('button','重试','secondary');retry.type='button';retry.onclick=()=>load();box.append(retry);list.append(box);$('inbox-count').textContent='';return;}
 if(!state.cases){for(let i=0;i<4;i++){const li=el('li',null,'skeleton-row');li.setAttribute('aria-hidden','true');li.append(el('span'),el('span'));list.append(li);}list.setAttribute('aria-busy','true');$('inbox-count').textContent='加载中…';return;}
 list.removeAttribute('aria-busy');
 const cases=visibleCases();
 $('inbox-count').textContent=cases.length===state.cases.length?`${state.cases.length} 条`:`${cases.length} / ${state.cases.length} 条`;
 if(!cases.length){
  const box=el('div',null,'list-empty');
  if(!state.cases.length)box.append(el('strong','还没有来自 Mosoo Computer 的反馈。'),el('span','用户在 computer.mosoo.ai 的支持面板提交后，会立即出现在这里，并自动开始 Explore。'));
  else box.append(el('strong','没有符合条件的反馈。'),el('span','换一个筛选条件或清空搜索。'));
  list.append(box);return;
 }
 for(const c of cases){
  const li=el('li');const b=el('button',null,'ticket');b.type='button';b.dataset.id=c.id;
  if(state.selected===c.id)b.setAttribute('aria-current','true');
  const meta=el('span',null,'ticket-meta');
  meta.append(mono(shortId(c.id),c.id),statusChip(c.status));
  if(c.hasScreenshot){const mark=el('span',null,'ticket-mark');mark.append(icon('camera'),el('span','截图'));mark.title='用户授权分享了浏览器截图';meta.append(mark);}
  if(c.scope!=='explore')meta.append(el('span','历史调查'));
  const time=el('time',fmtTime(c.createdAt));time.dateTime=c.createdAt;time.title=fullTime(c.createdAt);meta.append(time);
  b.append(el('span',titleOf(c),'ticket-title'),meta);
  b.onclick=()=>select(c.id,matchMedia('(max-width: 820px)').matches);
  li.append(b);list.append(li);
 }
}
$('ticket-list').addEventListener('keydown',e=>{
 if(!['ArrowDown','ArrowUp','Home','End'].includes(e.key))return;
 const items=[...document.querySelectorAll('.ticket')],i=items.indexOf(document.activeElement);if(i<0)return;
 e.preventDefault();
 const next=e.key==='ArrowDown'?Math.min(i+1,items.length-1):e.key==='ArrowUp'?Math.max(i-1,0):e.key==='Home'?0:items.length-1;
 items[next].focus();
});
$('ticket-search').addEventListener('input',e=>{state.query=e.target.value;renderList();});

/* ---------- detail ---------- */
function renderResult(result,status,error){
 const box=el('div',null,'result-block');
 if(!result){box.append(el('p',error||(status==='investigating'?'Agent 正在查看证据，请稍候。':status==='starting'?'正在连接 Agent。':'尚未启动调查。')));return box;}
 box.append(el('p',result.customerMessage,'result-lead'));
 if(result.confidence)box.append(el('small',`Agent 自评置信度：${CONFIDENCE[result.confidence]||result.confidence}`));
 let summary=result.developerSummary;
 try{summary=JSON.parse(summary);}catch{}
 if(summary&&typeof summary==='object'){
  for(const [key,value] of Object.entries(summary)){box.append(el('h4',SUMMARY_NAMES[key]||key));if(Array.isArray(value)){const list=el('ul');for(const item of value)list.append(el('li',String(item)));box.append(list);}else box.append(el('p',String(value)));}
 }else if(summary){box.append(el('h4','开发者摘要'),el('p',String(summary)));}
 return box;
}
function ledgerRow(label,stateChip,...body){
 const row=el('div',null,'ledger-row');const head=el('div',null,'ledger-label');head.append(el('span',label),stateChip);
 const content=el('div',null,'ledger-body');content.append(...body);row.append(head,content);return row;
}
function screenshotRow(c){
 if(!c.hasScreenshot)return ledgerRow('浏览器截图',chip('未收到'),el('p','未收到截图；Agent 需要时会向在线用户请求授权，用户可以拒绝。'));
 const src=`/api/cases/${c.id}/image`;
 const figure=el('figure',null,'screenshot-figure');
 const link=el('a');link.href=src;link.target='_blank';link.rel='noopener';link.setAttribute('aria-label','在新标签页打开原图');
 const image=el('img');image.src=src;image.alt='用户授权分享的浏览器现场截图';image.loading='lazy';image.className='screenshot';
 const caption=el('figcaption');caption.append(el('span','用户授权的真实浏览器截图，与这条反馈绑定'),el('span','·'),el('a','在新标签页打开原图'));caption.lastChild.href=src;caption.lastChild.target='_blank';caption.lastChild.rel='noopener';
 image.onerror=()=>{const failed=el('div',null,'screenshot-failed');failed.append(el('span','截图暂时无法加载。'));const retry=el('button','重试','secondary');retry.type='button';retry.onclick=()=>{failed.replaceWith(link);image.src=src+'?retry='+Date.now();};failed.append(retry);link.replaceWith(failed);};
 link.append(image);figure.append(link,caption);
 return ledgerRow('浏览器截图',chip('已收到'),figure,el('p','截图晚于初始上下文采集，不是完整回放。','limits'));
}
function checkpointRow(c){
 const k=c.checkpoint||{};const page=k.pageEvidence||{};
 const rows=[['页面',k.route||k.title],['可见错误',k.observedError||(page.hasError===false?'页面 SDK 未报告错误':null)],['关联请求',k.requestId?mono(k.requestId):'无关联失败请求'],['视口',Number.isFinite(k.viewport?.width)&&Number.isFinite(k.viewport?.height)?`${k.viewport.width} × ${k.viewport.height}`:'未采集'],['时区',k.timezone],['浏览器',k.browser],['接收时间',k.receivedAt?fullTime(k.receivedAt):null],['证据类型',page.kind?`${page.source||''} · ${page.kind}`:null]];
 return ledgerRow('页面上下文',chip('已保存'),defs(rows),page.limitations?el('p',page.limitations,'limits'):el('span'),disclosure('原始 JSON',pre(k)));
}
function receiptRow(c){
 const log=(c.logs||[]).find(l=>l.details?.origin!=='cloudflare-tail-worker');
 if(!log)return ledgerRow('服务端响应凭据',chip('无'),el('p','这条反馈没有关联到可验证的失败请求。不会扩大范围读取其他用户日志；空记录不代表服务端没有错误。'));
 const d=log.details||{};
 return ledgerRow('服务端响应凭据',chip(`HTTP ${log.status}`),defs([['路由',d.method?`${d.method} ${d.route}`:d.route],['耗时',Number.isFinite(d.durationMs)?`${d.durationMs} ms`:null],['时间',fullTime(log.occurred_at)],['来源',d.origin],['请求 ID',mono(log.id)]]),d.limitations?el('p',d.limitations,'limits'):el('span'),disclosure('原始 JSON',pre(log)));
}
function cloudflareRow(c){
 const logs=c.logs||[],log=logs.find(l=>l.details?.origin==='cloudflare-tail-worker');
 if(!log){
  if(logs.length)return ledgerRow('Cloudflare 执行日志',chip('未收到'),el('p','尚未收到对应的 Cloudflare 执行日志；历史请求不会补采，日志也可能延迟送达。'));
  return ledgerRow('Cloudflare 执行日志',chip('无'),el('p','没有关联的失败请求，因此没有可对应的执行日志。'));
 }
 const d=log.details||{},outcome=d.outcome==='ok'?'正常完成':d.outcome==='exception'?'执行异常':d.outcome||'未知';
 return ledgerRow('Cloudflare 执行日志',chip(outcome,d.outcome&&d.outcome!=='ok'?'ember':null),defs([['Worker',d.worker],['路由',d.method?`${d.method} ${d.route}`:d.route],['状态',log.status],['异常数',d.exceptionCount],['耗时',Number.isFinite(d.durationMs)?`${d.durationMs} ms`:null],['时间',fullTime(log.occurred_at)],['请求 ID',mono(log.id)]]),d.limitations?el('p',d.limitations,'limits'):el('span'),disclosure('原始 JSON',pre(log)));
}
function sourceRow(c){
 const s=c.source||{};
 if(s.status!=='available')return ledgerRow('源码片段',chip('不可用'),el('p',s.reason||'没有为这条反馈配置源码快照。'));
 const files=(s.files||[]).map(f=>`${f.path}:${f.startLine}-${f.endLine}`).join('、');
 const body=[defs([['仓库',s.repository],['提交',mono(String(s.commit).slice(0,12),s.commit)],['Worker 版本',s.workerVersion],['核对时间',s.verifiedAt?fullTime(s.verifiedAt):null],['片段',files]]),s.limitations?el('p',s.limitations,'limits'):el('span')];
 for(const f of s.files||[])body.push(disclosure(`查看 ${f.path}:${f.startLine}-${f.endLine}`,el('small',`片段 sha256 ${f.sha256}`),pre(f.code,true)));
 return ledgerRow('源码片段',chip('只读发布快照'),...body);
}
function section(title,aside,...children){const s=el('section',null,'detail-section');const head=el('div',null,'section-head');head.append(el('h3',title));if(aside)head.append(aside);s.append(head,...children);return s;}
function renderDetail(){
 const pane=$('ticket-detail');
 const c=state.cases?.find(x=>x.id===state.selected);
 const key=c?JSON.stringify(c):state.selected?'missing':'none';
 if(key===state.renderedDetail)return;
 const expanded=new Set([...pane.querySelectorAll('details[open][data-key]')].map(d=>d.dataset.key));
 const scrollTop=pane.dataset.caseId===c?.id?pane.scrollTop:0;
 pane.dataset.caseId=c?.id||'';
 pane.replaceChildren();state.renderedDetail=key;
 if(!c){
  const p=el('div',null,'detail-placeholder');const inner=el('div');
  if(state.selected&&state.cases)inner.append(el('strong','找不到这条反馈'),el('span','它可能属于其他租户，或尚未提交。'));
  else inner.append(el('strong','选择一条反馈'),el('span','左侧列表按现场保存时间排序；详情里按来源逐项显示证据状态。'));
  p.append(inner);
  if(state.selected){const back=el('button','返回列表','ghost');back.type='button';back.onclick=()=>select(null);inner.append(el('div'),back);}
  pane.append(p);return;
 }
 const inner=el('div',null,'detail-inner');
 const back=el('button',null,'ghost detail-back');back.type='button';back.append(icon('back'),el('span','返回列表'));back.onclick=()=>{select(null);requestAnimationFrame(()=>document.querySelector(`.ticket[data-id="${c.id}"]`)?.focus());};
 const head=el('div',null,'detail-head');const h2=el('h2',titleOf(c));h2.tabIndex=-1;
 const meta=el('div',null,'detail-meta');
 const time=el('time',`现场保存于 ${fullTime(c.createdAt)}`);time.dateTime=c.createdAt;
 meta.append(mono(c.id),statusChip(c.status),chip(c.scope==='explore'?'自动 Explore':'历史调查'),time);
 if(c.checkpoint?.route)meta.append(el('span',`页面 ${c.checkpoint.route}`));
 head.append(h2,meta);
 inner.append(back,head);
 inner.append(section('用户原文',null,el('p',c.description||'（用户没有填写描述）','quote')));
 const ledger=el('div',null,'ledger');ledger.append(screenshotRow(c),checkpointRow(c),receiptRow(c),cloudflareRow(c),sourceRow(c));
 inner.append(section('证据',null,el('p','每一项都标明来源与是否真实收到；缺失即缺失，不会用样例数据补齐。','section-hint'),ledger));
 if(c.scope==='explore'){
  inner.append(section('Explore 结果',statusChip(c.status),el('p','用户侧自动调查：读取页面上下文、关联日志与授权截图，不读取源码。','section-hint'),renderResult(c.diagnosis,c.status,c.agentError)));
  const review=c.sourceReview,reviewStatus=review?.status;
  const actions=el('div',null,'review-actions');
  const start=el('button',reviewStatus==='investigating'||reviewStatus==='starting'?'源码调查中':reviewStatus==='completed'?'源码调查已完成':reviewStatus==='needs_review'?'等待人工复核':review?'重试源码调查':'启动源码调查');start.type='button';
  start.disabled=['starting','investigating','completed','needs_review'].includes(reviewStatus);
  const note=el('p');note.setAttribute('role','status');
  start.onclick=async()=>{start.disabled=true;note.textContent='';try{await api(`/api/team/cases/${c.id}/start`,{});await load();}catch(e){note.textContent=e.message;start.disabled=false;}};
  actions.append(start,note);
  inner.append(section('源码调查',review?statusChip(reviewStatus):chip('未启动'),el('p','仅开发者可启动，独立于 Explore；读取与该版本匹配的只读发布片段。','section-hint'),actions,review?renderResult(review.diagnosis,reviewStatus,review.error):el('p','尚未启动。启动后结果会单独显示在这里。','muted')));
 }else{
  const actions=el('div',null,'review-actions');
  const start=el('button',c.status==='investigating'?'调查中':'启动调查');start.type='button';
  start.disabled=['starting','investigating','completed','needs_review'].includes(c.status);
  const note=el('p');note.setAttribute('role','status');
  start.onclick=async()=>{start.disabled=true;note.textContent='';try{await api(`/api/team/cases/${c.id}/start`,{});await load();}catch(e){note.textContent=e.message;start.disabled=false;}};
  actions.append(start,note);
  inner.append(section('调查结果',statusChip(c.status),el('p','这条反馈使用旧的开发者调查范围，Explore 与源码调查未分离。','section-hint'),actions,renderResult(c.diagnosis,c.status,c.agentError)));
 }
 const raw=disclosure('完整记录（JSON）',pre(c));raw.dataset.key=c.id+':raw';
 inner.append(section('原始记录',null,raw));
 for(const d of inner.querySelectorAll('details')){if(!d.dataset.key)d.dataset.key=c.id+':'+d.querySelector('summary').textContent;d.open=expanded.has(d.dataset.key);}
 pane.append(inner);pane.scrollTop=scrollTop;
}

/* ---------- session + polling ---------- */
function showWorkspace(){$('admin-boot').hidden=true;$('admin-login').hidden=true;$('admin-workspace').hidden=false;}
function showLogin(){$('admin-boot').hidden=true;$('admin-workspace').hidden=true;$('admin-login').hidden=false;}
async function load(){
 try{const {cases}=await api('/api/team/cases');state.cases=cases;state.loadError='';}
 catch(e){state.loadError=e.message;}
 keepFocus(()=>{renderFilters();renderList();renderDetail();});
 if(state.loadError&&state.cases)$('inbox-count').textContent='刷新失败，显示上次结果';
}
async function boot(){
 try{const me=await api('/api/me');if(me.role!=='developer')throw Error('请使用开发者账号登录');showWorkspace();route();await load();}
 catch{showLogin();}
}
$('admin-form').onsubmit=async event=>{
 event.preventDefault();const button=event.target.querySelector('button');$('login-message').textContent='';
 const password=new FormData(event.target).get('password');
 if(!password){$('login-message').textContent='请输入开发者密码。';event.target.password.focus();return;}
 button.disabled=true;
 try{await api('/api/login',{username:'founder',password});const me=await api('/api/me');if(me.role!=='developer')throw Error('请使用开发者账号登录');showWorkspace();route();await load();}
 catch(e){$('login-message').textContent=e.message;}
 finally{button.disabled=false;}
};
$('admin-logout').onclick=async()=>{try{await api('/api/logout',{});}finally{location.hash='';location.reload();}};
window.addEventListener('hashchange',route);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&state.selected&&matchMedia('(max-width: 820px)').matches)select(null);});
boot();
setInterval(()=>{if(!document.hidden&&!$('admin-workspace').hidden)load();},10000);
