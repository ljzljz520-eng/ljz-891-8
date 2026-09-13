'use strict';
/**
 * store.js — JSON 文件持久化存储层
 *
 * 数据文件（data/ 目录，运行时自动创建）：
 *   - authorizations.json  维保授权记录（种子数据 + 后续可扩展为管理端维护）
 *   - query-logs.json      查询审计日志（每次查询追加，便于追溯）
 *
 * 写入采用「临时文件 + rename」原子替换，避免进程中断导致文件损坏。
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const AUTH_FILE = path.join(DATA_DIR, 'authorizations.json');
const LOG_FILE = path.join(DATA_DIR, 'query-logs.json');
const MAX_LOGS = 10000; // 日志保留上限，超出后裁剪最旧记录

function ensureDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') return fallback;
    // 文件损坏时不静默吞掉，打印错误并回退，避免服务起不来
    console.error(`[store] 读取 ${path.basename(file)} 失败，已回退默认值:`, err.message);
    return fallback;
  }
}

function writeJsonAtomic(file, data) {
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, file);
}

/* ---------------- 维保授权记录 ---------------- */

function loadAuthorizations() {
  return readJson(AUTH_FILE, []);
}

function saveAuthorizations(list) {
  ensureDir();
  writeJsonAtomic(AUTH_FILE, list);
}

/* ---------------- 查询审计日志 ---------------- */

function loadLogs() {
  return readJson(LOG_FILE, []);
}

/**
 * 追加一条查询日志。
 * @param {object} entry { deviceNo, vendorName, matched, matchedId, ip, userAgent }
 * @returns 已写入的完整日志记录（含 id 与时间戳）
 */
function appendLog(entry) {
  ensureDir();
  const logs = loadLogs();
  const record = {
    id: logs.length ? logs[logs.length - 1].id + 1 : 1,
    deviceNo: entry.deviceNo,
    vendorName: entry.vendorName,
    matched: !!entry.matched,
    matchedId: entry.matchedId || null,
    ip: entry.ip || '',
    userAgent: (entry.userAgent || '').slice(0, 300),
    queriedAt: new Date().toISOString(),
  };
  logs.push(record);
  // 超出上限时裁剪最旧记录，保持文件体积可控
  const trimmed = logs.length > MAX_LOGS ? logs.slice(logs.length - MAX_LOGS) : logs;
  writeJsonAtomic(LOG_FILE, trimmed);
  return record;
}

/** 读取最近 limit 条日志（新的在前） */
function recentLogs(limit = 100) {
  const logs = loadLogs();
  return logs.slice(-limit).reverse();
}

module.exports = {
  loadAuthorizations,
  saveAuthorizations,
  appendLog,
  recentLogs,
  AUTH_FILE,
  LOG_FILE,
};
