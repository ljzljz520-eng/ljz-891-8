'use strict';
/**
 * seed.js — 首次启动时写入示例维保授权数据（data/authorizations.json 不存在时）。
 * 日期围绕 2026-09-13 设计，覆盖：有效 / 即将到期 / 已过期 / 未生效 四种状态。
 */

const store = require('./store');

const SEED = [
  {
    id: 1,
    deviceNo: 'EQ-2024-00123',
    deviceName: '呼吸机 SV300',
    vendorName: '深圳迈瑞生物医疗电子股份有限公司',
    scope: '整机维保（含预防性维护、故障维修、备件更换），每年 2 次巡检，7×24 小时应急响应',
    engineers: [
      { name: '王建国', certNo: 'MR-ENG-2023-1042', phone: '0755-2658-8201' },
      { name: '李慧敏', certNo: 'MR-ENG-2024-0117', phone: '0755-2658-8202' },
    ],
    validFrom: '2026-01-01',
    validUntil: '2027-12-31',
    servicePhone: '400-830-9118',
  },
  {
    id: 2,
    deviceNo: 'EQ-2023-00456',
    deviceName: '64排螺旋CT Revolution EVO',
    vendorName: 'GE医疗（中国）有限公司',
    scope: '核心部件维保（球管、探测器、高压发生器），含每年 4 次预防性维护，不含人为损坏',
    engineers: [
      { name: '张立群', certNo: 'GE-CT-2022-3385', phone: '021-5257-4601' },
    ],
    validFrom: '2025-10-15',
    validUntil: '2026-10-10',
    servicePhone: '400-820-8666',
  },
  {
    id: 3,
    deviceNo: 'EQ-2022-00789',
    deviceName: '彩色多普勒超声诊断仪 EPIQ 7',
    vendorName: '飞利浦（中国）投资有限公司',
    scope: '整机维保（不含探头），每年 1 次校准检测，工作日 8 小时响应',
    engineers: [
      { name: '陈晓东', certNo: 'PH-US-2021-0764', phone: '021-2305-6601' },
      { name: '赵雪', certNo: 'PH-US-2023-0291', phone: '021-2305-6602' },
    ],
    validFrom: '2024-07-01',
    validUntil: '2026-06-30',
    servicePhone: '400-880-0055',
  },
  {
    id: 4,
    deviceNo: 'EQ-2025-00001',
    deviceName: '3.0T磁共振成像系统 MAGNETOM Vida',
    vendorName: '西门子医疗系统有限公司',
    scope: '全保（含磁体、冷头、梯度系统、液氦补充），7×24 小时远程诊断 + 现场支持',
    engineers: [
      { name: '刘志强', certNo: 'SHS-MR-2024-0512', phone: '021-3889-5001' },
      { name: '孙雅婷', certNo: 'SHS-MR-2025-0043', phone: '021-3889-5002' },
      { name: '周永康', certNo: 'SHS-MR-2022-1180', phone: '021-3889-5003' },
    ],
    validFrom: '2025-06-01',
    validUntil: '2028-05-31',
    servicePhone: '400-810-5858',
  },
  {
    id: 5,
    deviceNo: 'EQ-2024-00888',
    deviceName: '数字化X射线摄影系统 新东方1000',
    vendorName: '北京万东医疗科技股份有限公司',
    scope: '整机维保（含平板探测器），每年 2 次预防性维护，4 小时到场响应',
    engineers: [
      { name: '马文军', certNo: 'WD-DR-2024-0215', phone: '010-6021-3301' },
    ],
    validFrom: '2026-03-01',
    validUntil: '2027-02-28',
    servicePhone: '400-650-5656',
  },
  {
    id: 6,
    deviceNo: 'EQ-2026-10001',
    deviceName: '一体化CT直线加速器 uRT-linac 506c',
    vendorName: '上海联影医疗科技股份有限公司',
    scope: '整机全保 + 放疗计划系统软件升级，含每年 12 次质控检测',
    engineers: [
      { name: '吴海涛', certNo: 'UIH-RT-2026-0033', phone: '021-6707-8801' },
    ],
    validFrom: '2026-10-01',
    validUntil: '2029-09-30',
    servicePhone: '400-686-1566',
  },
];

function seedIfEmpty() {
  const existing = store.loadAuthorizations();
  if (existing.length > 0) return false;
  store.saveAuthorizations(SEED);
  console.log(`[seed] 已写入 ${SEED.length} 条示例维保授权数据`);
  return true;
}

module.exports = { seedIfEmpty };
