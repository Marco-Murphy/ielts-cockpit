'use strict';
/**
 * 用户档案路由 - GET/PATCH /api/profile
 * 默认目标组合：听力7.0/阅读7.0/口语6.5/写作6.5（总分约 6.75 → 7.0）
 * 首次使用请在「设置」页按自己的目标调整
 */
const express = require('express');
const router = express.Router();

const DEFAULT_PROFILE = {
  nickname: '',
  examTargetDate: '', // 留空，由使用者在「设置」页填写
  targetCombo: { listening: 7.0, reading: 7.0, speaking: 6.5, writing: 6.5 },
  dailyMinutes: { min: 60, max: 120 },
  baseline: null // 摸底后回填 { listening, reading, speaking, writing, date }
};

module.exports = (store) => {
  router.get('/', (req, res) => {
    let p = store.all('profile');
    if (!p) p = store.insert('profile', { ...DEFAULT_PROFILE });
    res.json(p);
  });

  router.patch('/', (req, res) => {
    let p = store.all('profile');
    if (!p) p = store.insert('profile', { ...DEFAULT_PROFILE });
    const patch = req.body || {};
    // 防止覆盖 id/createdAt
    delete patch.id; delete patch.createdAt;
    const updated = store.update('profile', p.id, patch);
    res.json(updated);
  });

  return router;
};
