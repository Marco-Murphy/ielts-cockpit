// app.js - SPA hash 路由
import { renderDashboard } from './pages/dashboard.js';
import { renderMockTest } from './pages/mock-test.js';
import { renderPracticeReview } from './pages/practice-review.js';
import { renderCheckin } from './pages/checkin.js';
import { renderAnalytics } from './pages/analytics.js';
import { renderSettings } from './pages/settings.js';
import { renderVocab } from './pages/vocab.js';
import { renderInsights } from './pages/insights.js';
import { api } from './api.js';

const routes = {
  '/dashboard': renderDashboard,
  '/mock-test': renderMockTest,
  '/practice-review': renderPracticeReview,
  '/checkin': renderCheckin,
  '/analytics': renderAnalytics,
  '/settings': renderSettings,
  '/vocab': renderVocab,
  '/insights': renderInsights,
};

const content = document.getElementById('content');

function currentPath() {
  const hash = location.hash.replace(/^#/, '');
  const path = hash.split('?')[0]; // 去掉 query（如 ?tab=vocab）
  return path || '/dashboard';
}

function highlightNav(path) {
  document.querySelectorAll('.nav-item, .tab-item').forEach(el => {
    const href = el.getAttribute('href');
    el.classList.toggle('active', href === '#' + path);
  });
}

async function render() {
  const path = currentPath();
  highlightNav(path);
  content.innerHTML = '<div class="loading">加载中...</div>';
  try {
    const renderer = routes[path];
    if (renderer) {
      await renderer(content);
    } else {
      content.innerHTML = '<p>页面不存在</p>';
    }
  } catch (e) {
    content.innerHTML = `<div class="card"><p class="error">出错了：${e.message}</p></div>`;
  }
}

// 倒计时（顶栏）
async function updateCountdown() {
  try {
    const d = await api.get('/api/dashboard');
    const el = document.getElementById('countdown');
    if (d.daysToExam != null) {
      el.textContent = `距考试 ${d.daysToExam} 天`;
    }
  } catch { /* 静默 */ }
}

// 主题切换
function initTheme() {
  const saved = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
  document.getElementById('theme-toggle').addEventListener('click', () => {
    const cur = document.documentElement.getAttribute('data-theme');
    const next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
  });
}

window.addEventListener('hashchange', () => { render(); updateCountdown(); });
window.addEventListener('DOMContentLoaded', () => {
  initTheme();
  if (!location.hash) location.hash = '#/dashboard';
  render();
  updateCountdown();
});
