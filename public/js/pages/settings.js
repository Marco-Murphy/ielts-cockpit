// settings.js - 设置页：目标组合、考试日期、API key
import { api } from '../api.js';

export async function renderSettings(el) {
  const profile = await api.get('/api/profile').catch(() => ({}));
  const t = profile.targetCombo || { listening: 7, reading: 7, speaking: 6.5, writing: 6.5 };

  el.innerHTML = `
    <div class="card">
      <h3>目标与档案</h3>
      <label>考试目标日期</label>
      <input type="date" id="examDate" value="${profile.examTargetDate || ''}">
      <label>昵称</label>
      <input type="text" id="nickname" value="${profile.nickname || ''}" placeholder="你的称呼">
    </div>
    <div class="card">
      <h3>目标组合（四单项 band）</h3>
      <p class="subtle">总分 = 四项平均四舍五入到 0.5 档。目标组合 听力${t.listening}+阅读${t.reading}+口语${t.speaking}+写作${t.writing} = 总分 ${calcAvg(t.listening,t.reading,t.speaking,t.writing)}</p>
      ${['listening','reading','speaking','writing'].map(k => `
        <label>${labelCN(k)}</label>
        <div class="row">
          <input type="range" id="tgt-${k}" min="5" max="9" step="0.5" value="${t[k]}" style="flex:1">
          <span id="val-${k}" style="width:40px;font-weight:700">${t[k]}</span>
        </div>
      `).join('')}
      <div id="simResult" class="muted" style="margin-top:8px"></div>
    </div>
    <div class="card">
      <h3>每日学习时长（分钟）</h3>
      <div class="row">
        <div style="flex:1"><label>最少</label><input type="number" id="dmin" value="${(profile.dailyMinutes||{min:60}).min}" min="0"></div>
        <div style="flex:1"><label>最多</label><input type="number" id="dmax" value="${(profile.dailyMinutes||{max:120}).max}" min="0"></div>
      </div>
    </div>
    <div class="card">
      <h3>AI 评分配置</h3>
      <p class="subtle">阿里云百炼 DASHSCOPE_API_KEY 在服务端 .env 配置，前端不回显明文。</p>
      <p class="subtle">当前状态：${await keyStatus()}</p>
    </div>
    <button class="btn" id="save">保存设置</button>
  `;

  // 滑块实时模拟
  const updateSim = () => {
    const combo = {};
    for (const k of ['listening','reading','speaking','writing']) {
      combo[k] = parseFloat(el.querySelector(`#tgt-${k}`).value);
      el.querySelector(`#val-${k}`).textContent = combo[k];
    }
    const total = calcAvg(combo.listening, combo.reading, combo.speaking, combo.writing);
    const met = total >= 7.5 && combo.writing >= 6.5;
    const warn = combo.writing < 6.5 ? '<br><span class="badge badge-bad">写作<6.5 难达7.5</span>' : '';
    el.querySelector('#simResult').innerHTML = `模拟总分 <strong>${total}</strong> ${met ? '<span class="badge badge-good">可达7.5</span>' : '<span class="badge badge-warn">不足7.5</span>'}${warn}`;
  };
  ['listening','reading','speaking','writing'].forEach(k => {
    el.querySelector(`#tgt-${k}`).addEventListener('input', updateSim);
  });
  updateSim();

  el.querySelector('#save').addEventListener('click', async () => {
    const targetCombo = {};
    for (const k of ['listening','reading','speaking','writing']) {
      targetCombo[k] = parseFloat(el.querySelector(`#tgt-${k}`).value);
    }
    const dailyMinutes = {
      min: parseInt(el.querySelector('#dmin').value, 10),
      max: parseInt(el.querySelector('#dmax').value, 10)
    };
    await api.patch('/api/profile', {
      examTargetDate: el.querySelector('#examDate').value,
      nickname: el.querySelector('#nickname').value,
      targetCombo, dailyMinutes
    });
    alert('已保存');
    updateSim();
  });
}

async function keyStatus() {
  // 通过 dashboard 间接判断是否可调用（简化）
  return '（Phase 2 接入 AI 后显示）';
}
function labelCN(k) {
  return ({ listening:'听力', reading:'阅读', speaking:'口语', writing:'写作' })[k];
}
function calcAvg(l, r, s, w) {
  return Math.round((l+r+s+w)/4 * 2) / 2;
}
