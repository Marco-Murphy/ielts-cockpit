// 日历打卡：日 / 月 / 年三个尺度，记录仍保存在本机服务端。
import { api } from '../api.js';

const weekdays = ['一', '二', '三', '四', '五', '六', '日'];
const viewNames = { day: '日', month: '月', year: '年' };
const keyOf = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const escapeAttr = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const fullDate = key => { const [y, m, d] = key.split('-').map(Number); return `${y} 年 ${m} 月 ${d} 日 · 周${'日一二三四五六'[new Date(y, m - 1, d).getDay()]}`; };
const statusOf = (key, byDate, today) => key > today ? 'is-future' : byDate.get(key)?.minutes > 0 ? 'is-practiced' : 'is-missed';

export async function renderCheckin(el) {
  const [records, streak] = await Promise.all([
    api.get('/api/checkins'),
    api.get('/api/checkins/streak').catch(() => ({ current: 0, longest: 0 })),
  ]);
  const today = keyOf(new Date());
  const byDate = new Map(records.map(record => [record.date, record]));
  const state = { view: 'day', year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) - 1, selected: today };

  function render() {
    const selected = byDate.get(state.selected);
    const practiced = records.filter(record => record.minutes > 0 && record.date <= today);
    const hours = Math.round(practiced.reduce((sum, record) => sum + record.minutes, 0) / 60 * 10) / 10;
    const thisMonth = practiced.filter(record => record.date.startsWith(today.slice(0, 7))).length;
    const period = state.view === 'day' ? `${state.year} 年 ${state.month + 1} 月` : state.view === 'month' ? `${state.year} 年` : `${Math.floor(state.year / 10) * 10} — ${Math.floor(state.year / 10) * 10 + 9}`;
    el.innerHTML = `
      <section class="rhythm-intro" aria-label="学习节奏概览">
        <div><p class="eyebrow">YOUR LEARNING RHYTHM</p><h2>每一天，都看得见。</h2><p>用颜色记录投入，点开日期即可补录或回看。</p></div>
        <div class="rhythm-stats"><div><strong>${streak.current}</strong><span>连续天数</span></div><div><strong>${thisMonth}</strong><span>本月练习天数</span></div><div><strong>${hours}</strong><span>累计小时</span></div></div>
      </section>
      <section class="calendar-panel" aria-label="打卡日历">
        <div class="calendar-toolbar">
          <div><p class="eyebrow">CALENDAR / 打卡记录</p><h3>${period}</h3></div>
          <div class="calendar-controls">
            <div class="calendar-zoom" aria-label="日历视图">${Object.entries(viewNames).map(([view, label]) => `<button type="button" data-view="${view}" class="${state.view === view ? 'active' : ''}" aria-pressed="${state.view === view}">${label}</button>`).join('')}</div>
            <button type="button" class="calendar-today" data-today>今天</button>
            <div class="calendar-arrows"><button type="button" data-step="-1" aria-label="上一个时间段">‹</button><button type="button" data-step="1" aria-label="下一个时间段">›</button></div>
          </div>
        </div>
        <div class="calendar-body">${state.view === 'day' ? dayGrid(state, byDate, today) : state.view === 'month' ? monthGrid(state, byDate, today) : yearGrid(state, byDate, today)}</div>
        <div class="calendar-legend"><span><i class="legend-dot is-practiced"></i>已练习</span><span><i class="legend-dot is-missed"></i>未练习</span><span><i class="legend-dot is-future"></i>未到来</span><span><i class="legend-dot is-today"></i>今天</span></div>
      </section>
      <section class="calendar-detail" aria-label="日期记录">
        <div class="detail-heading"><div><p class="eyebrow">DAY / 记录</p><h3>${fullDate(state.selected)}</h3><p>${state.selected > today ? '这一天还没有到来。' : selected?.minutes > 0 ? summarizeRecord(selected) : selected ? '当天有记录，学习时长为 0 分钟。' : state.selected === today ? '今天还没有打卡。' : '这一天还没有练习记录。'}</p></div><span class="detail-status ${statusOf(state.selected, byDate, today)}">${state.selected > today ? '未到来' : selected?.minutes > 0 ? '已练习' : '未练习'}</span></div>
        ${state.selected > today ? '<p class="detail-hint">未来的日期暂不能打卡；到了当天，就可以在这里记录。</p>' : `
          <form id="checkin-form" class="checkin-form">
            <div class="form-grid"><label>学习时长（分钟）<input name="minutes" type="number" min="0" max="600" step="1" required value="${selected ? Number(selected.minutes) || 0 : 60}"></label><label>练习内容（逗号分隔）<input name="items" type="text" value="${escapeAttr((selected?.items || []).join(', '))}" placeholder="精听、阅读、背词"></label></div>
            <label>一句话笔记<input name="note" type="text" value="${escapeAttr(selected?.note || '')}" placeholder="记录今天的收获"></label>
            <div class="form-actions"><button type="submit" class="btn">${selected ? '保存修改' : state.selected === today ? '完成今日打卡' : '补录这一天'}</button>${selected ? '<button type="button" class="btn btn-secondary" data-delete>删除记录</button>' : ''}<span id="checkin-feedback" role="status" aria-live="polite"></span></div>
          </form>`}
      </section>
      <footer class="page-footer">IELTS COCKPIT <span>·</span> ONE DAY AT A TIME.</footer>
    `;

    el.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => { state.view = button.dataset.view; render(); }));
    el.querySelector('[data-today]').addEventListener('click', () => { state.year = Number(today.slice(0, 4)); state.month = Number(today.slice(5, 7)) - 1; state.selected = today; state.view = 'day'; render(); });
    el.querySelectorAll('[data-step]').forEach(button => button.addEventListener('click', () => {
      const step = Number(button.dataset.step);
      if (state.view === 'day') { const date = new Date(state.year, state.month + step, 1); state.year = date.getFullYear(); state.month = date.getMonth(); }
      else state.year += step * (state.view === 'year' ? 10 : 1);
      render();
    }));
    el.querySelectorAll('[data-date]').forEach(button => button.addEventListener('click', () => { state.selected = button.dataset.date; render(); el.querySelector('.calendar-detail').scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }));
    el.querySelectorAll('[data-month]').forEach(button => button.addEventListener('click', () => { state.year = Number(button.dataset.year); state.month = Number(button.dataset.month); state.view = 'day'; render(); }));
    el.querySelectorAll('.calendar-year[data-year]').forEach(button => button.addEventListener('click', () => { state.year = Number(button.dataset.year); state.view = 'month'; render(); }));

    const form = el.querySelector('#checkin-form');
    form?.addEventListener('submit', async event => {
      event.preventDefault();
      const submit = form.querySelector('[type="submit"]');
      const feedback = el.querySelector('#checkin-feedback');
      const values = new FormData(form);
      const minutes = Number(values.get('minutes'));
      if (!Number.isInteger(minutes) || minutes < 0 || minutes > 600) { feedback.textContent = '时长请输入 0–600 分钟的整数。'; return; }
      const payload = { minutes, items: String(values.get('items')).split(/[,，]/).map(item => item.trim()).filter(Boolean), note: String(values.get('note')).trim() };
      submit.disabled = true;
      try {
        const result = selected ? await api.patch(`/api/checkins/${encodeURIComponent(selected.id)}`, payload) : await api.post('/api/checkins', { date: state.selected, ...payload });
        byDate.set(state.selected, result);
        if (selected) Object.assign(selected, result); else records.push(result);
        Object.assign(streak, await api.get('/api/checkins/streak').catch(() => streak));
        render();
        el.querySelector('#checkin-feedback').textContent = '已保存。';
      } catch (error) { feedback.textContent = `保存失败：${error.message}`; submit.disabled = false; }
    });
    el.querySelector('[data-delete]')?.addEventListener('click', async () => {
      if (!confirm(`删除 ${fullDate(state.selected)} 的打卡记录？`)) return;
      try {
        await api.del(`/api/checkins/${encodeURIComponent(selected.id)}`);
        byDate.delete(state.selected);
        records.splice(records.indexOf(selected), 1);
        Object.assign(streak, await api.get('/api/checkins/streak').catch(() => streak));
        render();
      } catch (error) { el.querySelector('#checkin-feedback').textContent = `删除失败：${error.message}`; }
    });
  }
  render();
}

