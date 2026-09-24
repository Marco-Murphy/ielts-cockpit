// mock-test.js - 练题/模考计时器
import { api } from '../api.js';

const SECTION_DURATIONS = {
  listening: 30 * 60,   // 含誊写
  reading: 60 * 60,
  writing: 60 * 60,    // Task1 20 + Task2 40
  speaking: 15 * 60    // 估算
};
const SECTION_CN = { listening: '听力', reading: '阅读', writing: '写作', speaking: '口语' };

export async function renderMockTest(el) {
  // 是否有进行中的计时
  const active = JSON.parse(sessionStorage.getItem('mockActive') || 'null');

  if (active) {
    renderTimer(el, active);
    return;
  }

  el.innerHTML = `
    <div class="card">
      <h3>练题 / 模考</h3>
      <p class="subtle">在纸质/PDF上做题，工具负责计时、录入答案、自动判分（听读）、错题分析。</p>
      <label>剑桥书号</label>
      <select id="book">
        ${[10,11,12,13,14,15,16,17,18,19].map(b => `<option value="${b}">剑${b}</option>`).join('')}
      </select>
      <label>Test</label>
      <select id="test">
        ${[1,2,3,4].map(t => `<option value="${t}">Test ${t}</option>`).join('')}
      </select>
      <label>Section</label>
      <select id="section">
        <option value="listening">听力（30分钟含誊写）</option>
        <option value="reading">阅读（60分钟）</option>
        <option value="writing">写作（Phase 2 开放 AI 批改）</option>
        <option value="speaking">口语（Phase 2 开放 AI 评分）</option>
      </select>
      <label>模式</label>
      <select id="mode">
        <option value="mock">模考模式（禁暂停）</option>
        <option value="practice">练习模式（可暂停）</option>
      </select>
      <div style="margin-top:16px">
        <button class="btn" id="start">开始计时</button>
      </div>
    </div>
    <div class="card">
      <h3>说明</h3>
      <p class="muted">• 听力/阅读：计时结束后自动跳转答案录入页，逐题录入答案+正解后一键判分</p>
      <p class="muted">• 写作/口语：Phase 2 接入 AI 批改/评分后开放完整流程</p>
      <p class="muted">• 模考模式计时中途不可暂停，模拟真实考场压力</p>
    </div>
  `;

  el.querySelector('#start').addEventListener('click', () => {
    const book = parseInt(el.querySelector('#book').value, 10);
    const test = parseInt(el.querySelector('#test').value, 10);
    const section = el.querySelector('#section').value;
    const mode = el.querySelector('#mode').value;
    const payload = { book, test, section, mode, startedAt: Date.now(), duration: SECTION_DURATIONS[section] };
    sessionStorage.setItem('mockActive', JSON.stringify(payload));
    renderTimer(el, payload);
  });
}

function renderTimer(el, active) {
  const { book, test, section, mode, startedAt, duration } = active;
  let remaining = duration;
  let paused = false;
  let endTime = startedAt + duration * 1000;

  const fmt = (s) => {
    const m = Math.floor(s / 60), sec = s % 60;
    return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  };

  el.innerHTML = `
    <div class="card center" style="min-height:60vh;display:flex;flex-direction:column;justify-content:center;align-items:center">
      <h3>剑${book} Test${test} · ${SECTION_CN[section]} · ${mode === 'mock' ? '模考' : '练习'}</h3>
      <div class="stat-big" id="timer" style="font-size:72px;font-family:var(--font-mono)">${fmt(remaining)}</div>
      <div id="phase" class="muted">进行中</div>
      <div style="margin-top:24px" class="row">
        ${mode === 'practice' ? '<button class="btn btn-secondary" id="pause">暂停</button>' : ''}
        <button class="btn" id="finish">提前结束并录入答案</button>
      </div>
    </div>
  `;

  const timerEl = el.querySelector('#timer');
  const phaseEl = el.querySelector('#phase');
  const tick = () => {
    if (paused) return;
    remaining = Math.max(0, Math.round((endTime - Date.now()) / 1000));
    timerEl.textContent = fmt(remaining);
    if (remaining <= 0) {
      clearInterval(intv);
      phaseEl.textContent = '时间到！';
      phaseEl.classList.add('error');
      goToReview();
    } else if (remaining <= 300) {
      timerEl.style.color = 'var(--danger)';
    }
  };
  const intv = setInterval(tick, 1000);
  tick();

  if (mode === 'practice') {
    el.querySelector('#pause').addEventListener('click', () => {
      paused = !paused;
      if (paused) {
        remaining = Math.round((endTime - Date.now()) / 1000);
        endTime = Date.now() + remaining * 1000;
        el.querySelector('#pause').textContent = '继续';
        phaseEl.textContent = '已暂停';
      } else {
        endTime = Date.now() + remaining * 1000;
        el.querySelector('#pause').textContent = '暂停';
        phaseEl.textContent = '进行中';
        tick();
      }
    });
  }

  el.querySelector('#finish').addEventListener('click', () => {
    clearInterval(intv);
    if (mode === 'mock' && remaining > 60 && !confirm('模考模式提前结束会失去剩余时间模拟，确定？')) {
      const intv2 = setInterval(tick, 1000);
      return;
    }
    goToReview();
  });

  function goToReview() {
    sessionStorage.removeItem('mockActive');
    // 写作/口语暂未开放录入，提示
    if (section === 'writing' || section === 'speaking') {
      sessionStorage.setItem('reviewMeta', JSON.stringify({ book, test, section, date: new Date().toISOString().slice(0,10), durationActual: duration - remaining }));
      location.hash = '#/practice-review';
      return;
    }
    sessionStorage.setItem('reviewMeta', JSON.stringify({ book, test, section, date: new Date().toISOString().slice(0,10), durationActual: duration - remaining, wasTimed: true }));
    location.hash = '#/practice-review';
  }
}
