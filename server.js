/**
 * 医疗设备维保授权查询系统 - 服务端
 *
 * 功能：
 * 1. GET  /                    维保授权查询页
 * 2. POST /api/query           按设备编号 + 服务商名称查询维保授权（每次查询均记录日志）
 * 3. GET  /api/records         查询记录（分页、可按结果筛选），用于追溯
 * 4. GET  /api/records/export  导出查询记录 CSV
 * 5. GET  /api/stats           查询统计
 */
const express = require('express');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

/** 人工核验说明（查不到时返回） */
const MANUAL_VERIFICATION = {
  hotline: '400-888-0000',
  hotlineExt: '转 3 （维保授权人工核验专席）',
  email: 'maintenance@hospital.example.cn',
  serviceHours: '周一至周五 9:00 - 17:00（法定节假日除外）',
  materials: ['设备编号', '设备名称', '设备购置凭证或设备铭牌照片', '使用科室及联系人'],
  processingTime: '1-3 个工作日',
  address: '设备科 维保管理办公室（门诊楼 5 层 512 室）'
};

/** 查询接口 */
app.post('/api/query', (req, res) => {
  const { equipmentCode, providerName } = req.body || {};
  const code = typeof equipmentCode === 'string' ? equipmentCode.trim() : '';
  const provider = typeof providerName === 'string' ? providerName.trim() : '';
  const ip =
    (req.headers['x-forwarded-for'] || '').toString().split(',')[0].trim() ||
    req.ip ||
    req.socket?.remoteAddress ||
    '';
  const userAgent = req.get('User-Agent') || '';

  // 参数校验：无效输入也记录，便于完整追溯
  if (!code || !provider) {
    db.logQuery({
      equipmentCode: code,
      providerName: provider,
      result: 'invalid',
      equipmentId: null,
      ip,
      userAgent
    });
    return res.status(400).json({
      success: false,
      result: 'invalid',
      message: !code && !provider
        ? '请填写设备编号和服务商名称'
        : !code
        ? '请填写设备编号'
        : '请填写服务商名称'
    });
  }

  const equipment = db.findEquipment(code, provider);
  if (equipment) {
    db.logQuery({
      equipmentCode: code,
      providerName: provider,
      result: 'found',
      equipmentId: equipment.id,
      ip,
      userAgent
    });
    return res.json({ success: true, result: 'found', data: equipment });
  }

  // 未查询到：记录日志并返回人工核验说明
  db.logQuery({
    equipmentCode: code,
    providerName: provider,
    result: 'not_found',
    equipmentId: null,
    ip,
    userAgent
  });
  return res.status(404).json({
    success: false,
    result: 'not_found',
    message: '未查询到对应的维保授权信息',
    query: { equipmentCode: code, providerName: provider },
    manualVerification: MANUAL_VERIFICATION
  });
});

/** 查询记录（追溯） */
app.get('/api/records', (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const pageSize = Math.min(100, parseInt(req.query.pageSize, 10) || 20);
  const result = req.query.result || '';
  const data = db.getRecords({ page, pageSize, result });
  res.json({ success: true, ...data });
});

/** 导出 CSV（追溯存档） */
app.get('/api/records/export', (req, res) => {
  const rows = db.getAllRecords();
  const header = ['查询时间', '设备编号', '服务商名称', '查询结果', 'IP 地址', 'User-Agent'];
  const label = { found: '查询成功', not_found: '未查询到', invalid: '无效输入' };
  const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [header.map(escape).join(',')];
  for (const r of rows) {
    lines.push(
      [r.queriedAt, r.equipmentCode, r.providerName, label[r.result] || r.result, r.ip, r.userAgent]
        .map(escape)
        .join(',')
    );
  }
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="maintenance-query-records-${Date.now()}.csv"`
  );
  res.send('﻿' + lines.join('\n'));
});

/** 统计概览 */
app.get('/api/stats', (req, res) => {
  res.json({ success: true, data: db.getStats() });
});

app.listen(PORT, () => {
  console.log(`医疗设备维保授权查询系统已启动: http://localhost:${PORT}`);
});
