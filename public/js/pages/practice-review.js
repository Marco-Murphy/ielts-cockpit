// practice-review.js - 答案录入 + 自动判分 + 错题标记
import { api } from '../api.js';

const QUESTION_TYPES = [
  { id: 'multiple_choice', name: '单选' },
  { id: 'matching', name: '匹配' },
  { id: 'fill_blank', name: '填空' },
  { id: 'tfng', name: 'TRUE/FALSE/NG' },
  { id: 'ynng', name: 'YES/NO/NG' },
  { id: 'short_answer', name: '简答' },
  { id: 'map_labeling', name: '地图标注' },
  { id: 'diagram_labeling', name: '图表标注' },
];
const WRONG_REASONS = [
  { id: 'vocabulary', name: '词汇' },
  { id: 'careless', name: '粗心' },
  { id: 'time_pressure', name: '时间压力' },
  { id: 'trap', name: '陷阱/同义替换' },
  { id: 'unsure', name: '没思路' },
];

export async function renderPracticeReview(el) {
  const meta = JSON.parse(sessionStorage.getItem('reviewMeta') || 'null');
  if (!meta) {
    // 无计时元数据，允许手动新建一次录入
    return renderManualEntry(el);
  }

  if (meta.section === 'writing' || meta.section === 'speaking') {
    sessionStorage.removeItem('reviewMeta');
    el.innerHTML = `<div class="card"><h3>${meta.section === 'writing' ? '写作' : '口语'} 批改</h3>
      <p class="muted">写作/口语的 AI 批改将在 Phase 2 开放。本次计时已记录。</p>
      <a href="#/dashboard" class="btn">返回总览</a></div>`;
    return;
  }

  const isReading = meta.section === 'reading';
  const qCount = 40;
  const items = Array.from({ length: qCount }, (_, i) => ({
    qNo: i + 1, myAnswer: '', correctAnswer: '', questionType: isReading ? 'fill_blank' : 'fill_blank', wrongReason: 'unclassified', note: ''
  }));

  renderEntry(el, items, meta);
}

function renderManualEntry(el) {
  el.innerHTML = `
    <div class="card">
      <h3>手动录入一次练习</h3>
      <p class="subtle">未使用计时器也可直接录入一次练习成绩</p>
      <label>剑桥书号</label>
      <select id="book">${[10,11,12,13,14,15,16,17,18,19].map(b=>`<option value="${b}">剑${b}</option>`).join('')}</select>
      <label>Test</label>
      <select id="test">${[1,2,3,4].map(t=>`<option value="${t}">Test ${t}</option>`).join('')}</select>
      <label>Section</label>
      <select id="section">
        <option value="listening">听力</option>
        <option value="reading">阅读</option>
      </select>
      <label>阅读类型（仅阅读）</label>
      <select id="readingType">
        <option value="academic">学术类</option>
        <option value="general">培训类</option>
      </select>
      <label>用时（分钟）</label>
      <input type="number" id="duration" value="${30}" min="0">
      <div style="margin-top:16px"><button class="btn" id="go">开始录入</button></div>
    </div>
  `;
  el.querySelector('#go').addEventListener('click', () => {
    const meta = {
      book: parseInt(el.querySelector('#book').value, 10),
      test: parseInt(el.querySelector('#test').value, 10),
      section: el.querySelector('#section').value,
      readingType: el.querySelector('#readingType').value,
      date: new Date().toISOString().slice(0, 10),
      durationActual: parseInt(el.querySelector('#duration').value, 10) * 60,
      wasTimed: false
    };
    sessionStorage.setItem('reviewMeta', JSON.stringify(meta));
    renderPracticeReview(el);
  });
}

