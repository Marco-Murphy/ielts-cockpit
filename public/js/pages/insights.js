// insights.js - 学习感悟 / 规律库
// 记录做题中悟出的规律、复盘发现，可随时补充
import { api } from '../api.js';

const CATS = [
  { id: 'all', name: '全部' },
  { id: 'listening', name: '听力' },
  { id: 'reading', name: '阅读' },
  { id: 'vocab', name: '词汇' },
  { id: 'method', name: '方法论' },
];

const CAT_NAME = { listening: '听力', reading: '阅读', vocab: '词汇', method: '方法论' };

export async function renderInsights(el) {
  const tab = new URLSearchParams(location.hash.split('?')[1]).get('cat') || 'all';
  const list = await api.get(`/api/insights${tab !== 'all' ? '?category=' + tab : ''}`).catch(() => []);

  el.innerHTML = `
    <div class="collection-toolbar">
      <p class="toolbar-note">把想通的规律留下来，下次遇见就能认出来。</p>
      <div class="toolbar-tabs">
        ${CATS.map(c => `<button class="btn ${c.id===tab?'':'btn-secondary'}" data-tab="${c.id}">${c.name}</button>`).join('')}
      </div>
    </div>

    <div class="card">
      <h3>记一条新感悟</h3>
      <label>一句话标题（可选）</label>
      <input id="i-tag" placeholder="如：并列列举项可任取其一做选项主语">
      <label>规律 / 感悟内容</label>
      <textarea id="i-content" rows="3" placeholder="详细写：发现了什么规律、适用于什么题型、有什么边界"></textarea>
      <div class="grid-2" style="margin-top:0">
        <div>
          <label>分类</label>
          <select id="i-cat">
            <option value="listening">听力</option>
            <option value="reading">阅读</option>
            <option value="vocab">词汇</option>
            <option value="method">方法论</option>
          </select>
        </div>
        <div>
          <label>来源（可选）</label>
          <input id="i-source" placeholder="如：剑5-T3-S2-Q17">
        </div>
      </div>
      <div style="margin-top:12px"><button class="btn" id="i-add">保存感悟</button></div>
    </div>

    <div class="card">
      <h3>规律列表${tab!=='all' ? ` · ${CAT_NAME[tab]}` : ''}（${list.length} 条）</h3>
      <div id="i-list">${list.length ? '' : '<p class="muted">还没有记录，从上面添加第一条吧。</p>'}</div>
    </div>
  `;

  CATS.forEach(c => {
    el.querySelector(`[data-tab="${c.id}"]`).addEventListener('click', () => {
      location.hash = `#/insights?cat=${c.id}`;
    });
  });

  el.querySelector('#i-add').addEventListener('click', async () => {
    const tag = el.querySelector('#i-tag').value.trim();
    const content = el.querySelector('#i-content').value.trim();
    const category = el.querySelector('#i-cat').value;
    const source = el.querySelector('#i-source').value.trim();
    if (!content) { alert('请填写感悟内容'); return; }
    try {
      await api.post('/api/insights', { tag, content, category, source });
      el.querySelector('#i-tag').value = '';
      el.querySelector('#i-content').value = '';
      el.querySelector('#i-source').value = '';
      renderInsights(el);
    } catch (e) { alert('失败：' + e.message); }
  });

  const box = el.querySelector('#i-list');
  list.forEach(v => {
    const div = document.createElement('div');
    div.style.cssText = 'padding:12px 0;border-bottom:1px solid var(--border);';
    div.innerHTML = `
      ${v.tag ? `<strong>${escapeHtml(v.tag)}</strong><br>` : ''}
      <div style="font-size:13px;line-height:1.6;white-space:pre-wrap">${escapeHtml(v.content)}</div>
      <div style="margin-top:6px;display:flex;align-items:center;flex-wrap:wrap;gap:6px">
        <span class="tag">${CAT_NAME[v.category] || v.category}</span>
        ${v.source ? `<span class="tag">${escapeHtml(v.source)}</span>` : ''}
        <span class="muted" style="font-size:11px;flex:1">${fmtDate(v.createdAt)}</span>
        <button class="icon-btn" data-i-del="${v.id}" title="删除" style="font-size:12px">✕</button>
      </div>
    `;
    box.appendChild(div);
  });

  box.querySelectorAll('[data-i-del]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('确定删除这条感悟？')) return;
      await api.del(`/api/insights/${btn.dataset.iDel}`);
      renderInsights(el);
    });
  });
}

function fmtDate(s) {
  const d = new Date(s);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}
