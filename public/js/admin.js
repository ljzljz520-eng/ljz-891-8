/**
 * 查询记录追溯页 前端逻辑
 */
const recordsBody = document.getElementById('recordsBody');
const emptyState = document.getElementById('emptyState');
const pageInfo = document.getElementById('pageInfo');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const filterTabs = document.getElementById('filterTabs');

const RESULT_LABEL = {
  found: '查询成功',
  not_found: '未查询到',
  invalid: '无效输入'
};

let currentPage = 1;
let currentFilter = '';
let totalPages = 1;
const pageSize = 15;

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
}

async function loadStats() {
  try {
    const resp = await fetch('/api/stats');
    const json = await resp.json();
    if (!json.success) return;
    const s = json.data;
    document.getElementById('stat-total').textContent = s.total;
    document.getElementById('stat-found').textContent = s.found;
    document.getElementById('stat-notFound').textContent = s.notFound;
    document.getElementById('stat-invalid').textContent = s.invalid;
    document.getElementById('stat-hitRate').textContent = s.total ? s.hitRate + '%' : '—';
  } catch (e) {
    console.error('统计加载失败', e);
  }
}

async function loadRecords() {
  const params = new URLSearchParams({ page: currentPage, pageSize });
  if (currentFilter) params.set('result', currentFilter);

  try {
    const resp = await fetch('/api/records?' + params.toString());
    const json = await resp.json();
    if (!json.success) return;

    totalPages = json.totalPages;
    renderRecords(json.rows);
    updatePagination(json);
  } catch (e) {
    console.error('记录加载失败', e);
    recordsBody.innerHTML = '';
  }
}

function renderRecords(rows) {
  if (!rows.length) {
    recordsBody.innerHTML = '';
    emptyState.style.display = 'block';
    return;
  }
  emptyState.style.display = 'none';
  recordsBody.innerHTML = rows
    .map(
      (r) => `
      <tr>
        <td class="mono">${r.id}</td>
        <td class="mono" style="white-space:nowrap;">${escapeHtml(r.queriedAt)}</td>
        <td class="mono">${escapeHtml(r.equipmentCode || '—')}</td>
        <td>${escapeHtml(r.providerName || '—')}</td>
        <td><span class="result-tag ${r.result}">${RESULT_LABEL[r.result] || r.result}</span></td>
        <td class="mono">${escapeHtml(r.ip || '—')}</td>
      </tr>`
    )
    .join('');
}

function updatePagination(json) {
  pageInfo.textContent = `第 ${json.page} / ${json.totalPages} 页 · 共 ${json.total} 条记录`;
  prevBtn.disabled = json.page <= 1;
  nextBtn.disabled = json.page >= json.totalPages;
}

filterTabs.addEventListener('click', (e) => {
  const btn = e.target.closest('.filter-tab');
  if (!btn) return;
  document.querySelectorAll('.filter-tab').forEach((t) => t.classList.remove('active'));
  btn.classList.add('active');
  currentFilter = btn.dataset.filter;
  currentPage = 1;
  loadRecords();
});

prevBtn.addEventListener('click', () => {
  if (currentPage > 1) {
    currentPage--;
    loadRecords();
  }
});
nextBtn.addEventListener('click', () => {
  if (currentPage < totalPages) {
    currentPage++;
    loadRecords();
  }
});
document.getElementById('refreshBtn').addEventListener('click', () => {
  loadStats();
  loadRecords();
});

// 初始加载
loadStats();
loadRecords();