function renderEntry(el, items, meta) {
  el.innerHTML = `
    <div class="card">
      <h3>录入答案 · 剑${meta.book} Test${meta.test} · ${sectionCN(meta.section)}</h3>
      <p class="subtle">同屏录入"我的答案"和"标准答案"，完成后一键判分。填空题拼写严格（雅思规则）。</p>
      <div style="margin:12px 0;max-height:60vh;overflow:auto">
        <table id="entryTable" style="font-size:13px">
          <thead><tr><th>#</th><th>我的答案</th><th>正解</th><th>题型</th><th>错因</th></tr></thead>
          <tbody>
          ${items.map((it, i) => `
            <tr data-i="${i}">
              <td>${it.qNo}</td>
              <td><input data-field="myAnswer" value="${it.myAnswer}" placeholder="我选的/写的"></td>
              <td><input data-field="correctAnswer" value="${it.correctAnswer}" placeholder="标准答案"></td>
              <td>${typeSelect(it.questionType)}</td>
              <td>${reasonSelect(it.wrongReason)}</td>
            </tr>
          `).join('')}
          </tbody>
        </table>
      </div>
      ${meta.section === 'reading' ? `
        <label>阅读类型</label>
        <select id="readingType">
          <option value="academic" ${meta.readingType==='general'?'':'selected'}>学术类</option>
          <option value="general" ${meta.readingType==='general'?'selected':''}>培训类</option>
        </select>
      ` : ''}
      <div style="margin-top:16px" class="row">
        <button class="btn" id="grade">一键判分</button>
        <button class="btn btn-secondary" id="cancel">取消</button>
      </div>
    </div>
  `;

  // 同步 items 输入
  el.querySelectorAll('#entryTable tbody tr').forEach((tr, i) => {
    tr.querySelectorAll('input[data-field], select').forEach(input => {
      const field = input.dataset.field || input.dataset.field2;
      input.addEventListener('input', () => {
        if (input.dataset.field) items[i][input.dataset.field] = input.value;
        else if (input.name === 'qtype') items[i].questionType = input.value;
        else if (input.name === 'reason') items[i].wrongReason = input.value;
      });
    });
  });

  el.querySelector('#grade').addEventListener('click', async () => {
    // 收集 select
    el.querySelectorAll('#entryTable tbody tr').forEach((tr, i) => {
      items[i].questionType = tr.querySelector('select[name="qtype"]').value;
      items[i].wrongReason = tr.querySelector('select[name="reason"]').value;
    });
    const readingType = el.querySelector('#readingType')?.value || 'academic';
    const typeKey = meta.section === 'listening' ? 'listening'
      : (readingType === 'general' ? 'reading_general' : 'reading_academic');
    try {
      const result = await api.post('/api/practices', {
        type: meta.wasTimed ? 'section' : 'section',
        cambridgeBook: meta.book,
        testNo: meta.test,
        section: meta.section,
        date: meta.date,
        durationPlanned: meta.section === 'listening' ? 1800 : 3600,
        durationActual: meta.durationActual,
        wasTimed: meta.wasTimed,
        items,
        readingType: typeKey === 'reading_general' ? 'general' : 'academic'
      });
      sessionStorage.removeItem('reviewMeta');
      renderResult(el, result, meta);
    } catch (e) {
      alert('判分失败：' + e.message);
    }
  });

  el.querySelector('#cancel').addEventListener('click', () => {
    sessionStorage.removeItem('reviewMeta');
    location.hash = '#/mock-test';
  });
}

function renderResult(el, result, meta) {
  const target = { listening: 8, reading: 8, speaking: 7, writing: 6.5 };
  const targetVal = target[meta.section] || 7;
  const met = result.bandScore >= targetVal;
  const totalRaw = result.raw;
  const totalQ = result.items.length;
  const mistakes = result.mistakes;

  el.innerHTML = `
    <div class="card center">
      <h3>判分结果 · ${sectionCN(meta.section)}</h3>
      <div class="stat-big">${result.bandScore}</div>
      <div class="stat-label">Band（raw ${totalRaw}/${totalQ}）</div>
      <p style="margin-top:8px">${met ? `<span class="badge badge-good">达标目标 ${targetVal}</span>` : `<span class="badge badge-warn">距目标 ${targetVal} 差 ${(targetVal - result.bandScore).toFixed(1)}</span>`}</p>
      <p class="subtle">raw→band 换算为近似值（不同册略有差异）</p>
    </div>
    <div class="card">
      <h3>错题清单（${mistakes.length} 题）</h3>
      ${mistakes.length === 0 ? '<p class="badge badge-good">全对！</p>' : `
      <table style="font-size:13px">
        <thead><tr><th>#</th><th>我的答案</th><th>正解</th><th>题型</th><th>错因</th></tr></thead>
        <tbody>
        ${mistakes.map(m => `
          <tr><td>${m.qNo}</td>
          <td class="error">${m.myAnswer || '（空）'}</td>
          <td>${m.correctAnswer}</td>
          <td><span class="tag">${typeName(m.questionType)}</span></td>
          <td><span class="badge ${m.wrongReason === 'unclassified' ? 'badge-warn' : 'badge-bad'}">${reasonName(m.wrongReason)}</span></td></tr>
        `).join('')}
        </tbody>
      </table>`}
    </div>
    <div class="row">
      <a href="#/analytics" class="btn btn-secondary">查看分析</a>
      <a href="#/mock-test" class="btn">再来一次</a>
    </div>
  `;
}

function sectionCN(s) { return ({ listening:'听力', reading:'阅读', writing:'写作', speaking:'口语' })[s] || s; }
function typeName(t) { return (QUESTION_TYPES.find(q => q.id === t) || {}).name || t; }
function reasonName(r) { return (WRONG_REASONS.find(w => w.id === r) || {}).name || r; }
function typeSelect(selected) {
  return `<select name="qtype" data-field2="questionType">${QUESTION_TYPES.map(q => `<option value="${q.id}" ${q.id===selected?'selected':''}>${q.name}</option>`).join('')}</select>`;
}
function reasonSelect(selected) {
  return `<select name="reason" data-field2="wrongReason"><option value="unclassified">—</option>${WRONG_REASONS.map(w => `<option value="${w.id}" ${w.id===selected?'selected':''}>${w.name}</option>`).join('')}</select>`;
}
