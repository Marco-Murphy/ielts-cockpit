'use strict';
/**
 * 分析路由（Phase 0 基础版，Phase 1 完整错题模式分析）
 * GET /api/analytics/band-trend?section=  - 单项分数趋势
 * GET /api/analytics/mistakes?groupBy=    - 错题聚合（Phase 1 完整）
 */
const express = require('express');
const router = express.Router();

module.exports = (store) => {
  router.get('/band-trend', (req, res) => {
    const { section } = req.query;
    const practices = store.all('practices').filter(p => typeof p.bandScore === 'number');
    const essays = store.all('essays');
    const speakings = store.all('speakings');
    const points = [];
    for (const p of practices) {
      if (section && p.section !== section) continue;
      points.push({ date: p.date, section: p.section, band: p.bandScore, raw: p.rawScore, source: 'practice' });
    }
    for (const e of essays) {
      if (section && section !== 'writing') continue;
      const g = e.grading && e.grading.scores && e.grading.scores.overall;
      if (typeof g === 'number') points.push({ date: e.date, section: 'writing', band: g, source: 'essay' });
    }
    for (const s of speakings) {
      if (section && section !== 'speaking') continue;
      const g = s.grading && s.grading.scores && s.grading.scores.overall;
      if (typeof g === 'number') points.push({ date: s.date, section: 'speaking', band: g, source: 'speaking' });
    }
    points.sort((a, b) => new Date(a.date) - new Date(b.date));
    res.json(points);
  });

  router.get('/mistakes', (req, res) => {
    const { groupBy = 'questionType' } = req.query;
    const mistakes = store.all('mistakes');
    const groups = {};
    for (const m of mistakes) {
      const key = m[groupBy] || 'unknown';
      groups[key] = (groups[key] || 0) + 1;
    }
    res.json({ groupBy, total: mistakes.length, groups });
  });

  return router;
};
