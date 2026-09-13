'use strict';
/* 单元测试：输入规范化、授权匹配、有效期状态计算（node test/api.test.js） */

const assert = require('assert');
const {
  findAuthorization,
  validityOf,
  toPublicRecord,
  normalizeDeviceNo,
  normalizeVendor,
} = require('../src/service');

const NOW = new Date('2026-09-13T12:00:00');

const SAMPLE = [
  {
    id: 1,
    deviceNo: 'EQ-2024-00123',
    deviceName: '呼吸机',
    vendorName: '深圳迈瑞生物医疗电子股份有限公司',
    scope: '整机维保',
    engineers: [{ name: '王建国', certNo: 'MR-1', phone: '0755-0000' }],
    validFrom: '2026-01-01',
    validUntil: '2027-12-31',
    servicePhone: '400-830-9118',
  },
  {
    id: 2,
    deviceNo: 'EQ-2023-00456',
    deviceName: 'CT',
    vendorName: 'GE医疗（中国）有限公司',
    scope: '核心部件',
    engineers: [],
    validFrom: '2025-10-15',
    validUntil: '2026-10-10',
    servicePhone: '400-820-8666',
  },
  {
    id: 3,
    deviceNo: 'EQ-2022-00789',
    deviceName: '超声',
    vendorName: '飞利浦（中国）投资有限公司',
    scope: '整机',
    engineers: [],
    validFrom: '2024-07-01',
    validUntil: '2026-06-30',
    servicePhone: '400-880-0055',
  },
  {
    id: 4,
    deviceNo: 'EQ-2026-10001',
    deviceName: '加速器',
    vendorName: '上海联影医疗科技股份有限公司',
    scope: '全保',
    engineers: [],
    validFrom: '2026-10-01',
    validUntil: '2029-09-30',
    servicePhone: '400-686-1566',
  },
];

let passed = 0;
function test(name, fn) {
  try {
    fn();
    passed++;
    console.log('  ✓ ' + name);
  } catch (err) {
    console.error('  ✗ ' + name);
    console.error('    ' + err.message);
    process.exitCode = 1;
  }
}

console.log('输入规范化');
test('设备编号去空白并转大写', () => {
  assert.strictEqual(normalizeDeviceNo(' eq-2024-00123 '), 'EQ-2024-00123');
  assert.strictEqual(normalizeDeviceNo('EQ 2024 00123'), 'EQ202400123');
});
test('服务商名称去全部空白并转小写', () => {
  assert.strictEqual(normalizeVendor(' GE医疗（中国） '), 'ge医疗（中国）');
});
test('空输入安全处理', () => {
  assert.strictEqual(normalizeDeviceNo(null), '');
  assert.strictEqual(normalizeVendor(undefined), '');
});

console.log('授权匹配');
test('设备编号+服务商全称精确命中', () => {
  const r = findAuthorization(SAMPLE, 'EQ-2024-00123', '深圳迈瑞生物医疗电子股份有限公司');
  assert.ok(r && r.id === 1);
});
test('设备编号大小写/空格不敏感', () => {
  const r = findAuthorization(SAMPLE, ' eq-2024-00123 ', '深圳迈瑞生物医疗电子股份有限公司');
  assert.ok(r && r.id === 1);
});
test('服务商简称模糊命中', () => {
  const r = findAuthorization(SAMPLE, 'EQ-2023-00456', 'GE医疗');
  assert.ok(r && r.id === 2);
});
test('设备编号错误时不命中', () => {
  assert.strictEqual(findAuthorization(SAMPLE, 'EQ-0000-00000', 'GE医疗'), null);
});
test('服务商错误时不命中', () => {
  assert.strictEqual(findAuthorization(SAMPLE, 'EQ-2024-00123', '不存在的公司'), null);
});
test('空输入不命中', () => {
  assert.strictEqual(findAuthorization(SAMPLE, '', ''), null);
});

console.log('有效期状态');
test('有效（active）', () => {
  assert.strictEqual(validityOf(SAMPLE[0], NOW).status, 'active');
});
test('即将到期（expiring，剩余27天）', () => {
  const v = validityOf(SAMPLE[1], NOW);
  assert.strictEqual(v.status, 'expiring');
  assert.strictEqual(v.daysRemaining, 27);
});
test('已过期（expired）', () => {
  assert.strictEqual(validityOf(SAMPLE[2], NOW).status, 'expired');
});
test('未生效（not_started）', () => {
  assert.strictEqual(validityOf(SAMPLE[3], NOW).status, 'not_started');
});
test('到期当天仍算有效', () => {
  const v = validityOf(SAMPLE[1], new Date('2026-10-10T09:00:00'));
  assert.strictEqual(v.status, 'expiring');
  assert.strictEqual(v.daysRemaining, 0);
});
test('到期次日为已过期', () => {
  assert.strictEqual(validityOf(SAMPLE[1], new Date('2026-10-11T09:00:00')).status, 'expired');
});

console.log('对外记录组装');
test('toPublicRecord 包含全部展示字段', () => {
  const r = toPublicRecord(SAMPLE[0], NOW);
  ['deviceNo', 'deviceName', 'vendorName', 'scope', 'engineers',
   'validFrom', 'validUntil', 'servicePhone', 'validityStatus', 'validityLabel', 'daysRemaining',
  ].forEach((k) => assert.ok(k in r, '缺少字段 ' + k));
});

console.log(`\n${passed} 个测试通过${process.exitCode ? '，存在失败' : ''}`);
