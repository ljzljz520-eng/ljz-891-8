'use strict';
/**
 * service.js — 查询业务逻辑：输入规范化、授权匹配、有效期状态计算。
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const EXPIRING_SOON_DAYS = 30; // 距到期 ≤30 天视为「即将到期」

/** 设备编号规范化：去除全部空白并转大写，容忍用户输入习惯差异 */
function normalizeDeviceNo(input) {
  return String(input || '').replace(/\s+/g, '').toUpperCase();
}

/** 服务商名称规范化：去除全部空白并转小写（中文不受影响） */
function normalizeVendor(input) {
  return String(input || '').replace(/\s+/g, '').toLowerCase();
}

/**
 * 在授权列表中查找匹配记录。
 * 规则：设备编号规范化后精确相等；服务商名称规范化后相等或双向包含（输入至少 2 字）。
 */
function findAuthorization(authorizations, deviceNoInput, vendorInput) {
  const deviceNo = normalizeDeviceNo(deviceNoInput);
  const vendor = normalizeVendor(vendorInput);
  if (!deviceNo || !vendor) return null;

  return (
    authorizations.find((item) => {
      if (normalizeDeviceNo(item.deviceNo) !== deviceNo) return false;
      const target = normalizeVendor(item.vendorName);
      if (target === vendor) return true;
      if (vendor.length >= 2 && (target.includes(vendor) || vendor.includes(target))) {
        return true;
      }
      return false;
    }) || null
  );
}

/** 计算有效期状态。返回 { status, label, daysRemaining } */
function validityOf(record, now = new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const from = new Date(record.validFrom + 'T00:00:00');
  const until = new Date(record.validUntil + 'T00:00:00');

  if (today < from) {
    return { status: 'not_started', label: '未生效', daysRemaining: null };
  }
  if (today > until) {
    return { status: 'expired', label: '已过期', daysRemaining: 0 };
  }
  const daysRemaining = Math.round((until - today) / MS_PER_DAY);
  if (daysRemaining <= EXPIRING_SOON_DAYS) {
    return { status: 'expiring', label: '即将到期', daysRemaining };
  }
  return { status: 'active', label: '有效', daysRemaining };
}

/** 组装对外返回的授权信息（附带有效期状态） */
function toPublicRecord(record, now) {
  const validity = validityOf(record, now);
  return {
    deviceNo: record.deviceNo,
    deviceName: record.deviceName,
    vendorName: record.vendorName,
    scope: record.scope,
    engineers: record.engineers,
    validFrom: record.validFrom,
    validUntil: record.validUntil,
    servicePhone: record.servicePhone,
    validityStatus: validity.status,
    validityLabel: validity.label,
    daysRemaining: validity.daysRemaining,
  };
}

module.exports = { findAuthorization, validityOf, toPublicRecord, normalizeDeviceNo, normalizeVendor };
