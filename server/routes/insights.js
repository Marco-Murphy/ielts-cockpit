'use strict';
/**
 * 学习感悟/规律 路由
 * GET    /api/insights        - 列表（?category=&q=）
 * POST   /api/insights        - 新增感悟
 * PATCH  /api/insights/:id    - 修改
 * DELETE /api/insights/:id
 */
const express = require('express');
const router = express.Router();

// category: 'listening' 听力 | 'reading' 阅读 | 'vocab' 词汇 | 'method' 方法论

module.exports = (store) => {
  router.get('/', (req, res) => {
    const { category, q } = req.query;
    let list = store.all('insights');
    if (category) list = list.filter(v => v.category === category);
    if (q) {
      const kw = q.toLowerCase();
      list = list.filter(v =>
        (v.content || '').toLowerCase().includes(kw)
        || (v.source || '').toLowerCase().includes(kw)
        || (v.tag || '').toLowerCase().includes(kw)
      );
    }
    list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(list);
  });

  router.post('/', (req, res) => {
    const body = req.body || {};
    const category = body.category || 'method';
    if (!['listening', 'reading', 'vocab', 'method'].includes(category)) {
      return res.status(400).json({ error: 'category 只能是 listening/reading/vocab/method' });
    }
    if (!body.content || !body.content.trim()) {
      return res.status(400).json({ error: 'content 必填' });
    }
    const record = store.insert('insights', {
      category,
      content: body.content.trim(),
      source: body.source || '',   // 来源，如 剑5-T3-S2-Q17
      tag: body.tag || '',         // 一句话标题/标签
      learned: !!body.learned
    });
    res.json(record);
  });

  router.patch('/:id', (req, res) => {
    const item = store.findById('insights', req.params.id);
    if (!item) return res.status(404).json({ error: '未找到' });
    const patch = req.body || {};
    const allowed = ['category', 'content', 'source', 'tag', 'learned'];
    const clean = {};
    for (const k of allowed) if (patch[k] !== undefined) clean[k] = patch[k];
    const updated = store.update('insights', item.id, clean);
    res.json(updated);
  });

  router.delete('/:id', (req, res) => {
    const ok = store.remove('insights', req.params.id);
    if (!ok) return res.status(404).json({ error: '未找到' });
    res.json({ ok: true });
  });

  return router;
};
