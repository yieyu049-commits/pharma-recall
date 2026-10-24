/**
 * 參考 SM-2 概念的簡化自適應間隔；不是原版 SM-2、FSRS，
 * 也不估算個人實際遺忘率。依使用者自評調整每張卡的複習時間。
 * 原始機轉：https://super-memory.com/english/ol/sm2.htm
 * 原始 SM-2 使用 0–5 分、1 天與 6 天起始間隔，以及最低 1.3 的 ease。
 * 本版改為四鍵與短步重學；所有 interval / due / lastReview 均以毫秒計。
 */
export const DAY = 24 * 60 * 60 * 1000;
const MINUTE = 60 * 1000;
const MAX_INTERVAL = 3650 * DAY;
const RATINGS = ['again', 'hard', 'good', 'easy'];
export const defaultSettings = Object.freeze({});

const finite = (value, fallback) => Number.isFinite(value) ? value : fallback;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const days = value => Math.ceil(value / DAY) * DAY;

/** Return a new state without modifying the existing progress record. */
export function schedule(previous, rating, now = Date.now()) {
  if (!RATINGS.includes(rating)) throw new RangeError('無效的複習評分');
  if (!Number.isFinite(now) || now < 0 || now > 8.64e15 - MAX_INTERVAL) {
    throw new RangeError('無效的複習時間');
  }
  if (previous != null && (typeof previous !== 'object' || Array.isArray(previous))) {
    throw new TypeError('複習狀態必須是物件');
  }
  const old = previous || {};
  const lastReview = finite(old.lastReview, 0);
  if (lastReview > now) throw new RangeError('複習時間不可早於上次紀錄');
  const oldInterval = clamp(finite(old.interval, 0), 0, MAX_INTERVAL);
  const oldEase = clamp(finite(old.ease, 2.5), 1.3, 3.5);
  const oldReps = Math.max(0, Math.floor(finite(old.reps, 0)));
  const oldLapses = Math.max(0, Math.floor(finite(old.lapses, 0)));
  const wasReview = old.state === 'review' && oldInterval >= DAY;
  const wasRelearning = old.state === 'relearning';
  const ease = Math.round(clamp(oldEase + ({ again: -0.2, hard: -0.15, good: 0, easy: 0.15 })[rating], 1.3, 3.5) * 100) / 100;
  let interval;
  let state;
  let reps;
  let lapses = oldLapses;

  if (rating === 'again') {
    interval = MINUTE;
    state = wasReview || wasRelearning ? 'relearning' : 'learning';
    reps = 0;
    if (wasReview) lapses += 1;
  } else if (!wasReview) {
    interval = ({ hard: 10 * MINUTE, good: DAY, easy: 4 * DAY })[rating];
    state = rating === 'hard' ? (wasRelearning ? 'relearning' : 'learning') : 'review';
    reps = state === 'review' ? 1 : 0;
  } else {
    // 不因逾期自動獎勵更長間隔；由本次實際回憶自評決定。
    const hardInterval = Math.max(oldInterval + DAY, days(oldInterval * 1.2));
    const goodInterval = Math.max(hardInterval + DAY, oldReps <= 1 ? 6 * DAY : days(oldInterval * oldEase));
    const easyInterval = Math.max(goodInterval + DAY, days(oldInterval * ease * 1.3));
    interval = ({ hard: hardInterval, good: goodInterval, easy: easyInterval })[rating];
    state = 'review';
    reps = oldReps + 1;
  }
  interval = Math.min(MAX_INTERVAL, interval);
  return { ...old, due: now + interval, lastReview: now, interval, ease, reps, lapses, state };
}

/** Preview is exactly the same calculation used to commit an answer. */
export function preview(previous, now = Date.now()) {
  return Object.fromEntries(RATINGS.map(rating => [rating, schedule(previous, rating, now)]));
}

/** Compact labels for the four mobile rating buttons. */
export function intervalLabel(ms) {
  if (!Number.isFinite(ms)) return '—';
  if (ms <= 0) return '現在';
  if (ms < 60 * MINUTE) return `${Math.ceil(ms / MINUTE)} 分`;
  if (ms < DAY) return `${Math.ceil(ms / (60 * MINUTE))} 小時`;
  return `${Math.ceil(ms / DAY)} 天`;
}

/** Local calendar day, not UTC; used for the daily new-card allowance. */
export function dayKey(timestamp = Date.now()) {
  const date = new Date(timestamp);
  if (!Number.isFinite(date.getTime())) throw new RangeError('無效的日期');
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
