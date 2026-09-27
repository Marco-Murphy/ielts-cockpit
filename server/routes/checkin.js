'use strict';
/**
 * 打卡路由（Phase 0 基础版，Phase 1 补全 streak/热力图细节）
 * POST   /api/checkins        - 当日打卡
 * GET    /api/checkins        - 列表（?from=&to=）
 * GET    /api/checkins/streak - 当前连续天数 + 最长记录
 */
const express = require('express');
const router = express.Router();

function localDateStr(date) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
}
function todayStr() { return localDateStr(new Date()); }

function calcStreak(checkins) {
  const dates = new Set(checkins.map(c => c.date));
  let streak = 0;
  const d = new Date();
  if (!dates.has(localDateStr(d))) d.setDate(d.getDate() - 1);
  while (dates.has(localDateStr(d))) { streak += 1; d.setDate(d.getDate() - 1); }
  return streak;
}

function longestStreak(checkins) {
  const dates = [...new Set(checkins.map(c => c.date))].sort();
  let max = 0, cur = 0, prev = null;
  for (const ds of dates) {
    const d = new Date(ds);
    if (prev) {
      const diff = Math.round((d - prev) / 86400000);
      cur = diff === 1 ? cur + 1 : 1;
    } else cur = 1;
    max = Math.max(max, cur);
    prev = d;
  }
  return max;
}

module.exports = (store) => {
  router.get('/streak', (req, res) => {
    const checkins = store.all('checkins');
    res.json({ current: calcStreak(checkins), longest: longestStreak(checkins) });
  });

  router.get('/', (req, res) => {
    const { from, to } = req.query;
    let list = store.all('checkins');
    if (from) list = list.filter(c => c.date >= from);
    if (to) list = list.filter(c => c.date <= to);
    list.sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json(list);
  });

  router.post('/', (req, res) => {
    const { date = todayStr(), minutes, items = [], mood, note } = req.body || {};
    if (typeof minutes !== 'number') return res.status(400).json({ error: 'minutes 必填' });
    const record = store.insert('checkins', {
      date, minutes, items, mood: mood || '', note: note || '',
      streakSnapshot: calcStreak([...store.all('checkins'), { date }])
    });
    res.json(record);
  });

  router.patch('/:id', (req, res) => {
    const item = store.findById('checkins', req.params.id);
    if (!item) return res.status(404).json({ error: '未找到' });
    const updated = store.update('checkins', item.id, req.body || {});
    res.json(updated);
  });

  router.delete('/:id', (req, res) => {
    const ok = store.remove('checkins', req.params.id);
    if (!ok) return res.status(404).json({ error: '未找到' });
    res.json({ ok: true });
  });

  return router;
};
