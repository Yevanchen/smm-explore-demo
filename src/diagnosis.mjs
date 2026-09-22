export function parseDiagnosis(text) {
  if(typeof text!=='string'||text.length>20000)return null;
  try {
    const result=JSON.parse(text.trim().replace(/^```(?:json)?\s*/,'').replace(/\s*```$/,''));
    if(result.developerSummary && typeof result.developerSummary==='object' && !Array.isArray(result.developerSummary))result.developerSummary=JSON.stringify(result.developerSummary,null,2);
    if(typeof result.customerMessage!=='string'||!result.customerMessage.trim()||typeof result.developerSummary!=='string'||!['confirmed','needs_review'].includes(result.confidence))return null;
    // Never display capability strings, provider secrets, or code blocks in the user channel.
    if(/```|[a-f0-9-]{72}|\b(?:msp_|sk-)[A-Za-z0-9_-]+/.test(result.customerMessage))return null;
    return {customerMessage:result.customerMessage.slice(0,2000),developerSummary:result.developerSummary.slice(0,10000),confidence:result.confidence};
  } catch { return null; }
}
