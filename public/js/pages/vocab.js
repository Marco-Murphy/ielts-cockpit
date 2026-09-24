// vocab.js - 同义替换 / 生词本
import { api } from '../api.js';

export async function renderVocab(el) {
  const stats = await api.get('/api/vocab/stats').catch(() => ({}));
  const tab = new URLSearchParams(location.hash.split('?')[1]).get('tab') || 'synonym';
  const tabs = [
    { id: 'synonym', name: `同义替换 (${stats.byType?.synonym||0})` },
    { id: 'scene_word', name: `听力场景词 (${stats.byType?.scene_word||0})` },
    { id: 'vocab', name: `阅读生词 (${stats.byType?.vocab||0})` },
  ];

  el.innerHTML = `
    <div class="card">
      <h3>生词本 / 同义替换本</h3>
      <p class="subtle">做阅读时把"题目↔原文"的替换词对、听力里听不懂的场景词、阅读生词随手记进来，养成积累习惯。</p>
      <div class="row" style="margin-top:12px">
        ${tabs.map(t => `<button class="btn ${t.id===tab?'':'btn-secondary'}" data-tab="${t.id}" style="margin-right:4px">${t.name}</button>`).join('')}
      </div>
    </div>

    <div class="card">
      <h3>${tab==='synonym' ? '新增同义替换词对' : tab==='scene_word' ? '新增听力场景词' : '新增阅读生词'}</h3>
      ${tab==='synonym' ? `
        <div class="grid-2">
          <div><label>原文词（卷子上出现的）</label><input id="f-word" placeholder="main cause"></div>
          <div><label>替换词（原文里的）</label><input id="f-alternate" placeholder="primarily due to"></div>
        </div>
        <label>中文意思（这对词的意思）</label>
        <input id="f-meaning" placeholder="主要原因 / 主要是由于">
      ` : `
        <div class="grid-2">
          <div><label>单词</label><input id="f-word" placeholder="synthesize"></div>
          <div><label>释义</label><input id="f-meaning" placeholder="综合, 合成"></div>
        </div>
      `}
      <label>来源（可选，如 剑19-T1阅读）</label>
      <input id="f-source" placeholder="例：剑19-T1 阅读 Pass2">
      ${tab!=='synonym' ? `
        <label>初级替换（可选）——你早就认识的简单说法，用它记住高级词</label>
        <input id="f-basic" placeholder="merge 的初级替换填：combine">
        <label>用法差异（一句话，可选）</label>
        <input id="f-basicnote" placeholder="merge 强调融合成一体，combine 泛指联合">
      ` : ''}
      <label>备注/例句（可选）</label>
      <input id="f-note" placeholder="放一个用到它的句子或你的记忆点">
      <div style="margin-top:12px"><button class="btn" id="add">添加</button></div>
    </div>

    <div class="card">
      <h3>列表 ${tab==='synonym'?'· 记一次复习一次':''}</h3>
      <div id="list"><div class="loading">加载中...</div></div>
    </div>
  `;

  // Tab 切换
  tabs.forEach(t => {
    el.querySelector(`[data-tab="${t.id}"]`).addEventListener('click', () => {
      location.hash = `#/vocab?tab=${t.id}`;
    });
  });

  // 新增
  el.querySelector('#add').addEventListener('click', async () => {
    const word = el.querySelector('#f-word').value.trim();
    const alternate = el.querySelector('#f-alternate')?.value.trim() || '';
    const meaning = el.querySelector('#f-meaning')?.value.trim() || '';
    const source = el.querySelector('#f-source').value.trim();
    const basic = el.querySelector('#f-basic')?.value.trim() || '';
    const basicNote = el.querySelector('#f-basicnote')?.value.trim() || '';
    const note = el.querySelector('#f-note').value.trim();
    if (!word) { alert('请至少填词'); return; }
    try {
      await api.post('/api/vocab', { type: tab, word, alternate, meaning, basic, basicNote, source, note });
      el.querySelector('#f-word').value = '';
      if (el.querySelector('#f-alternate')) el.querySelector('#f-alternate').value = '';
      if (el.querySelector('#f-meaning')) el.querySelector('#f-meaning').value = '';
      if (el.querySelector('#f-basic')) el.querySelector('#f-basic').value = '';
      if (el.querySelector('#f-basicnote')) el.querySelector('#f-basicnote').value = '';
      el.querySelector('#f-source').value = '';
      el.querySelector('#f-note').value = '';
      renderVocab(el);
    } catch (e) { alert('失败：' + e.message); }
  });

  // 列表
  await loadList(el, tab);
}

async function loadList(el, tab) {
  const list = await api.get(`/api/vocab?type=${tab}`).catch(() => []);
  const box = el.querySelector('#list');
  if (list.length === 0) {
    box.innerHTML = `<p class="muted">还没有记录，从上面添加第一条吧。</p>`;
    return;
  }
  box.innerHTML = list.map(v => `
    <div style="padding:10px 0;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">
      <div>
        ${v.type==='synonym' ? `
          <strong>${v.word}</strong> <span class="muted">→ ${v.alternate}</span>
          ${v.meaning ? `<span class="tag" style="margin-left:6px">${v.meaning}</span>` : ''}
        ` : `
          <strong>${v.word}</strong> ${v.meaning ? `<span class="muted">· ${v.meaning}</span>` : ''}
          ${v.basic ? `<div style="font-size:12px;margin-top:2px;color:var(--color-success,#7ecf8a)">↳ 初级替换：<strong>${v.basic}</strong>${v.basicNote ? `<span class="muted"> — ${v.basicNote}</span>` : ''}</div>` : ''}
        `}
        <div class="subtle" style="font-size:12px">
          ${v.source ? `<span class="tag">${v.source}</span> ` : ''}
          ${v.note ? v.note : ''}
          ${v.learned ? '<span class="badge badge-good" style="margin-left:4px">已掌握</span>' : '<span class="badge badge-warn" style="margin-left:4px">待复习</span>'}
        </div>
      </div>
      <div class="row">
        <button class="btn btn-secondary" data-learn="${v.id}" style="font-size:12px;padding:4px 10px">${v.learned?'已掌握✓':'标记掌握'}</button>
        <button class="icon-btn" data-del="${v.id}" title="删除" style="font-size:12px">✕</button>
      </div>
    </div>
  `).join('');

  box.querySelectorAll('[data-learn]').forEach(btn => {
    btn.addEventListener('click', async () => {
      await api.patch(`/api/vocab/${btn.dataset.learn}`, { learned: true });
      loadList(el, tab);
    });
  });
  box.querySelectorAll('[data-del]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('确定删除？')) return;
      await api.del(`/api/vocab/${btn.dataset.del}`);
      loadList(el, tab);
    });
  });
}
