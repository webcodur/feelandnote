/**
 * 가까운 빈 칸부터 한 편씩 배정한다. 하루의 칸은 `times`(기본은 `time` 하나)다.
 * 기존 예약은 그날 가장 가까운 칸을 차지한다. 시각이 없는 예약은 그날 칸을 모두 차지한다.
 */
export function reservationDate(value) {
  const match = String(value ?? '').match(/(\d{4})[.-]\s*(\d{2})[.-]\s*(\d{2})/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : null;
}

const minutes = hhmm => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
function reservationMinutes(value) {
  const match = String(value ?? '').match(/\d{4}[.-]\s*\d{2}[.-]\s*\d{2}\.?\s+(\d{1,2}):(\d{2})/);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

export function buildReservationSlots({ count, start, time, times = [time], occupied = [], dows = [1, 2, 3, 4, 5, 6, 7], now = Date.now() }) {
  if (!Number.isInteger(count) || count < 0) throw new Error('예약 건수가 잘못됐다');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start)) throw new Error('시작일은 YYYY-MM-DD');
  if (!times.length || times.some(t => !/^(?:[01]\d|2[0-3]):[0-5]0$/.test(t ?? ''))) throw new Error('예약 시각은 HH:MM, 분은 10분 단위');
  if (new Set(times).size !== times.length) throw new Error('예약 시각이 겹친다');
  if (!dows.length || dows.some(day => !Number.isInteger(day) || day < 1 || day > 7)) throw new Error('요일은 1~7');
  const order = [...times].sort();
  const nearest = at => order.reduce((best, t) => Math.abs(minutes(t) - at) < Math.abs(minutes(best) - at) ? t : best);
  const busy = new Set();
  for (const value of occupied) {
    const date = reservationDate(value), at = reservationMinutes(value);
    if (!date) continue;
    for (const t of at === null ? order : [nearest(at)]) busy.add(`${date} ${t}`);
  }
  const cursor = new Date(`${start}T00:00:00+09:00`);
  if (!Number.isFinite(cursor.getTime()) || new Date(cursor.getTime() + 9 * 3600000).toISOString().slice(0, 10) !== start) throw new Error('실재하지 않는 시작일');
  const out = [];
  // Every week has an eligible day. Allow for elapsed days, occupied slots and the requested stock.
  const elapsedDays = Math.max(0, Math.ceil((now + 60000 - cursor.getTime()) / 86400000));
  const searchDays = elapsedDays + (busy.size + count + 1) * 7;
  for (let guard = 0; out.length < count && guard < searchDays; guard++, cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    const koreanDay = new Date(cursor.getTime() + 9 * 3600000);
    const date = koreanDay.toISOString().slice(0, 10);
    const dow = koreanDay.getUTCDay() || 7;
    if (!dows.includes(dow)) continue;
    for (const t of order) {
      if (out.length >= count || busy.has(`${date} ${t}`)) continue;
      const slot = new Date(`${date}T${t}:00+09:00`);
      if (slot.getTime() <= now + 60000) continue;
      out.push(slot);
      busy.add(`${date} ${t}`);
    }
  }
  if (out.length !== count) throw new Error('빈 예약일을 확보하지 못했다');
  return out;
}
