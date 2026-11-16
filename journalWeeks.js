// 유저 운동일지(/u/:code) — 주별 줄 계산 (DOM 없음, node에서도 검사 가능)
//
// 앱 운동일지 탭과 같은 규칙:
//   - 주는 월요일 시작, 이번 주부터 과거로 가장 오래된 오운완이 있는 주까지 (최소 4주)
//   - 날짜는 실행 환경(브라우저 = 한국 시간)의 로컬 시간 기준으로 created_at을 날짜로 바꿔 판단
//   - 같은 날 오운완이 여러 개면 가장 최근 1개만

export const WEEKDAYS_KO = ['월', '화', '수', '목', '금', '토', '일'];
const DAY_MS = 24 * 60 * 60 * 1000;

/** 로컬 날짜 자정 */
function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** d가 속한 주의 월요일(로컬 자정) */
export function mondayOf(d) {
  const x = startOfDay(d);
  const dow = (x.getDay() + 6) % 7; // 월=0 … 일=6
  x.setDate(x.getDate() - dow);
  return x;
}

function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

/** 두 로컬 날짜 사이의 일 수 (서머타임이 있어도 반올림으로 보정) */
function daysBetween(a, b) {
  return Math.round((startOfDay(b) - startOfDay(a)) / DAY_MS);
}

export function dayKey(d) {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

/** ISO 8601 주번호 (그 주의 목요일이 속한 해 기준) */
export function isoWeekNumber(d) {
  const thursday = addDays(mondayOf(d), 3);
  const week1Monday = mondayOf(new Date(thursday.getFullYear(), 0, 4));
  return 1 + Math.round(daysBetween(week1Monday, thursday) / 7);
}

/** 줄 머리: "{ISO 주번호}주", "{M}월 {D}일 ~ {M}월 {D}일" */
export function weekLabel(monday) {
  const sunday = addDays(monday, 6);
  const md = (d) => `${d.getMonth() + 1}월 ${d.getDate()}일`;
  return { week: `${isoWeekNumber(monday)}주`, range: `${md(monday)} ~ ${md(sunday)}` };
}

/** 날짜(로컬) → 그날 가장 최근 오운완 */
export function latestPostByDay(posts) {
  const map = new Map();
  for (const post of posts || []) {
    const t = new Date(post?.created_at);
    if (isNaN(t.getTime())) continue;
    const key = dayKey(t);
    const prev = map.get(key);
    if (!prev || t > new Date(prev.created_at)) map.set(key, post);
  }
  return map;
}

/**
 * posts(RPC 응답) → 주별 줄 목록 (최신 주가 먼저).
 * 각 주: { monday, week, range, days: [{ date, dayNum, weekday, isToday, isFuture, post }] × 7 }
 */
export function buildWeeks(posts, now = new Date(), minWeeks = 4) {
  const byDay = latestPostByDay(posts);
  const thisMonday = mondayOf(now);
  const today = startOfDay(now);

  let weekCount = minWeeks;
  for (const post of posts || []) {
    const t = new Date(post?.created_at);
    if (isNaN(t.getTime())) continue;
    const diff = Math.round(daysBetween(mondayOf(t), thisMonday) / 7);
    if (diff + 1 > weekCount) weekCount = diff + 1;
  }

  const weeks = [];
  for (let w = 0; w < weekCount; w++) {
    const monday = addDays(thisMonday, -7 * w);
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = addDays(monday, i);
      const offset = daysBetween(today, date);
      days.push({
        date,
        dayNum: date.getDate(),
        weekday: WEEKDAYS_KO[i],
        isToday: offset === 0,
        isFuture: offset > 0,
        post: byDay.get(dayKey(date)) ?? null,
      });
    }
    weeks.push({ monday, ...weekLabel(monday), days });
  }
  return weeks;
}
