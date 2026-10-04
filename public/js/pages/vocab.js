// vocab.js - 同义替换 / 生词本
import { api } from '../api.js';

export async function renderVocab(el) {
  const [stats, practicedSources] = await Promise.all([
    api.get('/api/vocab/stats').catch(() => ({})),
    api.get('/api/vocab/practiced-sources').catch(() => [])
  ]);
  const tab = new URLSearchParams(location.hash.split('?')[1]).get('tab') || 'synonym';
  const tabs = [
    { id: 'synonym', name: `同义替换 (${stats.byType?.synonym||0})` },
    { id: 'scene_word', name: `听力场景词 (${stats.byType?.scene_word||0})` },
    { id: 'vocab', name: `阅读生词 (${stats.byType?.vocab||0})` },
  ];

  el.innerHTML = `
    <div class="collection-toolbar">
      <p class="toolbar-note">按场景整理。已关联出处 ${stats.withOrigin || 0} 条，其中原卷核实 ${stats.verifiedOrigin || 0} 条。</p>
      <div class="toolbar-tabs">
        ${tabs.map(t => `<button class="btn ${t.id===tab?'':'btn-secondary'}" data-tab="${t.id}">${t.name}</button>`).join('')}
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
      <div class="meaning-lookup" id="meaning-lookup" aria-live="polite"></div>
      <label>来源（可选，如 剑19-T1阅读）</label>
      <input id="f-source" placeholder="例：剑19-T1 阅读 Pass2">
      ${practicedSources.length ? `<label>从打卡记录选已练篇目</label>
        <select id="f-practiced-source">
          <option value="">手动填写或选择</option>
          ${practicedSources.map((item, index) => `<option value="${index}">剑${item.book} · Test ${item.test} · ${item.skill === 'reading' ? '阅读 Passage' : '听力 Section'} ${item.part} · ${h(item.date)}</option>`).join('')}
        </select>` : ''}
      ${tab!=='synonym' ? `
        <label>初级替换（可选）——你早就认识的简单说法，用它记住高级词</label>
        <input id="f-basic" placeholder="merge 的初级替换填：combine">
        <label>用法差异（一句话，可选）</label>
        <input id="f-basicnote" placeholder="merge 强调融合成一体，combine 泛指联合">
      ` : ''}
      <label>备注/例句（可选）</label>
      <input id="f-note" placeholder="放一个用到它的句子或你的记忆点">
      <details class="vocab-origin-editor">
        <summary>原文原题 · 记录它出现在哪篇、哪道题</summary>
        ${originFields(null, tab)}
      </details>
      <div style="margin-top:12px"><button class="btn" id="add">添加</button></div>
    </div>

    <div class="card">
      <h3>列表 ${tab==='synonym'?'· 记一次复习一次':''}</h3>
      <div class="vocab-filters" aria-label="出处筛选">
        <button class="btn btn-secondary is-active" data-origin-filter="all">全部</button>
        <button class="btn btn-secondary" data-origin-filter="linked">已关联</button>
        <button class="btn btn-secondary" data-origin-filter="unverified">待核对</button>
        <button class="btn btn-secondary" data-origin-filter="verified">原卷核实</button>
      </div>
      <div id="list"><div class="loading">加载中...</div></div>
    </div>
  `;

  // Tab 切换
  tabs.forEach(t => {
    el.querySelector(`[data-tab="${t.id}"]`).addEventListener('click', () => {
      location.hash = `#/vocab?tab=${t.id}`;
    });
  });

  el.querySelector('#f-practiced-source')?.addEventListener('change', event => {
    if (event.target.value === '') return;
    const selected = practicedSources[Number(event.target.value)];
    if (!selected) return;
    const details = el.querySelector('.card .vocab-origin-editor');
    details.open = true;
    const form = details.querySelector('[data-origin-form]');
    for (const key of ['book', 'test', 'skill', 'part']) {
      form.querySelector(`[data-field="${key}"]`).value = selected[key];
    }
    form.querySelector('[data-field="practiceDate"]').value = selected.date;
    const source = el.querySelector('#f-source');
    if (!source.value.trim()) source.value = `剑${selected.book}-T${selected.test}-${selected.skill === 'reading' ? 'P' : 'S'}${selected.part}`;
  });

  const wordInput = el.querySelector('#f-word');
  const meaningInput = el.querySelector('#f-meaning');
  const suggestion = el.querySelector('#meaning-lookup');
  let lookupTimer;
  let lookupVersion = 0;
  wordInput.addEventListener('input', () => {
    clearTimeout(lookupTimer);
    const word = wordInput.value.trim();
    const version = ++lookupVersion;
    suggestion.replaceChildren();
    if (!/^[a-z][a-z -]{1,79}$/i.test(word)) return;
    suggestion.textContent = '正在查找中文释义…';
    lookupTimer = setTimeout(async () => {
      try {
        const result = await api.get(`/api/vocab/lookup?word=${encodeURIComponent(word)}`);
        if (version !== lookupVersion || !wordInput.isConnected) return;
        suggestion.replaceChildren();
        if (!result.meaning) {
          suggestion.textContent = '本地词典暂未收录，可以自己填写释义。';
          return;
        }
        const label = document.createElement('span');
        label.className = 'meaning-lookup-text';
        label.textContent = `词典建议：${result.meaning}`;
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'btn btn-secondary meaning-lookup-apply';
        button.textContent = '采用释义';
        button.addEventListener('click', () => {
          meaningInput.value = result.meaning;
          meaningInput.focus();
          meaningInput.setSelectionRange(meaningInput.value.length, meaningInput.value.length);
        });
        suggestion.append(label, button);
      } catch {
        if (version === lookupVersion && wordInput.isConnected) {
          suggestion.textContent = '暂时无法查词，可以自己填写释义。';
        }
      }
    }, 320);
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
    const origin = readOrigin(el.querySelector('.card [data-origin-form]'));
    if (!word) { alert('请至少填词'); return; }
    try {
      await api.post('/api/vocab', { type: tab, word, alternate, meaning, basic, basicNote, source, note, origin });
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
  let originFilter = 'all';
  el.querySelectorAll('[data-origin-filter]').forEach(button => {
    button.addEventListener('click', () => {
      originFilter = button.dataset.originFilter;
      el.querySelectorAll('[data-origin-filter]').forEach(item => {
        item.classList.toggle('is-active', item === button);
      });
      loadList(el, tab, originFilter);
    });
  });
  await loadList(el, tab, originFilter);
}

function h(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
}

function originFields(origin, type) {
  const o = origin || {};
  const skill = o.skill || (type === 'vocab' ? 'reading' : type === 'scene_word' ? 'listening' : '');
  return `
    <div class="vocab-origin-fields" data-origin-form>
      <div class="grid-2">
        <label>剑桥册数<input data-field="book" type="number" min="1" max="30" value="${h(o.book)}" placeholder="5"></label>
        <label>Test<input data-field="test" type="number" min="1" max="4" value="${h(o.test)}" placeholder="1"></label>
        <label>练习类型<select data-field="skill">
          <option value="">选择</option>
          <option value="reading" ${skill === 'reading' ? 'selected' : ''}>阅读</option>
          <option value="listening" ${skill === 'listening' ? 'selected' : ''}>听力</option>
        </select></label>
        <label>Passage / Section<input data-field="part" type="number" min="1" max="4" value="${h(o.part)}" placeholder="2"></label>
        <label>文章或场景标题<input data-field="title" value="${h(o.title)}" placeholder="Early Childhood Education"></label>
        <label>题号<input data-field="questionRef" value="${h(o.questionRef)}" placeholder="Q22，或 Q14–16"></label>
        <label>练习日期<input data-field="practiceDate" type="date" value="${h(o.practiceDate)}"></label>
        <label>PDF 页码<input data-field="pdfPage" type="number" min="1" max="2000" value="${h(o.pdfPage)}" placeholder="21"></label>
      </div>
      <label>原题内容<textarea data-field="questionText" rows="2" placeholder="摘录与这个词有关的题干或选项">${h(o.questionText)}</textarea></label>
      <label>原文证据<textarea data-field="evidence" rows="2" placeholder="摘录含有这个词的原文句子">${h(o.evidence)}</textarea></label>
      <label>原卷链接<input data-field="pdfUrl" type="url" value="${h(o.pdfUrl)}" placeholder="https://..."></label>
      <label class="vocab-origin-check"><input data-field="verified" type="checkbox" ${o.verified ? 'checked' : ''}>我已对照原卷核实这些内容</label>
    </div>`;
}

function readOrigin(form) {
  if (!form) return null;
  const value = name => form.querySelector(`[data-field="${name}"]`).value.trim();
  const origin = Object.fromEntries([
    'book', 'test', 'skill', 'part', 'title', 'questionRef', 'practiceDate',
    'questionText', 'evidence', 'pdfPage', 'pdfUrl'
  ].map(name => [name, value(name)]));
  origin.verified = form.querySelector('[data-field="verified"]').checked;
  if (!Object.entries(origin).some(([key, item]) => !['skill', 'verified'].includes(key) && item)) return null;
  return origin;
}

function originSummary(origin) {
  if (!origin) return '';
  const place = [origin.book && `剑${origin.book}`, origin.test && `Test ${origin.test}`,
    origin.skill === 'reading' ? '阅读' : origin.skill === 'listening' ? '听力' : '',
    origin.part && `${origin.skill === 'listening' ? 'Section' : 'Passage'} ${origin.part}`,
    origin.title, origin.questionRef].filter(Boolean).join(' · ');
  const link = origin.pdfUrl && /^https:\/\//i.test(origin.pdfUrl)
    ? `<a href="${h(origin.pdfUrl)}" target="_blank" rel="noopener noreferrer">打开原卷${origin.pdfPage ? ` · 第 ${h(origin.pdfPage)} 页` : ''}</a>` : '';
  return `<div class="vocab-origin-summary">
    <span class="vocab-origin-badge ${origin.verified ? 'is-verified' : ''}">${origin.verified ? '已核对原卷' : '待核对原卷'}</span>
    <strong>${h(place || '出处待补充')}</strong>
    ${origin.practiceDate ? `<small>练习于 ${h(origin.practiceDate)}</small>` : ''}
    ${link}
    ${origin.questionText ? `<p><span>原题</span> ${h(origin.questionText)}</p>` : ''}
    ${origin.evidence ? `<p><span>原文</span> ${h(origin.evidence)}</p>` : ''}
  </div>`;
}

function compareVocabSource(a, b) {
  const number = (value) => Number.isInteger(Number(value)) && Number(value) > 0 ? Number(value) : Infinity;
  const order = (entry) => {
    const origin = entry.origin || {};
    const question = String(origin.questionRef || '').match(/\bQ\s*(\d+)/i);
    return [number(origin.book), number(origin.test), origin.skill === 'listening' ? 0 : origin.skill === 'reading' ? 1 : 2, number(origin.part), question ? Number(question[1]) : Infinity];
  };
  const left = order(a);
  const right = order(b);
  for (let i = 0; i < left.length; i++) {
    if (left[i] !== right[i]) return left[i] - right[i];
  }
  return String(a.createdAt || '').localeCompare(String(b.createdAt || '')) || String(a.word || '').localeCompare(String(b.word || ''));
}

async function loadList(el, tab, originFilter = 'all') {
  let list = await api.get(`/api/vocab?type=${tab}`).catch(() => []);
  if (originFilter === 'linked') list = list.filter(v => v.origin);
  if (originFilter === 'unverified') list = list.filter(v => !v.origin?.verified);
  if (originFilter === 'verified') list = list.filter(v => v.origin?.verified);
  list.sort(compareVocabSource);
  const box = el.querySelector('#list');
  if (list.length === 0) {
    box.innerHTML = `<p class="muted">${originFilter === 'all' ? '还没有记录，从上面添加第一条吧。' : '这个筛选下暂时没有词条。'}</p>`;
    return;
  }
  box.innerHTML = list.map((v, index) => `
    <article class="vocab-entry">
      <div class="vocab-entry-head">
        <div>
          <span class="vocab-entry-number" aria-label="第 ${index + 1} 个">${index + 1}.</span>
          ${v.type==='synonym' ? `
            <strong>${h(v.word)}</strong> <span class="muted">→ ${h(v.alternate)}</span>
            ${v.meaning ? `<span class="tag">${h(v.meaning)}</span>` : ''}
          ` : `
            <strong>${h(v.word)}</strong> ${v.meaning ? `<span class="muted">· ${h(v.meaning)}</span>` : ''}
            ${v.basic ? `<div class="vocab-basic">↳ 初级替换：<strong>${h(v.basic)}</strong>${v.basicNote ? `<span class="muted"> — ${h(v.basicNote)}</span>` : ''}</div>` : ''}
          `}
          <div class="subtle vocab-entry-notes">
            ${v.source ? `<span class="tag">${h(v.source)}</span> ` : ''}
            ${v.note ? h(v.note) : ''}
          </div>
        </div>
        <div class="row vocab-review-actions">
          <span class="vocab-review-count" data-review-count aria-live="polite">已复习 ${h(v.reviewCount || 0)} 次</span>
          <button class="btn btn-secondary" data-review="${h(v.id)}">复习一次</button>
          <button class="icon-btn" data-del="${h(v.id)}" title="删除">✕</button>
          <span class="vocab-review-feedback" aria-live="polite"></span>
        </div>
      </div>
      ${originSummary(v.origin)}
      <details class="vocab-origin-editor">
        <summary>${v.origin ? '查看或修改原文原题' : '补上原文原题'}</summary>
        ${originFields(v.origin, v.type)}
        <button class="btn btn-secondary" data-origin-save="${h(v.id)}">保存出处</button>
        <span class="vocab-origin-feedback" aria-live="polite"></span>
      </details>
    </article>
  `).join('');

  box.querySelectorAll('[data-review]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const actions = btn.closest('.vocab-review-actions');
      const feedback = actions.querySelector('.vocab-review-feedback');
      btn.disabled = true;
      feedback.textContent = '';
      try {
        const result = await api.post(`/api/vocab/${encodeURIComponent(btn.dataset.review)}/review`, {});
        actions.querySelector('[data-review-count]').textContent = `已复习 ${result.reviewCount} 次`;
      } catch (error) {
        feedback.textContent = `记录失败：${error.message}`;
      } finally {
        btn.disabled = false;
      }
    });
  });
  box.querySelectorAll('[data-del]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('确定删除？')) return;
      await api.del(`/api/vocab/${btn.dataset.del}`);
      loadList(el, tab, originFilter);
    });
  });
  box.querySelectorAll('[data-origin-save]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const editor = btn.closest('.vocab-origin-editor');
      const feedback = editor.querySelector('.vocab-origin-feedback');
      btn.disabled = true;
      feedback.textContent = '保存中…';
      try {
        await api.patch(`/api/vocab/${encodeURIComponent(btn.dataset.originSave)}`, {
          origin: readOrigin(editor.querySelector('[data-origin-form]'))
        });
        const updatedStats = await api.get('/api/vocab/stats');
        el.querySelector('.toolbar-note').textContent = `按场景整理。已关联出处 ${updatedStats.withOrigin || 0} 条，其中原卷核实 ${updatedStats.verifiedOrigin || 0} 条。`;
        await loadList(el, tab, originFilter);
      } catch (error) {
        feedback.textContent = `保存失败：${error.message}`;
        btn.disabled = false;
      }
    });
  });
}
