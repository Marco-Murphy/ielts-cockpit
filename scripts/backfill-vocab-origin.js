'use strict';
// 从现有生词来源与打卡项目提取可确定的册数、Test、篇目和练习日期。
// 不推断原题、原文或 PDF 页码；这些字段必须逐页核对后填写。
const fs = require('fs');
const path = require('path');

const dataDir = path.resolve(process.argv[2] || path.join(__dirname, '..', 'data'));
const apply = process.argv.includes('--apply');
const pdfLinks = new Map(process.argv.filter(arg => /^--pdf-\d+=https:\/\//.test(arg)).map(arg => {
  const match = arg.match(/^--pdf-(\d+)=(https:\/\/\S+)$/);
  return [Number(match[1]), match[2]];
}));
const vocabFile = path.join(dataDir, 'vocab.json');
const checkinsFile = path.join(dataDir, 'checkins.json');
const vocab = JSON.parse(fs.readFileSync(vocabFile, 'utf8'));
const checkins = JSON.parse(fs.readFileSync(checkinsFile, 'utf8'));

const practicedOn = new Map();
for (const checkin of [...checkins].sort((a, b) => a.date.localeCompare(b.date))) {
  for (const raw of checkin.items || []) {
    const item = String(raw).replace(/\s+/g, '').toLowerCase();
    let book = null;
    let test = null;
    for (const segment of item.split(/[，,；;]/)) {
      const bookMatch = segment.match(/剑(?:桥)?(\d+)/);
      const testMatch = segment.match(/test(\d+)/);
      if (bookMatch) book = Number(bookMatch[1]);
      if (testMatch) test = Number(testMatch[1]);
      if (!book || !test) continue;
      for (const match of segment.matchAll(/(?:reading|passage|p)[*]?(\d+)|(?:section|s)(\d+)/g)) {
        const skill = match[1] ? 'reading' : 'listening';
        const part = Number(match[1] || match[2]);
        const key = `${book}-${test}-${skill}-${part}`;
        if (!practicedOn.has(key)) practicedOn.set(key, checkin.date);
      }
    }
  }
}

let changed = 0;
let dated = 0;
for (const entry of vocab) {
  const source = String(entry.source || '');
  // A separator can join notes from different texts. Never combine their metadata.
  const primarySource = source.split(/\s*[｜|]\s*/)[0];
  const location = primarySource.match(/剑(?:桥)?\s*(\d+)\s*[-－]\s*T(?:est)?\s*(\d+)\s*[-－]\s*([PS])\s*(\d+)/i);
  const title = primarySource.match(/《([^》]+)》/);
  const question = primarySource.match(/Q\s*\d+(?:\s*[-–—]\s*\d+)?/i);
  if (!location && !title) continue;
  const origin = { ...(entry.origin || {}) };
  if (location) {
    origin.book ||= Number(location[1]);
    origin.test ||= Number(location[2]);
    origin.skill ||= location[3].toUpperCase() === 'P' ? 'reading' : 'listening';
    origin.part ||= Number(location[4]);
    const date = practicedOn.get(`${origin.book}-${origin.test}-${origin.skill}-${origin.part}`);
    if (date && !origin.practiceDate) { origin.practiceDate = date; dated++; }
  }
  if (title) origin.title ||= title[1];
  if (!origin.title && /\bBakelite\b/i.test(primarySource)) origin.title = 'Bakelite';
  if (question) {
    const numbers = [...question[0].matchAll(/\d+/g)].map(match => Number(match[0]));
    const first = origin.skill === 'reading' ? [0, 1, 14, 28][origin.part] : 1 + 10 * (origin.part - 1);
    const last = origin.skill === 'reading' ? [0, 13, 27, 40][origin.part] : 10 * origin.part;
    const valid = !origin.book || numbers.every(number => number >= first && number <= last);
    if (valid) origin.questionRef ||= question[0].replace(/\s+/g, '');
  }
  if (origin.book && pdfLinks.has(origin.book)) origin.pdfUrl ||= pdfLinks.get(origin.book);
  if (!entry.origin || JSON.stringify(origin) !== JSON.stringify(entry.origin)) {
    entry.origin = origin;
    changed++;
  }
}

console.log(`生词总数 ${vocab.length}；可从已有记录关联出处 ${changed}；匹配打卡日期 ${dated}。`);
if (!apply || !changed) {
  console.log(apply ? '没有需要写入的变化。' : '预览模式；加 --apply 才会写入。');
  process.exit(0);
}
const backupDir = path.join(dataDir, 'backup');
fs.mkdirSync(backupDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupFile = path.join(backupDir, `${stamp}-vocab-before-origin.json`);
fs.copyFileSync(vocabFile, backupFile);
const tempFile = `${vocabFile}.origin-tmp`;
fs.writeFileSync(tempFile, JSON.stringify(vocab, null, 2), 'utf8');
fs.renameSync(tempFile, vocabFile);
console.log(`已保存；原文件备份在 ${backupFile}`);
