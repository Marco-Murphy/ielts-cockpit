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
const routeHeader = document.getElementById('route-header');
const menuToggle = document.getElementById('menu-toggle');
const mobileMenu = document.getElementById('mobile-menu');
const menuBackdrop = document.getElementById('menu-backdrop');
const pageMeta = {
  '/mock-test': ['FOCUS / 01', '专注练习', '进入一段完整的练习时间。题目在纸上，你的节奏留在这里。'],
  '/practice-review': ['REVIEW / 02', '录入与判分', '让每次练习留下可追踪的结果。'],
  '/vocab': ['LIBRARY / 03', '词汇收藏', '把每个在语境中遇见的词，变成自己的表达。'],
  '/insights': ['NOTES / 04', '学习洞察', '那些想通的瞬间，值得被好好保存。'],
  '/checkin': ['RHYTHM / 05', '学习打卡', '记录投入，也记录每一天真实的状态。'],
  '/analytics': ['PROGRESS / 06', '进度分析', '用真实练习的结果，看清下一步。'],
  '/settings': ['PREFERENCES / 07', '个人设置', '让学习空间贴合你的目标与节奏。'],
};

function currentPath() {
  const hash = location.hash.replace(/^#/, '');
  const path = hash.split('?')[0]; // 去掉 query（如 ?tab=vocab）
  return path || '/dashboard';
}

function highlightNav(path) {
  document.querySelectorAll('.nav-item, .menu-item').forEach(el => {
    const href = el.getAttribute('href');
    const active = href === '#' + path;
    el.classList.toggle('active', active);
    if (active) el.setAttribute('aria-current', 'page');
    else el.removeAttribute('aria-current');
  });
}

function setMenuOpen(open) {
  mobileMenu.classList.toggle('open', open);
  mobileMenu.setAttribute('aria-hidden', String(!open));
  menuToggle.setAttribute('aria-expanded', String(open));
  menuToggle.setAttribute('aria-label', open ? '关闭导航菜单' : '打开导航菜单');
  menuBackdrop.hidden = !open;
  document.body.classList.toggle('menu-open', open);
}

async function render() {
  const path = currentPath();
  setMenuOpen(false);
  highlightNav(path);
  content.classList.toggle('dashboard-content', path === '/dashboard');
  const meta = pageMeta[path];
  routeHeader.innerHTML = meta
    ? `<div class="route-header"><p class="eyebrow">${meta[0]}</p><h1>${meta[1]}</h1><p>${meta[2]}</p></div>`
    : '';
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
    el.textContent = d.profile?.examTargetDate && d.daysToExam != null
      ? `距考试 ${d.daysToExam} 天`
      : '待设置考试日';
  } catch { /* 静默 */ }
}

// 主题切换
function initTheme() {
  const saved = localStorage.getItem('theme') || 'light';
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
  menuToggle.addEventListener('click', () => setMenuOpen(menuToggle.getAttribute('aria-expanded') !== 'true'));
  menuBackdrop.addEventListener('click', () => setMenuOpen(false));
  mobileMenu.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setMenuOpen(false)));
  window.addEventListener('keydown', e => { if (e.key === 'Escape') setMenuOpen(false); });
  if (!location.hash) location.hash = '#/dashboard';
  render();
  updateCountdown();
});
