'use strict';
/**
 * 同义替换 / 生词本 路由
 * GET    /api/vocab              - 列表（?type=&q=&learned=）
 * POST   /api/vocab              - 新增条目
 * PATCH  /api/vocab/:id          - 更新（含标记已掌握/加熟练度）
 * DELETE /api/vocab/:id
 * GET    /api/vocab/stats        - 统计（总数/未掌握/按类型）
 */
const express = require('express');
const router = express.Router();

// 类型说明
// type: 'synonym' 同义替换词对 | 'vocab' 生词 | 'scene_word' 听力场景词

module.exports = (store) => {
  router.get('/stats', (req, res) => {
    const list = store.all('vocab');
    const stats = {
      total: list.length,
      unlearned: list.filter(v => !v.learned).length,
      byType: { synonym: 0, vocab: 0, scene_word: 0 }
    };
    for (const v of list) stats.byType[v.type] = (stats.byType[v.type] || 0) + 1;
    res.json(stats);
  });

  router.get('/', (req, res) => {
    const { type, q, learned, section } = req.query;
    let list = store.all('vocab');
    if (type) list = list.filter(v => v.type === type);
    if (section) list = list.filter(v => v.section === section);
    if (learned === 'true') list = list.filter(v => v.learned);
    if (learned === 'false') list = list.filter(v => !v.learned);
    if (q) {
      const kw = q.toLowerCase();
      list = list.filter(v =>
        (v.word || '').toLowerCase().includes(kw)
        || (v.meaning || '').toLowerCase().includes(kw)
        || (v.alternate || '').toLowerCase().includes(kw)
        || (v.note || '').toLowerCase().includes(kw)
      );
    }
    list.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    res.json(list);
  });

  router.post('/', (req, res) => {
    const body = req.body || {};
    const type = body.type || 'vocab';
    if (!['synonym', 'vocab', 'scene_word'].includes(type)) {
      return res.status(400).json({ error: 'type 只能是 synonym/vocab/scene_word' });
    }
    // synonym 类型必须有 word(原文词) 和 alternate(替换词)
    if (type === 'synonym' && (!body.word || !body.alternate)) {
      return res.status(400).json({ error: '同义替换需要 word(原文词) 和 alternate(替换词)' });
    }
    if (type !== 'synonym' && !body.word) {
      return res.status(400).json({ error: 'word 必填' });
    }
    const record = store.insert('vocab', {
      type,
      word: body.word,
      alternate: body.alternate || '',   // 同义替换词对：word↔alternate
      meaning: body.meaning || '',
      basic: body.basic || '',           // 初级替换：你早就认识的简单说法（merge → combine）
      basicNote: body.basicNote || '',   // 一句话说明初级词和高级词的用法差异
      section: body.section || '',       // 'listening'|'reading'
      source: body.source || '',         // 来源（如 剑19-T1阅读）
      example: body.example || '',
      note: body.note || '',
      learned: !!body.learned,           // 是否已掌握
      mastery: body.mastery || 0         // 熟练度 0-5
    });
    res.json(record);
  });

  router.patch('/:id', (req, res) => {
    const item = store.findById('vocab', req.params.id);
    if (!item) return res.status(404).json({ error: '未找到' });
    const patch = req.body || {};
    // 允许改 learned/mastery/meaning/example/note
    const allowed = ['word', 'alternate', 'meaning', 'basic', 'basicNote', 'section', 'source', 'example', 'note', 'learned', 'mastery'];
    const clean = {};
    for (const k of allowed) if (patch[k] !== undefined) clean[k] = patch[k];
    const updated = store.update('vocab', item.id, clean);
    res.json(updated);
  });

  router.delete('/:id', (req, res) => {
    const ok = store.remove('vocab', req.params.id);
    if (!ok) return res.status(404).json({ error: '未找到' });
    res.json({ ok: true });
  });

  return router;
};
