/**
 * 数据访问层
 * 使用 JSON 文件持久化，避免原生模块依赖
 * - equipment: 维保授权设备台账
 * - query_logs: 每次查询记录（便于追溯）
 */
const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, 'data');
const dbFile = path.join(dataDir, 'db.json');

if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

function seedData() {
  return {
    equipment: [
      {
        id: 1,
        equipmentCode: 'GE-CT-2023-001',
        equipmentName: '64排螺旋CT机',
        model: 'Revolution Maxima',
        providerName: '通用电气医疗系统贸易发展（上海）有限公司',
        maintenanceScope:
          'CT主机（含球管、探测器、高压发生器）、扫描床、控制台及配套影像软件的预防性维护、故障维修及备件更换；含年度预防性保养（PM）4次。',
        authorizedEngineers: [
          { name: '张伟', title: '高级维修工程师', phone: '138****6621', certNo: 'GE-CT-2019-087' },
          { name: '李强', title: '维修工程师', phone: '139****3308', certNo: 'GE-CT-2021-142' }
        ],
        validFrom: '2025-01-01',
        validTo: '2027-12-31',
        servicePhone: '400-810-8888',
        status: 'active'
      },
      {
        id: 2,
        equipmentCode: 'PHILIPS-MRI-002',
        equipmentName: '3.0T磁共振成像系统',
        model: 'Ingenia Elition 3.0T',
        providerName: '飞利浦（中国）投资有限公司',
        maintenanceScope:
          '磁体系统、梯度系统、射频系统、谱仪及氦制冷系统的维保，含年度预防性保养、紧急维修及液氦补充服务。',
        authorizedEngineers: [
          { name: '王芳', title: '高级维修工程师', phone: '137****5520', certNo: 'PH-MRI-2018-031' },
          { name: '陈杰', title: '维修工程师', phone: '136****7745', certNo: 'PH-MRI-2022-056' }
        ],
        validFrom: '2024-07-01',
        validTo: '2026-06-30',
        servicePhone: '400-880-0008',
        status: 'active'
      },
      {
        id: 3,
        equipmentCode: 'SIEMENS-US-003',
        equipmentName: '彩色多普勒超声诊断仪',
        model: 'Acuson Sequoia',
        providerName: '西门子医疗系统有限公司',
        maintenanceScope:
          '超声主机、探头（含阵元）、显示器及外设的维修与保养；探头更换与阵元修复服务；含软件升级。',
        authorizedEngineers: [
          { name: '刘洋', title: '高级维修工程师', phone: '135****9912', certNo: 'SI-US-2020-078' },
          { name: '赵静', title: '维修工程师', phone: '138****2264', certNo: 'SI-US-2023-019' }
        ],
        validFrom: '2025-10-15',
        validTo: '2026-10-15',
        servicePhone: '400-810-0888',
        status: 'active'
      },
      {
        id: 4,
        equipmentCode: 'MINDRAY-VT-004',
        equipmentName: '全自动生化分析仪',
        model: 'BS-2000M2',
        providerName: '深圳迈瑞生物医疗电子股份有限公司',
        maintenanceScope:
          '生化分析模块、样本处理模块、试剂管理系统的年度保养、故障维修及耗材供应；含光路校准与质控服务。',
        authorizedEngineers: [
          { name: '孙磊', title: '高级维修工程师', phone: '139****4471', certNo: 'MR-VT-2019-104' },
          { name: '周敏', title: '维修工程师', phone: '137****8830', certNo: 'MR-VT-2022-211' }
        ],
        validFrom: '2026-03-01',
        validTo: '2028-02-28',
        servicePhone: '400-700-5652',
        status: 'active'
      },
      {
        id: 5,
        equipmentCode: 'UI-DR-005',
        equipmentName: '数字X射线摄影系统（DR）',
        model: 'uDR 596i',
        providerName: '上海联影医疗科技股份有限公司',
        maintenanceScope:
          'X射线球管、平板探测器、高压发生器、摄影架及影像工作站的维修与年度保养；含软件升级服务。',
        authorizedEngineers: [
          { name: '黄斌', title: '高级维修工程师', phone: '136****1187', certNo: 'UI-DR-2017-006' }
        ],
        validFrom: '2024-01-01',
        validTo: '2025-12-31',
        servicePhone: '400-001-8899',
        status: 'active'
      }
    ],
    queryLogs: [],
    meta: { equipmentSeq: 5, logSeq: 0 }
  };
}

