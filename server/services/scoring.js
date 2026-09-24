'use strict';
/**
 * scoring - 客观题判分 + raw→band 换算
 */
const fs = require('fs');
const path = require('path');

const TABLES = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'data', 'band-tables.json'), 'utf8')
);

/**
 * 答案归一化：去前后空格、转大写、统一标点
 * 对 TRUE/FALSE/NOT GIVEN、YES/NO/NOT GIVEN 等做标准比对
 */
function normalizeAnswer(s) {
  if (s == null) return '';
  return String(s).trim().toUpperCase().replace(/\s+/g, ' ').replace(/[。，；：!！?？]/g, c => ({ '。': '.', '，': ',', '；': ';', '：': ':', '！': '!', '？': '?' }[c]));
}

/**
 * 判定单题对错
 * @param {string} myAnswer
 * @param {string} correctAnswer
 * @param {object} opts {ignoreSpelling?:boolean} 雅思填空拼写错即错，默认严格
 */
function checkAnswer(myAnswer, correctAnswer, opts = {}) {
  const a = normalizeAnswer(myAnswer);
  const b = normalizeAnswer(correctAnswer);
  if (opts.ignoreSpelling) {
    // 宽松：仅比对是否非空且大致一致（发音近似），默认不用
    return a.length > 0 && a === b;
  }
  // 严格：完全匹配（含拼写）
  return a !== '' && a === b;
}

/**
 * raw→band 换算
 * @param {number} raw 正确题数
 * @param {'listening'|'reading_academic'|'reading_general'} type
 */
function rawToBand(raw, type = 'listening') {
  const table = TABLES[type];
  if (!table) throw new Error(`未知换算类型: ${type}`);
  if (typeof raw !== 'number' || raw < 0) return 0;
  // 查表：遍历键 "min-max"，匹配 raw
  for (const key of Object.keys(table)) {
    const [lo, hi] = key.split('-').map(Number);
    if (raw >= lo && raw <= hi) return table[key];
  }
  return 0;
}

/**
 * 批量判分
 * @param {Array} items [{ myAnswer, correctAnswer, questionType, wrongReason?, note? }]
 * @param {'listening'|'reading_academic'|'reading_general'} type
 * @returns {{ raw:number, band:number, mistakes:Array, results:Array }}
 */
function gradePractice(items, type = 'listening') {
  const results = items.map((item, idx) => {
    const isCorrect = checkAnswer(item.myAnswer, item.correctAnswer);
    return {
      qNo: idx + 1,
      myAnswer: item.myAnswer,
      correctAnswer: item.correctAnswer,
      questionType: item.questionType,
      isCorrect,
      wrongReason: isCorrect ? null : (item.wrongReason || 'unclassified'),
      note: item.note || ''
    };
  });
  const raw = results.filter(r => r.isCorrect).length;
  const band = rawToBand(raw, type);
  const mistakes = results.filter(r => !r.isCorrect);
  return { raw, band, mistakes, results, approximate: true };
}

module.exports = { normalizeAnswer, checkAnswer, rawToBand, gradePractice, TABLES };
