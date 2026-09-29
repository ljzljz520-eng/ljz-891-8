/**
 * 维保授权查询页 前端逻辑
 */
const form = document.getElementById('queryForm');
const submitBtn = document.getElementById('submitBtn');
const loading = document.getElementById('loading');
const resultArea = document.getElementById('resultArea');
const codeInput = document.getElementById('equipmentCode');
const providerInput = document.getElementById('providerName');

const VALIDITY_BADGE = {
  active: { cls: 'active', text: '✓ 授权有效' },
  expiring: { cls: 'expiring', text: '⚠ 即将到期' },
  expired: { cls: 'expired', text: '✕ 已过期' }
};

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
}

function clearFieldErrors() {
  ['err-equipmentCode', 'err-providerName'].forEach((id) => {
    document.getElementById(id).textContent = '';
  });
  codeInput.classList.remove('invalid');
  providerInput.classList.remove('invalid');
}

function setFieldError(field, msg) {
  const errEl = document.getElementById('err-' + field);
  if (errEl) errEl.textContent = msg;
  document.getElementById(field).classList.add('invalid');
}

function setLoading(isLoading) {
  loading.classList.toggle('show', isLoading);
  submitBtn.disabled = isLoading;
  submitBtn.querySelector('span').textContent = isLoading ? '查询中…' : '查询';
}

/** 渲染成功结果 */
function renderFound(data) {
  const badge = VALIDITY_BADGE[data.validity.status] || VALIDITY_BADGE.active;
  const engineersHtml = data.authorizedEngineers
    .map(
      (eng) => `
      <div class="engineer-card">
        <div class="engineer-avatar">👷</div>
        <div>
          <div class="eng-name">${escapeHtml(eng.name)}</div>
          <div class="eng-title">${escapeHtml(eng.title)}</div>
          <div class="eng-phone">${escapeHtml(eng.phone)}</div>
          <div class="eng-cert">证书编号：${escapeHtml(eng.certNo)}</div>
        </div>
      </div>`
    )
    .join('');

  resultArea.innerHTML = `
    <div class="result-banner success">
      <span>✓</span>
      <span>已查询到该设备的维保授权信息，授权状态：<strong>${badge.text}</strong></span>
    </div>

    <div class="info-grid">
      <div class="info-item"><div class="label">设备编号</div><div class="value">${escapeHtml(data.equipmentCode)}</div></div>
      <div class="info-item"><div class="label">设备名称</div><div class="value">${escapeHtml(data.equipmentName)}</div></div>
      <div class="info-item"><div class="label">设备型号</div><div class="value">${escapeHtml(data.model)}</div></div>
      <div class="info-item"><div class="label">服务商名称</div><div class="value">${escapeHtml(data.providerName)}</div></div>
    </div>

    <div class="section-block">
      <h4>📋 维保范围</h4>
      <div class="scope-text">${escapeHtml(data.maintenanceScope)}</div>
    </div>

    <div class="section-block">
      <h4>👥 授权工程师（${data.authorizedEngineers.length} 人）</h4>
      <div class="engineer-list">${engineersHtml}</div>
    </div>

    <div class="section-block">
      <h4>📅 授权有效期</h4>
      <div class="validity-box">
        <div class="validity-dates">
          ${escapeHtml(data.validFrom)}<span class="sep">至</span>${escapeHtml(data.validTo)}
        </div>
        <span class="badge ${badge.cls}">${badge.text}</span>
        <span class="validity-note">
          ${
            data.validity.status === 'expired'
              ? '该授权已过期，请联系服务商或拨打人工核验电话确认续保状态'
              : data.validity.status === 'expiring'
              ? `距到期还有 ${data.validity.days} 天，请及时办理续保手续`
              : `距到期还有 ${data.validity.days} 天`
          }
        </span>
      </div>
    </div>

    <div class="section-block">
      <h4>📞 服务电话</h4>
      <div class="service-phone-box">
        <div>
          <div class="sp-label">维保服务热线（7×24 小时）</div>
          <div class="sp-number">${escapeHtml(data.servicePhone)}</div>
        </div>
        <a class="sp-call" href="tel:${escapeHtml(data.servicePhone)}">立即拨打</a>
      </div>
    </div>

    <div class="result-actions">
      <button type="button" class="btn btn-secondary" id="btnNewQuery">重新输入</button>
      <button type="button" class="btn btn-ghost" id="btnPrint">打印此结果</button>
    </div>
  `;

  resultArea.classList.add('show');
  resultArea.scrollIntoView({ behavior: 'smooth', block: 'start' });

  document.getElementById('btnNewQuery').addEventListener('click', resetForm);
  document.getElementById('btnPrint').addEventListener('click', () => window.print());
}

