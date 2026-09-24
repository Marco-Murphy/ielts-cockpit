'use strict';
/**
 * band-calculator - 雅思分数计算器与目标模拟器（纯函数，最先写最先测）
 * 雅思总分 = 四项算术平均，四舍五入到最近的 0.5 档（.25 以上进位）
 */

/** 四舍五入到 0.5 档（IELTS 官方规则） */
function roundToHalfBand(avg) {
  return Math.round(avg * 2) / 2;
}

/**
 * 计算总分
 * @param {{listening?:number, reading?:number, speaking?:number, writing?:number}} scores
 * @returns {{total:number|null, avg:number|null, parts:object}} total 为 null 表示不足四项
 */
function calcTotal(scores) {
  const parts = { listening: scores.listening ?? null, reading: scores.reading ?? null, speaking: scores.speaking ?? null, writing: scores.writing ?? null };
  const vals = Object.values(parts).filter(v => typeof v === 'number' && v > 0);
  if (vals.length < 4) return { total: null, avg: null, parts };
  const avg = vals.reduce((a, b) => a + b, 0) / 4;
  return { total: roundToHalfBand(avg), avg, parts };
}

/**
 * 校验单项 band 合法性（0-9，0.5 的倍数）
 */
function isValidBand(v) {
  return typeof v === 'number' && v >= 0 && v <= 9 && (v * 2) % 1 === 0;
}

/**
 * 目标组合模拟
 * @param {{listening,reading,speaking,writing}} combo 实际（或设想）的四项成绩
 * @param {{listening,reading,speaking,writing}} target 目标组合
 * @returns {object} { total, avg, met, gaps, summary }
 */
function simulate(combo, target) {
  const { total, avg, parts } = calcTotal(combo);
  const gaps = {};
  let met = false;
  if (total !== null) {
    const targetKeys = Object.keys(target);
    const targetTotal = roundToHalfBand(Object.values(target).reduce((a, b) => a + b, 0) / 4);
    for (const k of targetKeys) {
      const gap = target[k] && parts[k] != null ? +(target[k] - parts[k]).toFixed(1) : null;
      gaps[k] = gap;
    }
    met = total >= targetTotal && targetKeys.every(k => !target[k] || (parts[k] ?? 0) >= target[k]);
  }
  const summary = total === null ? '还需四项齐全才能计算总分'
    : met ? `总分 ${total}，达标 ✓`
    : `总分 ${total}，未达标（目标 ${target.total ? '自定义组合' : ''}）——缺口：${Object.entries(gaps).filter(([, g]) => g > 0).map(([k, g]) => `${k} 差 ${g}`).join('，') || '单项均达标，仅总分不足'}`;
  return { total, avg, parts, gaps, met, summary };
}

/**
 * 计算缺口：给定最近成绩（数组，每项为 {listening,reading,speaking,writing}）取最近 n 次平均，对比目标
 * @param {Array} recentScores
 * @param {object} target
 * @param {number} n 取最近几次（默认3）
 */
function calcGap(recentScores, target, n = 3) {
  const last = recentScores.slice(-n);
  if (last.length === 0) return { hasBaseline: false, avg: null, gaps: null, target };
  const avg = {};
  for (const k of ['listening', 'reading', 'speaking', 'writing']) {
    const vals = last.map(s => s[k]).filter(v => typeof v === 'number' && v > 0);
    avg[k] = vals.length ? +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2) : null;
  }
  const gaps = {};
  for (const k of Object.keys(target)) {
    gaps[k] = avg[k] != null && target[k] ? +(target[k] - avg[k]).toFixed(2) : null;
  }
  return { hasBaseline: true, avg, gaps, target };
}

/**
 * 由四项成绩判定是否值得报考（节奏锚点）：总分达标且各单项达标
 */
function assessMilestone(combo, target) {
  const { total, met, gaps } = simulate(combo, target);
  return { total, met, gaps };
}

module.exports = { roundToHalfBand, calcTotal, simulate, calcGap, assessMilestone, isValidBand };
