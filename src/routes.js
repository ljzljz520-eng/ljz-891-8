'use strict';
/**
 * routes.js — API 路由
 *   POST /api/query   维保授权查询（每次查询写入审计日志，便于追溯）
 *   GET  /api/logs    查询日志列表（后台追溯）
 *   GET  /api/health  健康检查
 */

const express = require('express');
const store = require('./store');
const service = require('./service');

const router = express.Router();

/* ---------- 简单限流：每 IP 每分钟最多 30 次查询 ---------- */
const RATE_WINDOW_MS = 60 * 1000;
const RATE_MAX = 30;
const hits = new Map(); // ip -> number[]（时间戳）

function rateLimit(req, res, next) {
  const now = Date.now();
  const ip = req.ip || 'unknown';
  const list = (hits.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS);
  if (list.length >= RATE_MAX) {
    return res.status(429).json({ error: '查询过于频繁，请稍后再试' });
  }
  list.push(now);
  hits.set(ip, list);
  next();
}

/* ---------- 输入校验 ---------- */
function validateQueryBody(body) {
  const deviceNo = typeof body.deviceNo === 'string' ? body.deviceNo.trim() : '';
  const vendorName = typeof body.vendorName === 'string' ? body.vendorName.trim() : '';
  if (!deviceNo || !vendorName) {
    return { error: '设备编号和服务商名称均为必填项' };
  }
  if (deviceNo.length > 64 || vendorName.length > 100) {
    return { error: '输入内容过长，请核对后重新输入' };
  }
  return { deviceNo, vendorName };
}

/* ---------- POST /api/query ---------- */
router.post('/query', rateLimit, (req, res) => {
  const checked = validateQueryBody(req.body || {});
  if (checked.error) {
    return res.status(400).json({ error: checked.error });
  }
  const { deviceNo, vendorName } = checked;

  const record = service.findAuthorization(store.loadAuthorizations(), deviceNo, vendorName);

  // 审计日志：无论是否命中都完整记录，便于追溯
  store.appendLog({
    deviceNo,
    vendorName,
    matched: !!record,
    matchedId: record ? record.id : null,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });

  if (!record) {
    return res.json({ found: false });
  }
  return res.json({ found: true, record: service.toPublicRecord(record) });
});

/* ---------- GET /api/logs?limit=100&matched=all|hit|miss ---------- */
router.get('/logs', (req, res) => {
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 100, 1), 500);
  const filter = req.query.matched;
  let logs = store.recentLogs(limit);
  if (filter === 'hit') logs = logs.filter((l) => l.matched);
  if (filter === 'miss') logs = logs.filter((l) => !l.matched);
  res.json({ total: logs.length, logs });
});

/* ---------- GET /api/health ---------- */
router.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

module.exports = router;
