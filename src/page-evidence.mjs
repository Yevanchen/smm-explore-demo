export function sanitizePageEvidence(value,now=Date.now()){
  const events=(Array.isArray(value?.events)?value.events:[]).slice(-60).flatMap(e=>{
    if(!e||!Number.isFinite(e.at)||e.at<now-120000||e.at>now+5000)return [];
    if(e.type==='action'&&['export-report','open-support'].includes(e.action))return [{at:e.at,type:e.type,action:e.action}];
    if(e.type==='error'&&['uncaught_error','unhandled_rejection'].includes(e.code))return [{at:e.at,type:e.type,code:e.code}];
    if(e.type==='request'&&e.path==='/api/reports/export'&&Number.isInteger(e.status)&&e.status>=100&&e.status<=599)return [{at:e.at,type:e.type,path:e.path,status:e.status,requestId:/^[a-f0-9-]{36}$/.test(e.requestId||'')?e.requestId:null,durationMs:Number.isFinite(e.durationMs)?Math.min(120000,Math.max(0,Math.round(e.durationMs))):null}];
    return [];
  });
  return {source:'page-sdk',kind:'semantic-state-and-events',events,state:{view:['reports','feedback','team'].includes(value?.state?.view)?value.state.view:'reports',exportErrorVisible:value?.state?.exportErrorVisible===true},limitations:'Semantic application state, not a pixel screenshot or full DOM replay. No input values, raw error messages, request bodies or headers are collected.'};
}
