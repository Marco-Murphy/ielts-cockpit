// analytics.js - 分析页（Phase 0 基础版，Phase 1 补趋势曲线/热力图）
import { api } from '../api.js';

export async function renderAnalytics(el) {
  const practices = await api.get('/api/practices').catch(() => []);
  const trend = await api.get('/api/analytics/band-trend').catch(() => []);

  el.innerHTML = `
    <div class="card">
      <h3>单项分数记录</h3>
      ${trend.length === 0 ? '<p class="muted">暂无评分记录。先做一次模考或写作批改。</p>' : `
      <table>
        <thead><tr><th>日期</th><th>单项</th><th>Band</th><th>来源</th></tr></thead>
        <tbody>
        ${trend.slice().reverse().map(p => `
          <tr><td>${p.date}</td><td>${sectionName(p.section)}</td>
          <td><span class="badge ${badgeClass(p.band)}">${p.band}</span></td>
          <td><span class="tag">${sourceName(p.source)}</span></td></tr>
        `).join('')}
        </tbody>
      </table>`}
    </div>
    <div class="card">
      <h3>练题记录</h3>
      ${practices.length === 0 ? '<p class="muted">暂无练题记录。</p>' : `
      <table>
        <thead><tr><th>日期</th><th>Section</th><th>剑雅</th><th>raw</th><th>Band</th></tr></thead>
        <tbody>
        ${practices.slice(0, 20).map(p => `
          <tr><td>${p.date}</td><td>${sectionName(p.section)}</td>
          <td>${p.cambridgeBook ? '剑'+p.cambridgeBook+'-T'+p.testNo : '—'}</td>
          <td>${p.rawScore != null ? p.rawScore : '—'}</td>
          <td>${p.bandScore != null ? `<span class="badge ${badgeClass(p.bandScore)}">${p.bandScore}</span>` : '—'}</td></tr>
        `).join('')}
        </tbody>
      </table>`}
    </div>
  `;
}

function sectionName(s) {
  return ({ listening: '听力', reading: '阅读', writing: '写作', speaking: '口语' })[s] || s;
}
function sourceName(s) {
  return ({ practice: '练题', essay: '作文', speaking: '口语' })[s] || s;
}
function badgeClass(b) {
  if (b >= 7.5) return 'badge-good';
  if (b >= 6) return 'badge-warn';
  return 'badge-bad';
}
