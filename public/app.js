// ================= 元素引用 =================
const form           = document.getElementById('query-form');
const deviceNoInput  = document.getElementById('deviceNo');
const providerInput  = document.getElementById('providerName');
const submitBtn      = document.getElementById('submit-btn');

const querySection    = document.getElementById('query-section');
const resultSection   = document.getElementById('result-section');
const notfoundSection = document.getElementById('notfound-section');

// ================= 工具函数 =================
function showOnly(section) {
  [querySection, resultSection, notfoundSection].forEach(s => s.classList.add('hidden'));
  section.classList.remove('hidden');
  section.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function setError(inputId, msg) {
  document.getElementById('err-' + inputId).textContent = msg || '';
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ================= 表单校验 =================
function validate() {
  let ok = true;
  if (!deviceNoInput.value.trim())  { setError('deviceNo', '请输入设备编号'); ok = false; }
  else setError('deviceNo');
  if (!providerInput.value.trim())  { setError('providerName', '请输入服务商名称'); ok = false; }
  else setError('providerName');
  return ok;
}

// ================= 提交查询 =================
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!validate()) return;

  submitBtn.disabled = true;
  submitBtn.textContent = '查询中…';

  try {
    const resp = await fetch('/api/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceNo: deviceNoInput.value.trim(),
        providerName: providerInput.value.trim()
      })
    });
    const result = await resp.json();

    if (result.found) {
      renderResult(result);
      showOnly(resultSection);
    } else {
      renderNotFound(result);
      showOnly(notfoundSection);
    }
  } catch (err) {
    alert('网络异常，请稍后重试。');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = '查询授权信息';
    loadLogs(); // 每次查询后刷新追溯记录
  }
});

// ================= 渲染：查询成功 =================
const STATUS_MAP = {
  valid:    { text: '授权有效',   cls: 'valid' },
  expiring: { text: '即将到期',   cls: 'expiring' },
  expired:  { text: '已过期',     cls: 'expired' }
};

function renderResult(result) {
  const d = result.data;
  document.getElementById('r-deviceNo').textContent     = d.deviceNo;
  document.getElementById('r-deviceName').textContent   = d.deviceName;
  document.getElementById('r-providerName').textContent = d.providerName;
  document.getElementById('r-contractNo').textContent   = d.contractNo;

  // 有效期状态徽标
  const st = STATUS_MAP[d.validityStatus] || STATUS_MAP.valid;
  const badge = document.getElementById('validity-badge');
  badge.textContent = st.text;
  badge.className = 'badge ' + st.cls;

  // 维保范围
  document.getElementById('r-scope').innerHTML =
    d.scope.map(item => `<li>${escapeHtml(item)}</li>`).join('');

  // 授权工程师
  document.getElementById('r-engineers').innerHTML = d.engineers.map(e =>
    `<tr>
       <td>${escapeHtml(e.name)}</td>
       <td>${escapeHtml(e.certNo)}</td>
       <td>${escapeHtml(e.skill)}</td>
       <td>${escapeHtml(e.phone)}</td>
     </tr>`).join('');

  // 有效期
  let validityText = `${d.validFrom} 至 ${d.validTo}`;
  if (d.validityStatus === 'expired')      validityText += `（已过期 ${Math.abs(d.daysLeft)} 天）`;
  else if (d.validityStatus === 'expiring') validityText += `（剩余 ${d.daysLeft} 天，请及时续签）`;
  document.getElementById('r-validity').textContent = validityText;

  // 服务电话
  const phoneLink = document.getElementById('r-servicePhone');
  phoneLink.textContent = d.servicePhone;
  phoneLink.href = 'tel:' + d.servicePhone;

  document.getElementById('r-queryId').textContent = result.queryId;
}

// ================= 渲染：未查到 =================
function renderNotFound(result) {
  document.getElementById('nf-message').textContent =
    result.message || '未查询到匹配的维保授权记录。';
  document.getElementById('nf-queryId').textContent = result.queryId || '-';
}

// ================= 重新输入入口 =================
function backToForm() {
  // 保留已填内容便于修改，仅聚焦第一个输入框
  showOnly(querySection);
  deviceNoInput.focus();
}
document.getElementById('btn-back-1').addEventListener('click', backToForm);
document.getElementById('btn-back-2').addEventListener('click', backToForm);

// ================= 查询记录（追溯） =================
const RESULT_LABEL = {
  found:         { text: '查询成功', cls: 'log-result-found' },
  not_found:     { text: '未查到',   cls: 'log-result-not_found' },
  invalid_param: { text: '参数无效', cls: 'log-result-invalid' }
};

async function loadLogs() {
  try {
    const resp = await fetch('/api/logs?limit=20');
    const { logs } = await resp.json();
    const tbody = document.getElementById('log-body');

    if (!logs || logs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="empty">暂无查询记录</td></tr>';
      return;
    }

    tbody.innerHTML = logs.map(log => {
      const r = RESULT_LABEL[log.result] || { text: log.result, cls: '' };
      const time = new Date(log.timestamp).toLocaleString('zh-CN', { hour12: false });
      return `<tr>
        <td>${time}</td>
        <td>${escapeHtml(log.deviceNo)}</td>
        <td>${escapeHtml(log.providerName)}</td>
        <td class="${r.cls}">${r.text}</td>
      </tr>`;
    }).join('');
  } catch (err) {
    console.error('查询记录加载失败', err);
  }
}
document.getElementById('btn-refresh-logs').addEventListener('click', loadLogs);
loadLogs();
