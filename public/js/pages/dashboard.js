// dashboard.js - 总览：倒计时、打卡、四科水平 vs 目标缺口、目标模拟器
import { api } from '../api.js';

export async function renderDashboard(el) {
  const d = await api.get('/api/dashboard');
  const t = d.target || { listening: 8, reading: 8, speaking: 7, writing: 6.5 };
  const hasBaseline = !!d.baseline || Object.values(d.latestBySection || {}).length > 0;

  const sections = ['listening', 'reading', 'speaking', 'writing'];
  const sectionCN = { listening: '听力', reading: '阅读', speaking: '口语', writing: '写作' };

  el.innerHTML = `
    <div class="card anchor-card">
      <div class="anchor-quote" id="anchor-quote">${pickAnchor(d.anchors)}</div>
      <div class="anchor-save">
        <span class="anchor-save-num">${(Math.round(((d.totalMinutes || 0) / 60) * 10) / 10)}</span>
        <span class="anchor-save-unit">小时已存入</span>
      </div>
      <div class="anchor-meta">
        共投入 ${fmtMinutes(d.totalMinutes || 0)} · 打卡 ${d.totalDays || 0} 天 · 连续 ${d.streak} 天
      </div>
    </div>

    <div class="card center">
      <div class="stat-big">${d.daysToExam ?? '—'}</div>
      <div class="stat-label">距考试天数${d.profile?.examTargetDate ? `（目标 ${d.profile.examTargetDate}）` : '（未设置考试日期）'}</div>
    </div>

    <div class="grid-2">
      <div class="card">
        <h3>今日状态</h3>
        ${d.todayCheckin ? `
          <p>✅ 已打卡 ${d.todayCheckin.minutes} 分钟</p>
          <p class="muted">${(d.todayCheckin.items||[]).join('、')}</p>
        ` : `<p class="muted">今日尚未打卡</p>`}
        <p style="margin-top:8px">🔥 连续 <strong>${d.streak}</strong> 天</p>
        <a href="#/checkin" class="btn btn-secondary" style="display:inline-block;margin-top:8px">去打卡</a>
      </div>
      <div class="card">
        <h3>目标组合</h3>
        <p>听力 ${t.listening} · 阅读 ${t.reading} · 口语 ${t.speaking} · 写作 ${t.writing}</p>
        <p class="muted">目标总分 = 四项平均 = ${calcAvg(t)} （7.5 升学线）</p>
        ${t.writing < 6.5 ? '<p class="badge badge-bad">写作<6.5 难达7.5</p>' : '<p class="badge badge-good">写作6.5 达底线</p>'}
      </div>
    </div>

    <div class="card">
      <h3>各科当前水平 vs 目标</h3>
      ${!hasBaseline ? `
        <p class="muted">尚无任何成绩记录。</p>
        <p style="margin-top:12px">📌 <strong>第一步：做一次全真摸底模考</strong>（建议剑19），用真实分数定基线、看清差距。</p>
        <a href="#/mock-test" class="btn" style="display:inline-block;margin-top:8px">开始摸底</a>
      ` : `
        ${sections.map(k => {
          const cur = d.latestBySection?.[k]?.band;
          const gap = d.sectionGaps?.[k];
          const targetVal = t[k];
          const pct = cur != null ? Math.min(100, (cur/targetVal)*100) : 0;
          const met = gap != null && gap <= 0;
          return `
            <div style="margin-bottom:12px">
              <div class="row" style="justify-content:space-between">
                <span>${sectionCN[k]} <span class="tag">目标 ${targetVal}</span></span>
                <span>${cur != null ? `<strong>${cur}</strong> ${met ? '<span class="badge badge-good">达标</span>' : `<span class="badge badge-warn">差 ${gap}</span>`}` : '<span class="subtle">未测</span>'}</span>
              </div>
              <div class="progress-bar" style="margin-top:4px"><div style="width:${pct}%;background:${met?'var(--success)':'var(--warning)'}"></div></div>
            </div>
          `;
        }).join('')}
      `}
    </div>

    <div class="card">
      <h3>目标组合模拟器</h3>
      <p class="subtle">拖动滑块试不同组合，看总分能否到 7.5</p>
      ${sections.map(k => `
        <label>${sectionCN[k]}</label>
        <div class="row">
          <input type="range" id="sim-${k}" min="5" max="9" step="0.5" value="${t[k]}" style="flex:1">
          <span id="sval-${k}" style="width:40px;font-weight:700">${t[k]}</span>
        </div>
      `).join('')}
      <div id="simOut" style="margin-top:12px"></div>
    </div>
  `;

  // 模拟器逻辑
  const updateSim = () => {
    const combo = {};
    for (const k of sections) {
      combo[k] = parseFloat(el.querySelector(`#sim-${k}`).value);
      el.querySelector(`#sval-${k}`).textContent = combo[k];
    }
    const total = calcAvg(combo.listening, combo.reading, combo.speaking, combo.writing);
    const met = total >= 7.5 && combo.writing >= 6.5;
    const wWarn = combo.writing < 6.5 ? ' · 写作<6.5 难达7.5' : '';
    el.querySelector('#simOut').innerHTML = `四项平均 = <strong>${total}</strong> ${met ? '<span class="badge badge-good">可达7.5</span>' : `<span class="badge badge-warn">不足7.5</span>`}${wWarn}`;
  };
  sections.forEach(k => el.querySelector(`#sim-${k}`).addEventListener('input', updateSim));
  updateSim();
}

function calcAvg(l, r, s, w) {
  const a = ((l + r + s + w) / 4);
  return Math.round(a * 2) / 2;
}

function pickAnchor(list) {
  const arr = Array.isArray(list) && list.length ? list : ['我在给未来的自己存钱。'];
  return arr[Math.floor(Math.random() * arr.length)];
}

function fmtMinutes(m) {
  if (m < 60) return m + ' 分钟';
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return mm ? `${h} 小时 ${mm} 分` : `${h} 小时`;
}
