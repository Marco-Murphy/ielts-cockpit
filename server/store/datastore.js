'use strict';
/**
 * DataStore - JSON 文件存储引擎
 * 内存缓存 + 防抖原子写（temp+rename）+ 启动备份
 * 接口仿集合操作，后续可平滑迁移 SQLite
 */
const fs = require('fs');
const path = require('path');

class DataStore {
  /**
   * @param {object} config 配置 { dataDir, dataFiles }
   */
  constructor(config) {
    this.dataDir = config.dataDir;
    this.dataFiles = config.dataFiles;
    this.cache = {};        // 内存缓存 { collection: Array }
    this.dirty = new Set(); // 待写集合
    this.flushTimer = null;
    this.flushDelay = 500;  // 防抖 ms
    this._seq = 0;
    fs.mkdirSync(this.dataDir, { recursive: true });
    this._backupOnStart();
    this._loadAll();
  }

  /* ---------- 私有：文件读写 ---------- */

  _fileFor(collection) {
    const name = this.dataFiles[collection];
    if (!name) throw new Error(`未知集合: ${collection}`);
    return path.join(this.dataDir, name);
  }

  _backupOnStart() {
    // 启动时把现有数据备份一份到 data/backup/
    const backupDir = path.join(this.dataDir, 'backup');
    fs.mkdirSync(backupDir, { recursive: true });
    for (const name of Object.values(this.dataFiles)) {
      const src = path.join(this.dataDir, name);
      if (fs.existsSync(src)) {
        try {
          fs.copyFileSync(src, path.join(backupDir, `${Date.now()}-${name}`));
        } catch (e) { /* 忽略备份失败 */ }
      }
    }
  }

  _loadAll() {
    for (const key of Object.keys(this.dataFiles)) {
      const file = this._fileFor(key);
      if (fs.existsSync(file)) {
        try {
          const raw = fs.readFileSync(file, 'utf8');
          const data = JSON.parse(raw);
          if (key === 'profile') {
            // profile 是单对象集合：保留对象本身；兼容历史上误存为数组的情况
            this.cache[key] = Array.isArray(data) ? (data[0] || null) : data;
          } else {
            this.cache[key] = Array.isArray(data) ? data : [];
          }
        } catch (e) {
          console.error(`[DataStore] ${key}.json 解析失败，已重置为空:`, e.message);
          this.cache[key] = key === 'profile' ? null : [];
        }
      } else {
        this.cache[key] = key === 'profile' ? null : [];
      }
    }
  }

  _flush() {
    this.flushTimer = null;
    for (const collection of this.dirty) {
      this._writeCollection(collection);
    }
    this.dirty.clear();
  }

  _writeCollection(collection) {
    const file = this._fileFor(collection);
    const tmp = file + '.tmp';
    const content = JSON.stringify(this.cache[collection], null, 2);
    try {
      fs.writeFileSync(tmp, content, 'utf8');
      fs.renameSync(tmp, file); // 原子替换
    } catch (e) {
      console.error(`[DataStore] 写入 ${collection} 失败:`, e.message);
    }
  }

  _markDirty(collection) {
    this.dirty.add(collection);
    if (this.flushTimer) clearTimeout(this.flushTimer);
    this.flushTimer = setTimeout(() => this._flush(), this.flushDelay);
  }

  _genId() {
    this._seq += 1;
    return `${Date.now().toString(36)}-${this._seq.toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  _now() {
    return new Date().toISOString();
  }

  /* ---------- 公共接口 ---------- */

  /** 获取集合（数组）；profile 返回单对象或 null */
  all(collection) {
    if (collection === 'profile') return this.cache.profile;
    return this.cache[collection] || [];
  }

  find(collection, predicate) {
    return this.all(collection).filter(predicate || (() => true));
  }

  findById(collection, id) {
    if (collection === 'profile') return this.cache.profile;
    return this.all(collection).find(item => item.id === id) || null;
  }

  /** 插入一条；自动补 id/createdAt/updatedAt */
  insert(collection, item) {
    const record = {
      id: this._genId(),
      createdAt: this._now(),
      updatedAt: this._now(),
      ...item
    };
    if (collection === 'profile') {
      this.cache.profile = record;
    } else {
      this.cache[collection].push(record);
    }
    this._markDirty(collection);
    return record;
  }

  /** 更新一条；profile 走此接口时 id 可省略 */
  update(collection, id, patch) {
    const target = collection === 'profile' ? this.cache.profile
      : this.cache[collection].find(item => item.id === id);
    if (!target) return null;
    Object.assign(target, patch, { updatedAt: this._now() });
    this._markDirty(collection);
    return target;
  }

  /** 按 id 删除 */
  remove(collection, id) {
    if (collection === 'profile') {
      this.cache.profile = null;
      this._markDirty(collection);
      return true;
    }
    const arr = this.cache[collection];
    const idx = arr.findIndex(item => item.id === id);
    if (idx === -1) return false;
    arr.splice(idx, 1);
    this._markDirty(collection);
    return true;
  }

  /** 立即落盘（服务关闭前调用） */
  flushSync() {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    for (const collection of [...this.dirty]) {
      this._writeCollection(collection);
    }
    this.dirty.clear();
  }
}

module.exports = DataStore;
