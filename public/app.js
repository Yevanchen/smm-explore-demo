import { captureIncident } from './capture.js';
const $=id=>document.getElementById(id);
const state={user:null,requestId:null,case:null,poll:null};
const messages={checkpoint_saved:'当前现场已保存',browser_evidence_saved:'浏览器截图与请求状态已保存',read_incident_image:'Agent 已读取现场截图',agent_started:'Agent 已开始调查',read_incident_checkpoint:'已读取页面现场',read_incident_logs:'已关联服务器错误日志',read_export_source:'已读取部署源码快照',feedback_submitted:'反馈已提交',diagnosis_completed:'诊断已完成',diagnosis_needs_review:'已保留现场，等待开发者查看'};
async function api(path,options={}){
  const r=await fetch(path,{...options,headers:{'Content-Type':'application/json',...options.headers}});
  const data=await r.json();if(!r.ok)throw new Error(data.message||'请求未完成，请稍后重试');return data;
}
function text(tag,value,className){const e=document.createElement(tag);e.textContent=value;if(className)e.className=className;return e;}
function short(id){return `SMM-${id.slice(0,8).toUpperCase()}`;}
function date(value){return new Date(value).toLocaleString('zh-CN',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});}
async function busy(button,fn){const label=button.textContent;button.disabled=true;try{return await fn();}finally{button.disabled=false;button.textContent=label;}}
function signedIn(user){state.user=user;$('login-view').hidden=true;$('workspace').hidden=false;$('profile-name').textContent=user.name;$('avatar').textContent=user.name.slice(0,1);$('identity-note').textContent=`${user.name} · 已通过 SMM 登录`;$('team-nav').hidden=user.role!=='developer';navigate();}
$('login-form').addEventListener('submit',async e=>{e.preventDefault();$('login-error').textContent='';const f=new FormData(e.target);await busy(e.submitter,async()=>{try{signedIn(await api('/api/login',{method:'POST',body:JSON.stringify(Object.fromEntries(f))}));}catch(error){$('login-error').textContent=error.message;}});});
$('logout').onclick=async()=>{await api('/api/logout',{method:'POST',body:'{}'});location.reload();};
$('export').onclick=async()=>busy($('export'),async()=>{const r=await fetch('/api/reports/export',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({start:Date.parse('2026-09-01T00:00:00Z'),end:Date.parse('2026-09-22T00:00:00Z')})});if(!r.ok){const data=await r.json();state.requestId=data.requestId;$('export-error').hidden=false;state.case=null;}else{const blob=await r.blob();const link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download='smm-report.csv';link.click();URL.revokeObjectURL(link.href);}});
function evidence(c){const el=$('evidence-preview');el.replaceChildren();[['页面','活动报告 / reports'],['采集时间',date(c.capturedAt||c.receivedAt)],['错误请求',c.requestId||'无关联请求'],['截图',state.case?.browserEvidence?'已采集 Chrome 原生截图':'未采集：需先启用浏览器采集扩展'],['证据来源','应用内采集；服务器日志单独关联']].forEach(([k,v])=>el.append(text('div',`${k}：${v}`,'evidence-line')));}
async function openSupport(existing){
  if(state.opening)return;
  state.opening=true;
  try{await openSupportOnce(existing);}finally{state.opening=false;}
}
async function openSupportOnce(existing){
  const checkpoint={capturedAt:new Date().toISOString(),requestId:state.requestId,viewport:{width:innerWidth,height:innerHeight},browser:navigator.userAgent,timezone:Intl.DateTimeFormat().resolvedOptions().timeZone};
  const browserEvidence=!existing&&!state.case?await captureIncident():null;
  $('support-panel').hidden=false;$('support-launcher').hidden=true;$('support-launcher').setAttribute('aria-expanded','true');$('support-error').textContent='';$('diagnosis-answer')?.remove();clearInterval(state.poll);
  if(existing){state.case=await api(`/api/cases/${existing}`);$('description').value=state.case.description;}
  if(!state.case){
    $('receipt').hidden=true;$('timeline').replaceChildren();$('capture-status').textContent='正在保存当前现场…';$('start-investigation').disabled=true;$('submit-feedback').disabled=true;
    try{state.case=await api('/api/cases',{method:'POST',body:JSON.stringify({description:'',checkpoint})});}
    catch(error){$('capture-status').textContent='现场保存失败';$('support-error').textContent=error.message;return;}
    finally{$('start-investigation').disabled=false;$('submit-feedback').disabled=false;}
    if(browserEvidence){try{const attached=await api(`/api/cases/${state.case.id}/evidence`,{method:'POST',body:JSON.stringify(browserEvidence)});state.case.browserEvidence=attached.metadata;}catch{$('support-error').textContent='页面信息已保存，截图上传未完成。';}}
  }
  $('capture-status').textContent=`现场已保存 · ${short(state.case.id)}。你可以继续操作页面。`;
  evidence(state.case.checkpoint);const oldImage=$('incident-image');oldImage?.remove();if(state.case.browserEvidence){const img=document.createElement('img');img.id='incident-image';img.alt='本次反馈保存的浏览器现场截图';img.src=`/api/cases/${state.case.id}/image`;$('evidence-preview').append(img);}const progress=await refreshTimeline();if(progress?.status==='investigating'){state.poll=setInterval(()=>refreshTimeline().catch(()=>{}),3000);}$('description').focus();
}
$('support-launcher').onclick=()=>openSupport().catch(e=>$('support-error').textContent=e.message);
$('investigate-error').onclick=async()=>{await openSupport();if(!$('description').value)$('description').value='我想导出九月的活动报告，但导出失败了。';};
$('close-support').onclick=()=>{$('support-panel').hidden=true;$('support-launcher').hidden=false;$('support-launcher').setAttribute('aria-expanded','false');clearInterval(state.poll);$('support-launcher').focus();};
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('support-panel').hidden)$('close-support').click();});
async function submit(){if(!state.case)throw new Error('现场尚未保存，请重新打开支持面板。');const r=await api(`/api/cases/${state.case.id}/submit`,{method:'POST',body:JSON.stringify({description:$('description').value})});$('receipt').replaceChildren(text('strong','反馈已收到'),text('div',`${short(r.id)} · 可在“我的反馈”查看`));$('receipt').hidden=false;await refreshTimeline();return r;}
$('submit-feedback').onclick=()=>busy($('submit-feedback'),async()=>{try{await submit();$('support-error').textContent='';}catch(e){$('support-error').textContent=e.message;}});
$('start-investigation').onclick=()=>busy($('start-investigation'),async()=>{try{if(!state.case)throw new Error('请先保存现场');await submit();await api(`/api/cases/${state.case.id}/start`,{method:'POST',body:'{}'});$('support-error').textContent='';clearInterval(state.poll);state.poll=setInterval(()=>refreshTimeline().catch(()=>{}),3000);await refreshTimeline();}catch(e){$('support-error').textContent=e.message;}});
async function refreshTimeline(){if(!state.case)return;const caseId=state.case.id;const result=await api(`/api/cases/${caseId}/events`);if(state.case?.id!==caseId)return;$('timeline').replaceChildren(...result.events.map(e=>{const li=text('li',messages[e.action]||'调查状态已更新');li.append(text('time',new Date(e.occurred_at).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'})));return li;}));if(result.customerMessage){let answer=$('diagnosis-answer');if(!answer){answer=text('div','','receipt');answer.id='diagnosis-answer';$('timeline').after(answer);}answer.textContent=result.customerMessage;}if(result.agentError)$('support-error').textContent=result.agentError;if(['completed','needs_review'].includes(result.status))clearInterval(state.poll);return result;}
async function navigate(){const requested=location.hash.slice(1);const view=['reports','feedback','team'].includes(requested)?requested:'reports';['reports','feedback','team'].forEach(v=>$(`${v}-view`).hidden=v!==view);document.querySelectorAll('nav a').forEach(a=>a.classList.toggle('active',a.hash===`#${view}`));$('breadcrumb').textContent=({reports:'活动报告',feedback:'我的反馈',team:'开发者收件箱'})[view]||'活动报告';if(!state.user)return;if(view==='feedback')await feedbackList();if(view==='team')await teamList();}
async function feedbackList(){const el=$('feedback-list');try{const r=await api('/api/cases');el.replaceChildren();if(!r.cases.length)el.append(text('p','还没有反馈。遇到问题时，点右下角“帮我看看”。','empty'));for(const c of r.cases){const row=text('article','','record');row.append(text('h3',c.description||'已保存的现场'),text('small',`${short(c.id)} · ${date(c.created_at)} · ${c.submitted_at?'已提交':'未提交'}`));const button=text('button','查看现场与进展 ↗','secondary');button.onclick=()=>openSupport(c.id).catch(e=>$('support-error').textContent=e.message);row.append(button);el.append(row);}}catch(e){el.replaceChildren(text('p',e.message,'error-text'));}}
async function teamList(){const el=$('team-list');try{const r=await api('/api/team/cases');el.replaceChildren();if(!r.cases.length)el.append(text('p','还没有已提交的反馈。','empty'));for(const c of r.cases){const row=text('article','','record');row.append(text('h3',c.description),text('small',`${short(c.id)} · ${date(c.createdAt)} · ${c.status}`));for(const [title,value]of [['Agent 诊断',c.diagnosis],['现场证据',c.checkpoint],['相关服务器日志',c.logs],['部署源码快照',c.source]]){const d=document.createElement('details');d.append(text('summary',title),text('pre',JSON.stringify(value,null,2)));row.append(d);}el.append(row);}}catch(e){el.replaceChildren(text('p',e.message,'error-text'));}}
window.addEventListener('hashchange',()=>navigate().catch(()=>{}));
api('/api/me').then(signedIn).catch(()=>{$('login-view').hidden=false;});