function dayGrid(state, byDate, today) {
  const offset = (new Date(state.year, state.month, 1).getDay() + 6) % 7;
  const count = new Date(state.year, state.month + 1, 0).getDate();
  const cells = Array.from({ length: offset }, () => '<span class="calendar-empty" aria-hidden="true"></span>');
  for (let day = 1; day <= count; day++) {
    const key = keyOf(new Date(state.year, state.month, day));
    const record = byDate.get(key);
    const status = statusOf(key, byDate, today);
    const label = `${fullDate(key)}，${status === 'is-practiced' ? `练习 ${record.minutes} 分钟` : status === 'is-future' ? '未到来' : '未练习'}`;
    cells.push(`<button type="button" class="calendar-day ${status} ${key === today ? 'is-current' : ''} ${key === state.selected ? 'is-selected' : ''}" data-date="${key}" aria-label="${label}" aria-pressed="${key === state.selected}" ${key > today ? 'disabled' : ''}><span class="day-number">${day}</span><span class="day-mark">${status === 'is-practiced' ? `${record.minutes} min` : key === today ? '今天' : ''}</span></button>`);
  }
  return `<div class="calendar-weekdays">${weekdays.map(day => `<span>${day}</span>`).join('')}</div><div class="calendar-days">${cells.join('')}</div>`;
}