let db;
function load() {
  if (db) return db;
  if (fs.existsSync(dbFile)) {
    try {
      db = JSON.parse(fs.readFileSync(dbFile, 'utf-8'));
      if (!db.equipment || !db.queryLogs) throw new Error('bad db');
      return db;
    } catch (e) {
      console.warn('数据库文件损坏，重新初始化:', e.message);
    }
  }
  db = seedData();
  save();
  return db;
}

function save() {
  const tmp = dbFile + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2), 'utf-8');
  fs.renameSync(tmp, dbFile);
}

/** 维保有效期状态 */
function validityStatus(equipment, today = new Date()) {
  const to = new Date(equipment.validTo + 'T23:59:59');
  const days = Math.ceil((to - today) / (1000 * 60 * 60 * 24));
  if (days < 0) return { status: 'expired', label: '已过期', days };
  if (days <= 90) return { status: 'expiring', label: '即将到期', days };
  return { status: 'active', label: '有效', days };
}

/** 按设备编号 + 服务商名称精确匹配（忽略大小写与首尾空格） */
function findEquipment(equipmentCode, providerName) {
  const data = load();
  const code = (equipmentCode || '').trim().toLowerCase();
  const provider = (providerName || '').trim().toLowerCase();
  const eq = data.equipment.find(
    (e) =>
      e.status === 'active' &&
      e.equipmentCode.toLowerCase() === code &&
      e.providerName.toLowerCase() === provider
  );
  if (!eq) return null;
  const vs = validityStatus(eq);
  return { ...eq, validity: vs };
}

/** 记录一次查询 */
function logQuery({ equipmentCode, providerName, result, equipmentId, ip, userAgent }) {
  const data = load();
  data.meta.logSeq += 1;
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const queriedAt =
    `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ` +
    `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  data.queryLogs.push({
    id: data.meta.logSeq,
    equipmentId: equipmentId || null,
    equipmentCode: (equipmentCode || '').trim(),
    providerName: (providerName || '').trim(),
    result, // found | not_found | invalid
    queriedAt,
    ip: ip || '',
    userAgent: userAgent || ''
  });
  save();
}

/** 分页查询记录 */
function getRecords({ page = 1, pageSize = 20, result } = {}) {
  const data = load();
  let logs = [...data.queryLogs].sort((a, b) => b.id - a.id);
  if (result && ['found', 'not_found', 'invalid'].includes(result)) {
    logs = logs.filter((l) => l.result === result);
  }
  const total = logs.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const p = Math.min(Math.max(1, page), totalPages);
  const rows = logs.slice((p - 1) * pageSize, p * pageSize);
  return { rows, total, page: p, pageSize, totalPages };
}

function getAllRecords() {
  const data = load();
  return [...data.queryLogs].sort((a, b) => b.id - a.id);
}

function getStats() {
  const data = load();
  const logs = data.queryLogs;
  const found = logs.filter((l) => l.result === 'found').length;
  const notFound = logs.filter((l) => l.result === 'not_found').length;
  const invalid = logs.filter((l) => l.result === 'invalid').length;
  return {
    total: logs.length,
    found,
    notFound,
    invalid,
    equipmentCount: data.equipment.length,
    hitRate: logs.length ? Math.round((found / logs.length) * 100) : 0
  };
}

module.exports = { findEquipment, logQuery, getRecords, getAllRecords, getStats, validityStatus };
