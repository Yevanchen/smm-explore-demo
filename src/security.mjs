export async function digest(value) {
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))].map(v => v.toString(16).padStart(2, '0')).join('');
}
export async function equalSecret(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || !a || !b) return false;
  const x = await digest(a), y = await digest(b);
  let difference = 0;
  for (let i = 0; i < x.length; i++) difference |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return difference === 0;
}
export function token() { return crypto.randomUUID() + crypto.randomUUID(); }
export function sameOrigin(request) {
  return request.headers.get('Origin') === new URL(request.url).origin;
}
export function sanitizeCheckpoint(data) {
  const text = (v, n=180) => typeof v === 'string' ? v.slice(0,n) : '';
  const number = v => Number.isFinite(v) ? Math.max(0,Math.min(v,20000)) : null;
  return {
    route: '/reports', title: 'SMM · Campaign reports',
    capturedAt: text(data.capturedAt,40), viewport: { width: number(data.viewport?.width), height: number(data.viewport?.height) },
    browser: text(data.browser), timezone: text(data.timezone,80),
    requestId: /^[a-f0-9-]{36}$/.test(data.requestId || '') ? data.requestId : null,
    observedError: data.requestId ? '报表导出失败' : null,
    screenshot: { status: 'not_collected', reason: 'Native browser capture is not connected yet' },
    evidenceType: 'application-instrumentation',
    note: 'Browser-supplied observations are untrusted; server logs are independently scoped and correlated.'
  };
}
