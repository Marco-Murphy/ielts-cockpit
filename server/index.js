'use strict';
/**
 * IELTS Cockpit - Express 入口
 * 静态托管 public/ + JSON API + 局域网监听 0.0.0.0
 */
const os = require('os');
const path = require('path');
const express = require('express');
const config = require('./config');
const DataStore = require('./store/datastore');

const store = new DataStore(config);
const app = express();

// 中间件
app.use(express.json({ limit: '20mb' })); // 多模态 base64 可能较大
app.use(express.urlencoded({ extended: true }));

// 请求日志
app.use((req, _res, next) => {
  if (req.path.startsWith('/api')) {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  }
  next();
});

// 静态文件
app.use(express.static(path.join(config.root, 'public'), {
  extensions: ['html'],
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache');
  }
}));

// API 路由
app.use('/api/profile', require('./routes/profile')(store));
app.use('/api/checkins', require('./routes/checkin')(store));
app.use('/api/practices', require('./routes/practice')(store));
app.use('/api/score', require('./routes/score')(store));
app.use('/api/dashboard', require('./routes/dashboard')(store));
app.use('/api/analytics', require('./routes/analytics')(store));
app.use('/api/vocab', require('./routes/vocab')(store));
app.use('/api/insights', require('./routes/insights')(store));

// SPA 回退：非 /api 且非静态文件，回退到 index.html
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(config.root, 'public', 'index.html'));
});

// 错误处理
app.use((err, _req, res, _next) => {
  console.error('[ERROR]', err);
  res.status(500).json({ error: err.message || '服务器错误' });
});

// 获取局域网 IP
function getLocalIPs() {
  const ips = [];
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) ips.push(iface.address);
    }
  }
  return ips;
}

const server = app.listen(config.port, config.host, () => {
  console.log('\n========================================');
  console.log('  IELTS Cockpit 已启动');
  console.log('========================================');
  console.log(`  本机访问:   http://localhost:${config.port}`);
  const ips = getLocalIPs();
  if (ips.length) {
    console.log('  局域网访问（手机）:');
    for (const ip of ips) console.log(`    http://${ip}:${config.port}`);
  } else {
    console.log('  （未检测到局域网 IP）');
  }
  console.log('----------------------------------------');
  if (!config.dashscopeApiKey) {
    console.log('  ⚠ 未配置 DASHSCOPE_API_KEY，AI 评分功能暂不可用（Phase 2）');
  }
  console.log('========================================\n');
});

// 优雅关闭：落盘数据
function shutdown(signal) {
  console.log(`\n收到 ${signal}，正在保存数据...`);
  store.flushSync();
  server.close(() => { process.exit(0); });
  setTimeout(() => process.exit(1), 3000).unref();
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

module.exports = { app, store, config };
