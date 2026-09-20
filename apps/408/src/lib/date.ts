/** 本地日期工具：全部按**本机时区**的「自然日」计算，避免 UTC 偏移导致跨天错乱。 */

export function dayKey(input: Date | number = new Date()): string {
  const d = typeof input === 'number' ? new Date(input) : input;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseDayKey(key: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key.trim());
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

export function startOfDay(input: Date | number = new Date()): Date {
  const d = typeof input === 'number' ? new Date(input) : new Date(input.getTime());
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfDay(input: Date | number = new Date()): Date {
  const d = startOfDay(input);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function addDays(input: Date | number, days: number): Date {
  const d = typeof input === 'number' ? new Date(input) : new Date(input.getTime());
  d.setDate(d.getDate() + days);
  return d;
}

/** 从 a 到 b 相差的整自然日数（b - a）。 */
export function diffDays(a: Date | number, b: Date | number): number {
  const ms = startOfDay(b).getTime() - startOfDay(a).getTime();
  return Math.round(ms / 86400000);
}

/** 距考试还有几天；未设置或已过返回 null。 */
export function daysUntilExam(examDate: string, now = new Date()): number | null {
  const target = parseDayKey(examDate);
  if (!target) return null;
  return diffDays(now, target);
}

/** 把「还有多久到期」格式化成中文短标签。 */
export function dueLabel(due: number, now = Date.now()): string {
  const diff = due - now;
  if (diff <= 0) return '现在';
  const min = Math.round(diff / 60000);
  if (min < 1) return '<1 分';
  if (min < 60) return `${min} 分`;
  const hour = Math.round(min / 60);
  if (hour < 24) return `${hour} 小时`;
  const day = Math.round(hour / 24);
  if (day < 31) return `${day} 天`;
  const month = Math.round(day / 30.4);
  if (month < 12) return `${month} 个月`;
  return `${(day / 365).toFixed(1)} 年`;
}

/** 'YYYY-MM-DD' → 'M月D日' */
export function prettyDay(key: string): string {
  const d = parseDayKey(key);
  if (!d) return key;
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

/** 最近 n 天的日期 key（含今天），从早到晚。 */
export function recentDayKeys(n: number, now = new Date()): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i -= 1) out.push(dayKey(addDays(now, -i)));
  return out;
}

/** 单张卡的最长复习间隔（天）：不让任何一张卡的间隔超过考前剩余时间。 */
export function maxIntervalDays(examDate: string, now = new Date()): number {
  const days = daysUntilExam(examDate, now);
  if (days === null || days <= 0) return 36500;
  return Math.max(7, Math.min(60, days));
}
