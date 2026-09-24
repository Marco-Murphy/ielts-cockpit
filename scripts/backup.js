#!/usr/bin/env node
'use strict';
/**
 * 数据备份脚本
 * 把 data/ 下的所有 JSON 打包复制到 data/backup/manual-<时间戳>/
 *
 * 用法：npm run backup
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const BACKUP_ROOT = path.join(DATA_DIR, 'backup');

function stamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

function main() {
  if (!fs.existsSync(DATA_DIR)) {
    console.error('找不到 data/ 目录，无需备份。');
    process.exit(1);
  }

  const dest = path.join(BACKUP_ROOT, `manual-${stamp()}`);
  fs.mkdirSync(dest, { recursive: true });

  const files = fs.readdirSync(DATA_DIR).filter(
    (f) => f.endsWith('.json') && fs.statSync(path.join(DATA_DIR, f)).isFile()
  );

  if (files.length === 0) {
    console.log('data/ 下没有 JSON 文件，无需备份。');
    return;
  }

  let total = 0;
  for (const f of files) {
    fs.copyFileSync(path.join(DATA_DIR, f), path.join(dest, f));
    const size = fs.statSync(path.join(dest, f)).size;
    total += size;
    console.log(`  已备份 ${f}  (${(size / 1024).toFixed(1)} KB)`);
  }

  console.log(`\n备份完成：${files.length} 个文件，共 ${(total / 1024).toFixed(1)} KB`);
  console.log(`位置：${dest}`);
}

main();
