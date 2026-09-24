'use strict';
/**
 * 练题/模考路由
 * POST   /api/practices       - 提交整卷（answers+正解+元数据→服务端判分落库）
 * GET    /api/practices       - 列表（可过滤 section/from/to）
 * GET    /api/practices/:id
 * DELETE /api/practices/:id
 */
const express = require('express');
const router = express.Router();
const scoring = require('../services/scoring.js');

module.exports = (store) => {
  router.post('/', (req, res) => {
    const body = req.body || {};
    const { type = 'section', cambridgeBook, testNo, section, date, durationPlanned, durationActual, items = [], wasTimed = true } = body;
    if (!section || !['listening', 'reading', 'writing', 'speaking'].includes(section)) {
      return res.status(400).json({ error: 'section 必填（listening/reading/writing/speaking）' });
    }
    if (!items.length) return res.status(400).json({ error: 'items 不能为空' });

    // 仅听力/阅读做客观题判分；写作/口语的 band 来自 AI 评分（Phase 2），此处只存记录
    let grading = null;
    if (section === 'listening' || section === 'reading') {
      const typeKey = section === 'listening' ? 'listening'
        : (body.readingType === 'general' ? 'reading_general' : 'reading_academic');
      grading = scoring.gradePractice(items, typeKey);
    }
    const record = store.insert('practices', {
      type, cambridgeBook, testNo, section, date: date || new Date().toISOString().slice(0, 10),
      durationPlanned, durationActual, wasTimed,
      items: grading ? grading.results : items,
      rawScore: grading ? grading.raw : null,
      bandScore: grading ? grading.band : null,
      approximate: grading ? grading.approximate : false,
      mistakes: grading ? grading.mistakes : []
    });
    // 错题派生索引
    if (grading) {
      for (const m of grading.mistakes) {
        store.insert('mistakes', {
          practiceId: record.id,
          date: record.date,
          section,
          questionType: m.questionType || 'unknown',
          wrongReason: m.wrongReason || 'unclassified',
          note: m.note || ''
        });
      }
    }
    res.json(record);
  });

  router.get('/', (req, res) => {
    const { section, from, to } = req.query;
    let list = store.all('practices');
    if (section) list = list.filter(p => p.section === section);
    if (from) list = list.filter(p => p.date >= from);
    if (to) list = list.filter(p => p.date <= to);
    list.sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json(list);
  });

  router.get('/:id', (req, res) => {
    const item = store.findById('practices', req.params.id);
    if (!item) return res.status(404).json({ error: '未找到' });
    res.json(item);
  });

  router.delete('/:id', (req, res) => {
    const ok = store.remove('practices', req.params.id);
    if (!ok) return res.status(404).json({ error: '未找到' });
    res.json({ ok: true });
  });

  return router;
};
