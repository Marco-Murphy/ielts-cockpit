// checkin.js - 打卡页：今日打卡 + 历史查看/编辑 + 补录
import { api } from '../api.js';

export async function renderCheckin(el) {
  const today = localToday();

  const [list, streak] = await Promise.all([
    api.get('/api/checkins').catch(() => []),
    api.get('/api/checkins/streak').catch(() => ({ current: 0, longest: 0 })),
  ]);

  const data = list.find(c => c.date === today) || null;
  const history = list.filter(c => c.date !== today);

  el.innerHTML = `
    <div class="card center">
      <h3>今日打卡</h3>
      <div class="stat-big">🔥 ${streak.current}</div>
      <div class="stat-label">连续天数（最长 ${streak.longest}）</div>
    </div>

    <div class="card">
      <h3>${data ? '今日已打卡 ✓' : '今日尚未打卡'}</h3>
      <label>学习时长（分钟）</label>
      <input type="number" id="minutes" value="${data ? data.minutes : 60}" min="0" max="600">
      <label>今天做了什么（逗号分隔）</label>
      <input type="text" id="items" value="${data ? data.items.join(', ') : ''}" placeholder="剑桥5-T1-S2精听, 背15个高频词">
      <label>一句话笔记</label>
      <input type="text" id="note" value="${data ? data.note : ''}" placeholder="今天感觉...">
      <div style="margin-top:16px">
        <button class="btn" id="save">${data ? '更新' : '打卡'}</button>
      </div>
    </div>

    <div class="card">
      <h3>补录历史（漏打卡时用）</h3>
      <label>选择日期</label>
      <input type="date" id="backdate" value="">
      <label>学习时长（分钟）</label>
      <input type="number" id="back-minutes" value="60" min="0" max="600">
      <label>当天做了什么（逗号分隔）</label>
      <input type="text" id="back-items" placeholder="剑桥5-T1-S4精听">
      <label>一句话笔记</label>
      <input type="text" id="back-note" placeholder="当天没来得及记录">
      <div style="margin-top:16px">
        <button class="btn btn-secondary" id="back-save">补录这一天</button>
      </div>
    </div>

    <div class="card">
      <h3>历史记录（共 ${history.length} 天）</h3>
      <div id="history-list">${history.length ? '' : '<p class="muted">还没有历史记录</p>'}</div>
    </div>
  `;

  // 今日打卡 / 更新
  el.querySelector('#save').addEventListener('click', async () => {
    const minutes = parseInt(el.querySelector('#minutes').value, 10);
    const items = el.querySelector('#items').value.split(',').map(s => s.trim()).filter(Boolean);
    const note = el.querySelector('#note').value;
    try {
      if (data) {
        await api.patch(`/api/checkins/${data.id}`, { minutes, items, note });
      } else {
        await api.post('/api/checkins', { date: today, minutes, items, note });
      }
      alert('打卡成功！');
      renderCheckin(el);
    } catch (e) { alert('失败：' + e.message); }
  });

  // 补录过去某天
  el.querySelector('#back-save').addEventListener('click', async () => {
    const date = el.querySelector('#backdate').value;
    if (!date) { alert('请先选择日期'); return; }
    const minutes = parseInt(el.querySelector('#back-minutes').value, 10);
    const items = el.querySelector('#back-items').value.split(',').map(s => s.trim()).filter(Boolean);
    const note = el.querySelector('#back-note').value;
    try {
      const existed = list.find(c => c.date === date);
      if (existed) {
        await api.patch(`/api/checkins/${existed.id}`, { minutes, items, note });
        alert('当天已有记录，已更新！');
      } else {
        await api.post('/api/checkins', { date, minutes, items, note });
        alert('补录成功！');
      }
      renderCheckin(el);
    } catch (e) { alert('失败：' + e.message); }
  });

  // 渲染历史列表（每条带"编辑"）
  history.forEach(c => {
    const row = document.createElement('div');
    row.className = 'history-item';
    row.style.cssText = 'padding:10px 0;border-bottom:1px solid var(--border);';
    row.innerHTML = `
      <div class="row" style="justify-content:space-between">
        <strong>${formatDate(c.date)}</strong>
        <span class="tag">${c.minutes} min</span>
      </div>
      <div class="muted" style="font-size:13px">${c.items && c.items.length ? c.items.join(' · ') : '（无内容记录）'}</div>
      ${c.note ? `<div style="font-size:12px;margin-top:4px">📝 ${escapeHtml(c.note)}</div>` : ''}
      <div style="margin-top:6px">
        <button class="btn btn-secondary" style="padding:2px 10px;font-size:12px" data-edit="${c.id}">编辑</button>
      </div>
    `;
    el.querySelector('#history-list').appendChild(row);
  });

  // 编辑：把历史记录载入顶部表单对应的日期占位 —— 直接行内展开编辑表单
  el.querySelectorAll('[data-edit]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-edit');
      const item = list.find(c => c.id === id);
      if (!item) return;
      // 切换成行内编辑区
      const wrap = btn.closest('.history-item');
      const editBox = document.createElement('div');
      editBox.style.cssText = 'margin-top:8px;padding:8px;background:var(--bg-hover);border-radius:8px;';
      editBox.innerHTML = `
        <div class="row">
          <input type="date" id="edit-date-${id}" value="${item.date}" style="flex:1">
        </div>
        <label style="font-size:12px;margin-top:6px">时长（分钟）</label>
        <input type="number" id="edit-min-${id}" value="${item.minutes}" min="0" max="600">
        <label style="font-size:12px">做了什么（逗号分隔）</label>
        <input type="text" id="edit-items-${id}" value="${item.items.join(', ')}">
        <label style="font-size:12px">一句话笔记</label>
        <input type="text" id="edit-note-${id}" value="${escapeAttr(item.note || '')}">
        <div class="row" style="margin-top:8px">
          <button class="btn" id="edit-save-${id}" style="padding:2px 12px;font-size:12px">保存</button>
          <button class="btn btn-danger" id="edit-del-${id}" style="padding:2px 12px;font-size:12px">删除</button>
          <button class="btn btn-secondary" id="edit-cancel-${id}" style="padding:2px 12px;font-size:12px">取消</button>
        </div>
      `;
      wrap.appendChild(editBox);
      btn.style.display = 'none';

      el.querySelector(`#edit-save-${id}`).addEventListener('click', async () => {
        const date = el.querySelector(`#edit-date-${id}`).value;
        const minutes = parseInt(el.querySelector(`#edit-min-${id}`).value, 10);
        const items = el.querySelector(`#edit-items-${id}`).value.split(',').map(s => s.trim()).filter(Boolean);
        const note = el.querySelector(`#edit-note-${id}`).value;
        try {
          await api.patch(`/api/checkins/${id}`, { date, minutes, items, note });
          alert('已保存');
          renderCheckin(el);
        } catch (e) { alert('失败：' + e.message); }
      });

      el.querySelector(`#edit-del-${id}`).addEventListener('click', async () => {
        if (!confirm('确定删除这条打卡记录？')) return;
        try {
          await api.del(`/api/checkins/${id}`);
          alert('已删除');
          renderCheckin(el);
        } catch (e) { alert('失败：' + e.message); }
      });

      el.querySelector(`#edit-cancel-${id}`).addEventListener('click', () => {
        editBox.remove();
        btn.style.display = '';
      });
    });
  });
}

function localToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDate(s) {
  const d = new Date(s + 'T00:00:00');
  const days = ['日','一','二','三','四','五','六'];
  return `${d.getMonth() + 1}月${d.getDate()}日 周${days[d.getDay()]}`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function escapeAttr(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}
