export function exportReport(input) {
  const { start, end } = input;
  if (typeof start !== 'number' || typeof end !== 'number' || !Number.isFinite(start) || !Number.isFinite(end)) {
    return { status: 422, code: 'INVALID_DATE_RANGE', detail: 'start and end must be numeric Unix timestamps in seconds' };
  }
  // Intentional demo contract: this endpoint accepts seconds, while the UI sends milliseconds.
  if (start > 100000000000 || end > 100000000000) {
    return { status: 422, code: 'TIMESTAMP_UNIT_MISMATCH', detail: 'Expected Unix seconds; received millisecond-scale values', received: { start, end } };
  }
  if (start >= end) return { status: 422, code: 'INVALID_DATE_ORDER', detail: 'start must be before end' };
  return { status: 200, code: 'OK', csv: 'campaign,impressions,clicks\nAutumn launch,42860,2143\nProduct newsletter,18640,1305\n' };
}
