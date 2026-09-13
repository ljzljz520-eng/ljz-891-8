'use strict';
/**
 * server.js — 医疗设备维保授权查询系统入口
 * 启动：npm start（默认端口 3000，可用 PORT 环境变量覆盖）
 */

const path = require('path');
const express = require('express');
const { seedIfEmpty } = require('./src/seed');
const apiRoutes = require('./src/routes');

const app = express();
const PORT = process.env.PORT || 3000;

// 首次启动写入示例数据
seedIfEmpty();

// 安全响应头
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  next();
});

app.use(express.json({ limit: '10kb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api', apiRoutes);

// API 404
app.use('/api', (req, res) => res.status(404).json({ error: '接口不存在' }));

// 统一错误处理
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: '请求体不是合法的 JSON' });
  }
  console.error('[server] 未处理异常:', err);
  res.status(500).json({ error: '服务器内部错误' });
});

app.listen(PORT, () => {
  console.log(`医疗设备维保授权查询系统已启动: http://localhost:${PORT}`);
  console.log(`查询日志追溯页: http://localhost:${PORT}/admin.html`);
});
