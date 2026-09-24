// 总览：学习投入、考试倒计时、各科成绩与目标组合模拟
import { api } from '../api.js';

const sections = ['listening', 'reading', 'speaking', 'writing'];
const sectionCN = { listening: '听力', reading: '阅读', speaking: '口语', writing: '写作' };
const sectionEN = { listening: 'LISTENING', reading: 'READING', speaking: 'SPEAKING', writing: 'WRITING' };

export async function renderDashboard(el) {
  const d = await api.get('/api/dashboard');
  const t = d.target || { listening: 8, reading: 8, speaking: 7, writing: 6.5 };
  const hasBaseline = !!d.baseline || Object.values(d.latestBySection || {}).length > 0;
  const hours = Math.round(((d.totalMinutes || 0) / 60) * 10) / 10;
  const targetDate = d.profile?.examTargetDate || '尚未设置考试日期';
  const daysLabel = d.profile?.examTargetDate ? (d.daysToExam ?? '—') : '—';

  el.innerHTML = `
    <section class="hero" aria-label="学习总览">
      <div class="hero-copy">
        <p class="eyebrow hero-eyebrow">IELTS COCKPIT <span>·</span> PERSONAL STUDY STUDIO</p>
        <h1>每一次专注，<br><em>都有回响。</em></h1>
        <p class="hero-description">一场长期的积累，从今天的这一刻开始。</p>
        <div class="hero-actions">
          <a class="btn btn-hero" href="#/mock-test">开始练习 <span aria-hidden="true">↗</span></a>
          <a class="hero-text-link" href="#/checkin">记录今天 <span aria-hidden="true">→</span></a>
        </div>
      </div>
      <div class="hero-visual" aria-label="距考试 ${daysLabel} 天">
        <div class="orbit orbit-one"></div>
        <div class="orbit orbit-two"></div>
        <div class="orbit orbit-three"></div>
        <div class="orbit-core">
          <span class="orbit-label">DAYS TO GO</span>
          <strong>${daysLabel}</strong>
          <span class="orbit-date">${targetDate}</span>
        </div>
        <span class="orbit-spark orbit-spark-one"></span>
        <span class="orbit-spark orbit-spark-two"></span>
      </div>
      <div class="hero-foot"><span>✳</span><p>${escapeHtml(pickAnchor(d.anchors))}</p></div>
    </section>

    <section class="metrics" aria-label="学习数据">
      <div class="metric"><span class="metric-index">01 / 时间</span><div><strong>${hours}</strong><span>小时</span></div><p>累计学习 · ${fmtMinutes(d.totalMinutes || 0)}</p></div>
      <div class="metric"><span class="metric-index">02 / 出勤</span><div><strong>${d.totalDays || 0}</strong><span>天</span></div><p>已经认真记录的日子</p></div>
      <div class="metric"><span class="metric-index">03 / 连续</span><div><strong>${d.streak || 0}</strong><span>天</span></div><p>保持自己的节奏</p></div>
    </section>

    <section class="section-block">
      <div class="section-head"><div><p class="eyebrow">TODAY & DESTINATION</p><h2>现在，与目标。</h2></div><span class="section-aside">每一天的进展，都有位置。</span></div>
      <div class="dashboard-pair">
        <div class="editorial-panel today-panel">
          <span class="panel-index">01</span>
          <div class="panel-content"><p class="panel-kicker">TODAY / 今日</p>
            <h3>${d.todayCheckin ? `已投入 ${d.todayCheckin.minutes} 分钟。` : '今天，从这里开始。'}</h3>
            <p>${d.todayCheckin ? escapeHtml((d.todayCheckin.items || []).join('、') || '今天的学习已记录。') : '没有待完成的指标，只有你选择留下的每一步。'}</p>
          </div>
          <a href="#/checkin" class="panel-arrow" aria-label="前往打卡">↗</a>
        </div>
        <div class="editorial-panel target-panel">
          <span class="panel-index">02</span>
          <div class="panel-content"><p class="panel-kicker">TARGET / 目标组合</p>
            <h3>总分 ${calcAvg(t.listening, t.reading, t.speaking, t.writing)}</h3>
            <p>听力 ${t.listening} <span>·</span> 阅读 ${t.reading} <span>·</span> 口语 ${t.speaking} <span>·</span> 写作 ${t.writing}</p>
            <span class="target-status ${t.writing < 6.5 ? 'target-alert' : ''}">${t.writing < 6.5 ? '写作仍需达到 6.5' : '写作 6.5 已达目标底线'}</span>
          </div>
          <a href="#/settings" class="panel-arrow" aria-label="调整目标">↗</a>
        </div>
      </div>
    </section>

    <section class="section-block">
      <div class="section-head"><div><p class="eyebrow">THE FOUR SKILLS</p><h2>四科进度。</h2></div><span class="section-aside">依据最近一次录入的成绩</span></div>
      ${!hasBaseline ? `<div class="empty-state"><span class="empty-index">00 / BASELINE</span><h3>先留下一次真实的起点。</h3><p>完成一次模考后，这里会显示四科当前分数与目标差距。</p><a href="#/mock-test" class="btn">开始摸底 ↗</a></div>` : `
        <div class="skill-grid">
          ${sections.map((k, i) => {
            const cur = d.latestBySection?.[k]?.band;
            const gap = d.sectionGaps?.[k];
            const pct = cur != null ? Math.min(100, (cur / t[k]) * 100) : 0;
            return `<div class="skill-card">
              <div class="skill-top"><span>0${i + 1} / ${sectionEN[k]}</span><span class="skill-target">目标 ${t[k]}</span></div>
              <div class="skill-main"><h3>${sectionCN[k]}</h3><div class="skill-score">${cur ?? '—'}</div></div>
              <div class="skill-progress"><span style="width:${pct}%"></span></div>
              <p>${cur == null ? '尚无成绩记录' : gap <= 0 ? '已经达到目标' : `距离目标还差 ${gap}`}</p>
            </div>`;
          }).join('')}
        </div>`}
    </section>

    <section class="simulator" aria-label="目标组合模拟器">
      <div class="simulator-intro"><p class="eyebrow">EXPLORE THE POSSIBILITIES</p><h2>如果这样组合，<br>结果会怎样？</h2><p>拖动四科分数，直观看到总分变化。</p><div id="simOut" class="simulator-output"></div></div>
      <div class="simulator-controls">
        ${sections.map(k => `<div class="simulator-item"><div class="simulator-label"><label for="sim-${k}">${sectionCN[k]}</label><strong id="sval-${k}">${t[k]}</strong></div><input type="range" id="sim-${k}" min="5" max="9" step="0.5" value="${t[k]}"></div>`).join('')}
      </div>
    </section>
    <footer class="page-footer">IELTS COCKPIT <span>·</span> STUDY, WITH INTENTION.</footer>
  `;

  const updateSim = () => {
    const combo = {};
    for (const k of sections) {
      combo[k] = parseFloat(el.querySelector(`#sim-${k}`).value);
      el.querySelector(`#sval-${k}`).textContent = combo[k];
    }
    const total = calcAvg(combo.listening, combo.reading, combo.speaking, combo.writing);
    const met = total >= 7.5 && combo.writing >= 6.5;
    const warning = combo.writing < 6.5 ? '<small>写作未达 6.5</small>' : '';
    el.querySelector('#simOut').innerHTML = `<strong>${total}</strong><span>模拟总分<br><b>${met ? '可达 7.5' : '暂未达 7.5'}</b></span>${warning}`;
  };
  sections.forEach(k => el.querySelector(`#sim-${k}`).addEventListener('input', updateSim));
  updateSim();
}

function calcAvg(l, r, s, w) {
  return Math.round(((l + r + s + w) / 4) * 2) / 2;
}

function pickAnchor(list) {
  const arr = Array.isArray(list) && list.length ? list : ['今天练过的，都算数。'];
  return arr[Math.floor(Math.random() * arr.length)];
}

function fmtMinutes(m) {
  if (m < 60) return m + ' 分钟';
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return mm ? `${h} 小时 ${mm} 分` : `${h} 小时`;
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}
