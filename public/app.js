'use strict';
/* 查询页前端逻辑：提交查询、渲染结果、未命中时展示人工核验说明 */

(function () {
  var form = document.getElementById('query-form');
  var deviceNoInput = document.getElementById('device-no');
  var vendorInput = document.getElementById('vendor-name');
  var submitBtn = document.getElementById('submit-btn');
  var formError = document.getElementById('form-error');
  var loading = document.getElementById('loading');
  var resultCard = document.getElementById('result-card');
  var notFoundCard = document.getElementById('not-found-card');

  /** 安全写入文本（防 XSS） */
  function setText(id, text) {
    document.getElementById(id).textContent = text == null ? '' : String(text);
  }

  function showError(msg) {
    formError.textContent = msg;
    formError.hidden = false;
  }

  function hideAll() {
    formError.hidden = true;
    loading.hidden = true;
    resultCard.hidden = true;
    notFoundCard.hidden = true;
  }

  function setBusy(busy) {
    submitBtn.disabled = busy;
    submitBtn.textContent = busy ? '查询中…' : '查 询';
    loading.hidden = !busy;
  }

  /** 渲染命中的授权信息 */
  function renderResult(record) {
    setText('r-device-no', record.deviceNo);
    setText('r-device-name', record.deviceName);
    setText('r-vendor-name', record.vendorName);
    setText('r-valid-range', record.validFrom + ' 至 ' + record.validUntil);
    setText('r-scope', record.scope);

    // 有效期状态徽标
    var badge = document.getElementById('validity-badge');
    badge.textContent = record.validityLabel;
    badge.className = 'badge ' + record.validityStatus;

    // 剩余天数提示（仅即将到期时展示）
    var daysEl = document.getElementById('r-days-remaining');
    if (record.validityStatus === 'expiring' && typeof record.daysRemaining === 'number') {
      daysEl.textContent = '（剩余 ' + record.daysRemaining + ' 天）';
    } else if (record.validityStatus === 'expired') {
      daysEl.textContent = '（授权已过期，请联系服务商续签）';
    } else if (record.validityStatus === 'not_started') {
      daysEl.textContent = '（授权尚未生效）';
    } else {
      daysEl.textContent = '';
    }

    // 授权工程师列表
    var tbody = document.getElementById('r-engineers');
    tbody.innerHTML = '';
    (record.engineers || []).forEach(function (eng) {
      var tr = document.createElement('tr');
      [eng.name, eng.certNo, eng.phone].forEach(function (val) {
        var td = document.createElement('td');
        td.textContent = val == null ? '' : String(val);
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });

    // 服务电话（tel: 链接，号码仅保留数字与 + -）
    var phone = String(record.servicePhone || '');
    var phoneLink = document.getElementById('r-service-phone');
    phoneLink.textContent = phone;
    phoneLink.setAttribute('href', 'tel:' + phone.replace(/[^0-9+\-]/g, ''));

    resultCard.hidden = false;
    resultCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function renderNotFound() {
    notFoundCard.hidden = false;
    notFoundCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /** 重新输入：清空表单并回到初始状态 */
  function resetToInput() {
    form.reset();
    hideAll();
    deviceNoInput.focus();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  document.getElementById('back-btn-1').addEventListener('click', resetToInput);
  document.getElementById('back-btn-2').addEventListener('click', resetToInput);

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    hideAll();

    var deviceNo = deviceNoInput.value.trim();
    var vendorName = vendorInput.value.trim();
    if (!deviceNo || !vendorName) {
      showError('请填写设备编号和服务商名称');
      return;
    }

    setBusy(true);
    fetch('/api/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceNo: deviceNo, vendorName: vendorName }),
    })
      .then(function (res) {
        return res.json().then(function (data) {
          return { ok: res.ok, data: data };
        });
      })
      .then(function (resp) {
        setBusy(false);
        if (!resp.ok) {
          showError(resp.data && resp.data.error ? resp.data.error : '查询失败，请稍后重试');
          return;
        }
        if (resp.data.found) {
          renderResult(resp.data.record);
        } else {
          renderNotFound();
        }
      })
      .catch(function () {
        setBusy(false);
        showError('网络异常，请检查网络后重试');
      });
  });
})();
