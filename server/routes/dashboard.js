'use strict';
/**
 * dashboard 路由 - GET /api/dashboard
 * 今日打卡状态、连续天数、距考试天数、各科当前水平 vs 目标缺口、节奏锚点状态
 */
const express = require('express');
const router = express.Router();
const bc = require('../services/band-calculator.js');

function todayStr() { return new Date().toISOString().slice(0, 10); }

function calcStreak(checkins) {
  // 连续天数：从今天往前数，有打卡的连续日期
  const dates = new Set(checkins.map(c => c.date));
  let streak = 0;
  const d = new Date();
  // 若今天还没打卡，从昨天开始数（streak 仍记录到昨日）
  if (!dates.has(d.toISOString().slice(0, 10))) {
    d.setDate(d.getDate() - 1);
  }
  while (dates.has(d.toISOString().slice(0, 10))) {
    streak += 1;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

module.exports = (store) => {
  router.get('/', (req, res) => {
    const profile = store.all('profile') || { targetCombo: { listening: 7, reading: 7, speaking: 6.5, writing: 6.5 }, examTargetDate: '' };
    const checkins = store.all('checkins');
    const today = todayStr();
    const todayCheckin = checkins.find(c => c.date === today);

    // 距考试天数（未填考试日期时为 0）
    const examDate = profile.examTargetDate ? new Date(profile.examTargetDate) : null;
    const daysToExam = examDate ? Math.max(0, Math.ceil((examDate - new Date()) / 86400000)) : 0;

    // 累计投入（动力锚用）
    const totalMinutes = checkins.reduce((s, c) => s + (Number(c.minutes) || 0), 0);
    const totalDays = new Set(checkins.map(c => c.date)).size;

    // 动力锚语录（可在 public/js/pages/dashboard.js 里按自己的话替换）
    const anchors = [
      '我在给未来的自己存钱。',
      '优秀学历不保上限，但保下限。',
      '大学是双倍经验卡阶段，现在努力的性价比最高。',
      '不需要别人催，这是我自发想做的事。',
      '越模糊薄弱的地方，越要重点提升。',
      '我不是在完成别人的任务，我是在给自己谋退路。',
      '每一点积累，都是给未来的自己多留一扇门。',
      '踏实推进的每一天，本身就是充实的。'
    ].filter(Boolean);

    // 各科最近分数 vs 目标
    const practices = store.all('practices');
    const essays = store.all('essays');
    const speakings = store.all('speakings');
    const latestBySection = {};
    for (const p of practices) {
      if (typeof p.bandScore === 'number' && (p.section === 'listening' || p.section === 'reading')) {
        if (!latestBySection[p.section] || new Date(p.date) > new Date(latestBySection[p.section].date)) {
          latestBySection[p.section] = { date: p.date, band: p.bandScore };
        }
      }
    }
    for (const e of essays) {
      const g = e.grading && e.grading.scores && e.grading.scores.overall;
      if (typeof g === 'number' && (!latestBySection.writing || new Date(e.date) > new Date(latestBySection.writing.date))) {
        latestBySection.writing = { date: e.date, band: g };
      }
    }
    for (const s of speakings) {
      const g = s.grading && s.grading.scores && s.grading.scores.overall;
      if (typeof g === 'number' && (!latestBySection.speaking || new Date(s.date) > new Date(latestBySection.speaking.date))) {
        latestBySection.speaking = { date: s.date, band: g };
      }
    }

    const target = profile.targetCombo;
    const sectionGaps = {};
    for (const k of ['listening', 'reading', 'speaking', 'writing']) {
      const cur = latestBySection[k] ? latestBySection[k].band : null;
      sectionGaps[k] = cur != null ? +(target[k] - cur).toFixed(1) : null;
    }

    res.json({
      profile,
      daysToExam,
      todayCheckin,
      streak: calcStreak(checkins),
      latestBySection,
      sectionGaps,
      baseline: profile.baseline,
      target,
      totalMinutes,
      totalDays,
      anchors
    });
  });

  return router;
};
