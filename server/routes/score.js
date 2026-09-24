'use strict';
/**
 * 分数计算路由
 * POST /api/score/simulate  - 目标组合模拟（四项→总分+达标+缺口）
 * GET  /api/score/gap        - 基于历史近3次平均 vs 目标的缺口
 */
const express = require('express');
const router = express.Router();
const bc = require('../services/band-calculator.js');

module.exports = (store) => {
  router.post('/simulate', (req, res) => {
    const { combo, target } = req.body || {};
    const profile = store.all('profile');
    const targetCombo = target || (profile && profile.targetCombo) || { listening: 8, reading: 8, speaking: 7, writing: 6.5 };
    if (!combo) return res.status(400).json({ error: '缺少 combo' });
    const result = bc.simulate(combo, targetCombo);
    res.json(result);
  });

  router.get('/gap', (req, res) => {
    const profile = store.all('profile');
    const target = (profile && profile.targetCombo) || { listening: 8, reading: 8, speaking: 7, writing: 6.5 };
    // 从 practices 取有 band 分数的记录（听力/阅读有 band，写作/口语来自 essays/speakings）
    const practices = store.all('practices');
    const essays = store.all('essays');
    const speakings = store.all('speakings');
    const recentScores = practices
      .filter(p => typeof p.bandScore === 'number')
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .map(p => ({ date: p.date, [p.section]: p.bandScore }));
    // 合并写作/口语分数
    for (const e of essays) {
      const g = e.grading && e.grading.scores && e.grading.scores.overall;
      if (typeof g === 'number') recentScores.push({ date: e.date, writing: g });
    }
    for (const s of speakings) {
      const g = s.grading && s.grading.scores && s.grading.scores.overall;
      if (typeof g === 'number') recentScores.push({ date: s.date, speaking: g });
    }
    const result = bc.calcGap(recentScores, target, 3);
    res.json(result);
  });

  return router;
};
