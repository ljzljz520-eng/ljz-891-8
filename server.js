const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_DIR = path.join(__dirname, 'data');
const AUTH_FILE = path.join(DATA_DIR, 'authorizations.json');
const LOG_FILE = path.join(DATA_DIR, 'query_logs.jsonl');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ---------- 数据加载 ----------
function loadAuthorizations() {
  try {
    return JSON.parse(fs.readFileSync(AUTH_FILE, 'utf8'));
  } catch (e) {
    console.error('授权数据加载失败:', e.message);
    return [];
  }
}

// ---------- 查询日志（每次查询均记录，便于追溯） ----------
function writeQueryLog(entry) {
  const line = JSON.stringify(entry) + '\n';
  fs.appendFile(LOG_FILE, line, (err) => {
    if (err) console.error('查询日志写入失败:', err.message);
  });
}

// 归一化：去空格、统一大小写，便于模糊匹配
function normalize(str) {
  return String(str || '').trim().replace(/\s+/g, '').toLowerCase();
}

// ---------- API：维保授权查询 ----------
app.post('/api/query', (req, res) => {
  const { deviceNo, providerName } = req.body || {};
  const queryId = crypto.randomUUID();
  const now = new Date().toISOString();

  // 参数校验
  if (!deviceNo || !String(deviceNo).trim() || !providerName || !String(providerName).trim()) {
    writeQueryLog({
      id: queryId, timestamp: now,
      deviceNo: deviceNo || '', providerName: providerName || '',
      result: 'invalid_param', matchedContract: null,
      ip: req.ip
    });
    return res.status(400).json({
      found: false,
      queryId,
      error: 'INVALID_PARAM',
      message: '设备编号和服务商名称均为必填项。'
    });
  }

  const list = loadAuthorizations();
  const nDevice = normalize(deviceNo);
  const nProvider = normalize(providerName);

  // 设备编号精确匹配 + 服务商名称模糊匹配（支持输入简称，如"华康"）
  const record = list.find(item =>
    normalize(item.deviceNo) === nDevice &&
    (normalize(item.providerName).includes(nProvider) || nProvider.includes(normalize(item.providerName)))
  );

  if (record) {
    const validTo = new Date(record.validTo + 'T23:59:59');
    const today = new Date();
    const daysLeft = Math.ceil((validTo - today) / (1000 * 60 * 60 * 24));
    let status = 'valid';            // 有效
    if (daysLeft < 0) status = 'expired';        // 已过期
    else if (daysLeft <= 30) status = 'expiring'; // 即将到期

    writeQueryLog({
      id: queryId, timestamp: now,
      deviceNo: String(deviceNo).trim(), providerName: String(providerName).trim(),
      result: 'found', matchedContract: record.contractNo,
      ip: req.ip
    });

    return res.json({
      found: true,
      queryId,
      data: {
        deviceNo: record.deviceNo,
        deviceName: record.deviceName,
        providerName: record.providerName,
        contractNo: record.contractNo,
        scope: record.scope,
        engineers: record.engineers,
        validFrom: record.validFrom,
        validTo: record.validTo,
        validityStatus: status,
        daysLeft,
        servicePhone: record.servicePhone
      }
    });
  }

  // 未查到
  writeQueryLog({
    id: queryId, timestamp: now,
    deviceNo: String(deviceNo).trim(), providerName: String(providerName).trim(),
    result: 'not_found', matchedContract: null,
    ip: req.ip
  });

  return res.json({
    found: false,
    queryId,
    message: '未查询到与该设备编号及服务商匹配的维保授权记录。'
  });
});

// ---------- API：查询日志（追溯用） ----------
app.get('/api/logs', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
  fs.readFile(LOG_FILE, 'utf8', (err, content) => {
    if (err) return res.json({ total: 0, logs: [] });
    const logs = content.trim().split('\n').filter(Boolean)
      .map(line => { try { return JSON.parse(line); } catch { return null; } })
      .filter(Boolean);
    res.json({ total: logs.length, logs: logs.slice(-limit).reverse() });
  });
});

app.listen(PORT, () => {
  console.log(`医疗设备维保授权查询服务已启动: http://localhost:${PORT}`);
});
