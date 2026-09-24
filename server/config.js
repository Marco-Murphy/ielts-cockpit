'use strict';
/**
 * 配置加载：读取 .env 并提供默认值
 * 使用 managed Node 22，dotenv 从项目根目录加载
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const ROOT = path.join(__dirname, '..');

const config = {
  root: ROOT,
  port: parseInt(process.env.PORT || '3000', 10),
  host: '0.0.0.0', // 局域网可访问
  // AI 评分
  dashscopeApiKey: process.env.DASHSCOPE_API_KEY || '',
  llmModel: process.env.LLM_MODEL || 'qwen-max',
  omniModel: process.env.OMNI_MODEL || 'qwen3.5-omni',
  visionModel: process.env.VISION_MODEL || 'qwen-vl-plus',
  // 本地语音识别
  pythonPath: process.env.PYTHON_PATH || '',
  whisperModelDir: process.env.WHISPER_MODEL_DIR || '',
  // 目录
  dataDir: path.join(ROOT, 'data'),
  uploadsDir: path.join(ROOT, 'uploads'),
  promptsDir: path.join(ROOT, 'prompts'),
  // 数据文件
  dataFiles: {
    profile: 'profile.json',
    checkins: 'checkins.json',
    practices: 'practices.json',
    mistakes: 'mistakes.json',
    essays: 'essays.json',
    speakings: 'speakings.json',
    reports: 'reports.json',
    vocab: 'vocab.json',
    insights: 'insights.json'
  }
};

module.exports = config;
