/** 가까운 날짜부터 하루 한 편씩 배정한다. 예약이 있는 날은 시각과 관계없이 건너뛴다. */
export function reservationDate(value) {
  const match = String(value ?? '').match(/(\d{4})[.-]\s*(\d{2})[.-]\s*(\d{2})/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : null;
}

export function buildReservationSlots({ count, start, time, occupied = [], dows = [1, 2, 3, 4, 5, 6, 7], now = Date.now() }) {
  if (!Number.isInteger(count) || count < 0) throw new Error('예약 건수가 잘못됐다');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start)) throw new Error('시작일은 YYYY-MM-DD');
  if (!/^(?:[01]\d|2[0-3]):[0-5]0$/.test(time)) throw new Error('예약 시각은 HH:MM, 분은 10분 단위');
  if (!dows.length || dows.some(day => !Number.isInteger(day) || day < 1 || day > 7)) throw new Error('요일은 1~7');
  const busy = new Set(occupied.map(reservationDate).filter(Boolean));
  const cursor = new Date(`${start}T00:00:00+09:00`);
  if (!Number.isFinite(cursor.getTime()) || new Date(cursor.getTime() + 9 * 3600000).toISOString().slice(0, 10) !== start) throw new Error('실재하지 않는 시작일');
  const out = [];
  // Every week has an eligible day. Allow for elapsed days, occupied dates and the requested stock.
  const elapsedDays = Math.max(0, Math.ceil((now + 60000 - cursor.getTime()) / 86400000));
  const searchDays = elapsedDays + (busy.size + count + 1) * 7;
  for (let guard = 0; out.length < count && guard < searchDays; guard++, cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    const koreanDay = new Date(cursor.getTime() + 9 * 3600000);
    const date = koreanDay.toISOString().slice(0, 10);
    const dow = koreanDay.getUTCDay() || 7;
    if (busy.has(date) || !dows.includes(dow)) continue;
    const slot = new Date(`${date}T${time}:00+09:00`);
    if (slot.getTime() <= now + 60000) continue;
    out.push(slot);
    busy.add(date);
  }
  if (out.length !== count) throw new Error('빈 예약일을 확보하지 못했다');
  return out;
}