/** 渲染未找到结果 + 人工核验说明 */
function renderNotFound(body) {
  const mv = body.manualVerification || {};
  resultArea.innerHTML = `
    <div class="result-banner notfound">
      <span>✕</span>
      <span>未查询到对应的维保授权信息</span>
    </div>

    <div class="notfound-panel">
      <div class="nf-icon">🔍</div>
      <h3>未找到维保授权记录</h3>
      <p class="nf-query">
        设备编号 <strong>${escapeHtml(body.query?.equipmentCode)}</strong> 与服务商
        <strong>${escapeHtml(body.query?.providerName)}</strong> 的组合未匹配到有效授权。
      </p>

      <ul class="manual-reasons">
        <li>设备编号或服务商名称输入有误（请核对设备铭牌或维保合同中的全称）；</li>
        <li>设备维保信息尚未录入系统或授权已失效；</li>
        <li>新购设备尚在信息同步期内。</li>
      </ul>

      <div class="manual-box">
        <h4>🛠 人工核验说明</h4>
        <div class="manual-grid">
          <div class="manual-item">
            <span class="m-label">人工核验热线</span>
            <span class="m-value hotline">${escapeHtml(mv.hotline || '400-888-0000')}</span>
          </div>
          <div class="manual-item">
            <span class="m-label">专线说明</span>
            <span class="m-value">${escapeHtml(mv.hotlineExt || '转 3 人工核验专席')}</span>
          </div>
          <div class="manual-item">
            <span class="m-label">核验邮箱</span>
            <span class="m-value">${escapeHtml(mv.email || '')}</span>
          </div>
          <div class="manual-item">
            <span class="m-label">服务时间</span>
            <span class="m-value">${escapeHtml(mv.serviceHours || '')}</span>
          </div>
          <div class="manual-item">
            <span class="m-label">办理地点</span>
            <span class="m-value">${escapeHtml(mv.address || '')}</span>
          </div>
          <div class="manual-item">
            <span class="m-label">处理时限</span>
            <span class="m-value">${escapeHtml(mv.processingTime || '1-3 个工作日')}</span>
          </div>
        </div>
        <p style="font-size:13px;color:#92400e;margin-top:12px;">
          核验所需材料：${(mv.materials || []).map(escapeHtml).join('、')}，请提前准备以便快速核实。
        </p>
      </div>

      <div class="result-actions" style="justify-content:center;">
        <button type="button" class="btn btn-primary" id="btnRetry">↺ 重新输入</button>
      </div>
    </div>
  `;

  resultArea.classList.add('show');
  resultArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
  document.getElementById('btnRetry').addEventListener('click', resetForm);
}

/** 重置表单并回到输入状态 */
function resetForm() {
  form.reset();
  clearFieldErrors();
  resultArea.classList.remove('show');
  resultArea.innerHTML = '';
  codeInput.focus();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearFieldErrors();

  const equipmentCode = codeInput.value.trim();
  const providerName = providerInput.value.trim();

  let hasError = false;
  if (!equipmentCode) {
    setFieldError('equipmentCode', '请填写设备编号');
    hasError = true;
  }
  if (!providerName) {
    setFieldError('providerName', '请填写服务商名称');
    hasError = true;
  }
  if (hasError) return;

  setLoading(true);
  resultArea.classList.remove('show');

  try {
    const resp = await fetch('/api/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ equipmentCode, providerName })
    });
    const body = await resp.json();

    if (resp.ok && body.result === 'found') {
      renderFound(body.data);
    } else if (body.result === 'not_found') {
      renderNotFound(body);
    } else {
      // 校验失败等
      if (body.message) {
        if (!equipmentCode) setFieldError('equipmentCode', body.message);
        else if (!providerName) setFieldError('providerName', body.message);
        else alert(body.message);
      }
    }
  } catch (err) {
    resultArea.innerHTML = `
      <div class="result-banner notfound">
        <span>✕</span><span>查询服务暂时不可用，请稍后重试或拨打人工核验热线。</span>
      </div>
      <div class="result-actions">
        <button type="button" class="btn btn-primary" id="btnRetry">↺ 重新输入</button>
      </div>`;
    resultArea.classList.add('show');
    document.getElementById('btnRetry').addEventListener('click', resetForm);
  } finally {
    setLoading(false);
  }
});