function summarizeRecord(record) {
  const content = (record.items || []).join(' ');
  const categories = [
    [/听|listening|section/i, '听'],
    [/读|reading|passage/i, '读'],
    [/词|vocab|单词/i, '词'],
    [/写|writing|作文/i, '写'],
    [/说|口语|speaking/i, '说'],
  ].filter(([pattern]) => pattern.test(content)).map(([, label]) => label);
  if (!categories.length) return `练习：${record.minutes} 分钟`;
  if (categories.length === 1) return `${categories[0]}：${record.minutes} 分钟`;
  // 历史记录只有每日总时长，没有各项用时；合计展示，避免虚构分项分钟数。
  return `${categories.join('＋')}：共 ${record.minutes} 分钟`;
}

function monthSummary(year, month, byDate, today) {
  const days = new Date(year, month + 1, 0).getDate();
  let elapsed = 0, practiced = 0, minutes = 0;
  const dots = [];
  for (let day = 1; day <= days; day++) {
    const key = keyOf(new Date(year, month, day));
    const status = statusOf(key, byDate, today);
    if (key <= today) elapsed++;
    if (status === 'is-practiced') { practiced++; minutes += byDate.get(key).minutes; }
    dots.push(`<i class="${status}" title="${month + 1}月${day}日"></i>`);
  }
  return { elapsed, practiced, minutes, dots: dots.join('') };
}

function monthGrid(state, byDate, today) {
  const cards = Array.from({ length: 12 }, (_, month) => {
    const summary = monthSummary(state.year, month, byDate, today);
    const future = !summary.elapsed;
    return `<button type="button" class="calendar-month ${future ? 'is-future' : ''}" data-year="${state.year}" data-month="${month}" aria-label="${state.year}年${month + 1}月，练习 ${summary.practiced} 天${future ? '，尚未到来' : ''}"><span class="month-top"><strong>${String(month + 1).padStart(2, '0')}</strong><span>${future ? '未到来' : `${summary.practiced} / ${summary.elapsed} 天`}</span></span><span class="month-dots">${summary.dots}</span><span class="month-bottom">${future ? '未来' : summary.minutes ? `${Math.round(summary.minutes / 60 * 10) / 10} 小时` : '尚无练习'}</span></button>`;
  });
  return `<div class="calendar-months">${cards.join('')}</div>`;
}

function yearGrid(state, byDate, today) {
  const start = Math.floor(state.year / 10) * 10;
  const cards = Array.from({ length: 10 }, (_, index) => {
    const year = start + index;
    const months = Array.from({ length: 12 }, (_, month) => monthSummary(year, month, byDate, today));
    const practiced = months.reduce((sum, month) => sum + month.practiced, 0);
    const elapsed = months.reduce((sum, month) => sum + month.elapsed, 0);
    const blocks = months.map(month => `<i class="${!month.elapsed ? 'is-future' : month.practiced ? 'is-practiced' : 'is-missed'}" style="--fill:${month.elapsed ? Math.round(month.practiced / month.elapsed * 100) : 0}%"></i>`).join('');
    return `<button type="button" class="calendar-year ${!elapsed ? 'is-future' : ''}" data-year="${year}" aria-label="${year}年，练习 ${practiced} 天${!elapsed ? '，尚未到来' : ''}"><strong>${year}</strong><span class="year-blocks">${blocks}</span><span>${!elapsed ? '未到来' : `练习 ${practiced} 天`}</span></button>`;
  });
  return `<div class="calendar-years">${cards.join('')}</div>`;
}
