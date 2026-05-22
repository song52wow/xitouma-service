/**
 * 日期工具 - 统一处理时区
 * 移植自 cloudfunctions/record_checkin/utils/date.js
 * 使用 Intl.DateTimeFormat 替代硬编码 UTC+8
 */

export function getTodayStr(timezone: string = 'Asia/Shanghai'): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export function addDays(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const baseDate = new Date(Date.UTC(year, month - 1, day));
  baseDate.setUTCDate(baseDate.getUTCDate() + days);
  const y = baseDate.getUTCFullYear();
  const m = String(baseDate.getUTCMonth() + 1).padStart(2, '0');
  const d = String(baseDate.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function diffDays(date1: string, date2: string): number {
  const [y1, m1, d1] = date1.split('-').map(Number);
  const [y2, m2, d2] = date2.split('-').map(Number);
  const utc1 = Date.UTC(y1, m1 - 1, d1);
  const utc2 = Date.UTC(y2, m2 - 1, d2);
  return Math.round((utc1 - utc2) / 86400000);
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * 计算星期几（Monday=1, Sunday=7），不依赖运行时时区
 */
export function getWeekday(dateStr: string): number {
  const d = new Date(dateStr + 'T00:00:00+08:00');
  return d.getUTCDay() || 7;
}

export function isValidDateFormat(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date);
}
