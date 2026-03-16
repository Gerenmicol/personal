// ── State ──────────────────────────────────────────────
let allContainers = [];
let allBinTypes   = [];

// ── Load All Data ──────────────────────────────────────
async function loadAll() {
  await Promise.all([loadBinTypes(), loadContainers()]);
}

// ── Load Bin Types ─────────────────────────────────────
async function loadBinTypes() {
  const { data, error } = await db
    .from('storage_bin_types')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) { console.error('Error loading bin types:', error); return; }
  allBinTypes = data || [];
  populateBinTypeSelects();
  renderBinTypeList();
}

function populateBinTypeSelects() {
  // Container modal type select
  const typeSelect = document.getElementById('container-type');
  if (typeSelect) {
    const currentVal = typeSelect.value;
    typeSelect.innerHTML = `<option value="">Select type</option>` +
      allBinTypes.map(bt => `<option value="${bt.id}">${escapeHtml(bt.name)}</option>`).join('');
    if (currentVal) typeSelect.value = currentVal;
  }

  // Location filter (build from existing containers)
  const locs = [...new Set(allContainers.map(c => c.location).filter(Boolean))];
  const locSelect = document.getElementById('filter-location');
  if (locSelect) {
    locSelect.innerHTML = `<option value="">All Locations</option>` +
      locs.map(l => `<option value="${l}">${escapeHtml(l)}</option>`).join('');
  }

  // Type filter
  const typeFilter = document.getElementById('filter-type');
  if (typeFilter) {
    typeFilter.innerHTML = `<option value="">All Types</option>` +
      allBinTypes.map(bt => `<option value="${bt.id}">${escapeHtml(bt.name)}</option>`).join('');
  }
}

function renderBinTypeList() {
  const list  = document.getElementById('bin-type-list');
  const count = document.getElementById('bin-type-count');
  if (!list) return;

  if (count) count.textContent = `(${allBinTypes.length})`;

  if (allBinTypes.length === 0) {
    list.innerHTML = `<div class="empty-state" style="padding:24px;"><p>No bin types yet. Add one above.</p></div>`;
    return;
  }

  list.innerHTML = allBinTypes.map(bt => `
    <div class="bin-type-item">
      <div class="bin-type-photo">
        ${bt.photo_url
          ? `<img src="${bt.photo_url}" alt="${escapeHtml(bt.name)}">`
          : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="20" height="20"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`
        }
      </div>
      <span class="bin-type-name">${escapeHtml(bt.name)}</span>
      <button class="bin-type-delete" onclick="deleteBinType('${bt.id}')" title="Delete">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="16" height="16"><polyline points="3 6 5 6 21 6"/><path stroke-linecap="round" stroke-linejoin="round" d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6m5 0V4h4v2"/></svg>
      </button>
    </div>
  `).join('');
}

// ── Load Containers ────────────────────────────────────
async function loadContainers() {
  const { data, error } = await db
    .from('storage_containers')
    .select('*, storage_bin_types(name)')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error loading containers:', error);
    document.getElementById('container-list').innerHTML =
      `<div class="empty-state"><p>Error loading inventory.</p></div>`;
    return;
  }

  allContainers = data || [];
  updateTotalValue();
  populateBinTypeSelects();
  renderContainers();
}

// ── Total Value ────────────────────────────────────────
function updateTotalValue() {
  const total = allContainers.reduce((sum, c) => sum + (parseFloat(c.estimated_value) || 0), 0);
  document.getElementById('total-value').textContent = formatCurrency(total);
}

// ── Filter & Sort ──────────────────────────────────────
function getFilteredContainers() {
  const search   = document.getElementById('search-input')?.value.toLowerCase().trim() || '';
  const typeId   = document.getElementById('filter-type')?.value || '';
  const location = document.getElementById('filter-location')?.value || '';
  const sort     = document.getElementById('sort-select')?.value || 'created';

  let containers = [...allContainers];

  if (search)   containers = containers.filter(c =>
    c.code?.toLowerCase().includes(search) ||
    c.description?.toLowerCase().includes(search) ||
    c.storage_bin_types?.name?.toLowerCase().includes(search)
  );
  if (typeId)   containers = containers.filter(c => c.type_id === typeId);
  if (location) containers = containers.filter(c => c.location === location);

  containers.sort((a, b) => {
    if (sort === 'code')       return (a.code || '').localeCompare(b.code || '');
    if (sort === 'value_desc') return (b.estimated_value || 0) - (a.estimated_value || 0);
    if (sort === 'value_asc')  return (a.estimated_value || 0) - (b.estimated_value || 0);
    return new Date(b.created_at) - new Date(a.created_at);
  });

  return containers;
}

// ── Render Containers ──────────────────────────────────
function renderContainers() {
  const containers = getFilteredContainers();
  const list       = document.getElementById('container-list');
  const countEl    = document.getElementById('container-count');

  if (countEl) countEl.textContent = `${containers.length} container${containers.length !== 1 ? 's' : ''}`;

  if (containers.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path stroke-linecap="round" stroke-linejoin="round" d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
        <h3>No containers yet</h3>
        <p>Add your first container above.</p>
      </div>`;
    return;
  }

  list.innerHTML = containers.map(c => `
    <div class="container-card">
      <div class="container-photo">
        ${c.photo_url
          ? `<img src="${c.photo_url}" alt="${escapeHtml(c.code || '')}">`
          : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="22" height="22"><path stroke-linecap="round" stroke-linejoin="round" d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>`
        }
      </div>
      <div class="container-body">
        <div class="container-code">${escapeHtml(c.code || '')}</div>
        <div class="container-title">${escapeHtml(c.storage_bin_types?.name || 'Unknown Type')}</div>
        ${c.description ? `<p style="font-size:0.8rem;color:var(--text-secondary);margin:2px 0 6px;">${escapeHtml(c.description)}</p>` : ''}
        <div class="container-meta">
          ${c.size ? `<span>${capitalize(c.size)}</span>` : ''}
          ${c.location ? `<span>📍 ${escapeHtml(c.location)}</span>` : ''}
          ${c.website_link ? `<a href="${c.website_link}" target="_blank" style="color:var(--steel);">Link ↗</a>` : ''}
        </div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px;flex-shrink:0;">
        <div class="container-value">${formatCurrency(c.estimated_value)}</div>
        <div style="display:flex;gap:2px;">
          <button class="btn btn-ghost" onclick="editContainer('${c.id}')" title="Edit">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="14" height="14"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
          </button>
          <button class="btn btn-danger" onclick="deleteContainer('${c.id}')" title="Delete">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path stroke-linecap="round" stroke-linejoin="round" d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

// ── Open Add Container ─────────────────────────────────
function openAddContainer() {
  document.getElementById('container-modal-title').textContent  = 'Add New Container';
  document.getElementById('save-container-btn').textContent     = 'Add Container';
  document.getElementById('edit-container-id').value           = '';
  document.getElementById('container-code').value              = '';
  document.getElementById('container-description').value       = '';
  document.getElementById('container-type').value              = '';
  document.getElementById('container-size').value              = '';
  document.getElementById('container-location').value          = '';
  document.getElementById('container-value').value             = '';
  document.getElementById('container-link').value              = '';
  openModal('container-modal');
}

// ── Edit Container ─────────────────────────────────────
function editContainer(id) {
  const c = allContainers.find(c => c.id === id);
  if (!c) return;

  document.getElementById('container-modal-title').textContent  = 'Edit Container';
  document.getElementById('save-container-btn').textContent     = 'Save Changes';
  document.getElementById('edit-container-id').value           = c.id;
  document.getElementById('container-code').value              = c.code || '';
  document.getElementById('container-description').value       = c.description || '';
  document.getElementById('container-type').value              = c.type_id || '';
  document.getElementById('container-size').value              = c.size || '';
  document.getElementById('container-location').value          = c.location || '';
  document.getElementById('container-value').value             = c.estimated_value || '';
  document.getElementById('container-link').value              = c.website_link || '';
  openModal('container-modal');
}

// ── Save Container ─────────────────────────────────────
async function saveContainer() {
  const id          = document.getElementById('edit-container-id').value;
  const code        = document.getElementById('container-code').value.trim();
  const description = document.getElementById('container-description').value.trim();
  const type_id     = document.getElementById('container-type').value || null;
  const size        = document.getElementById('container-size').value || null;
  const location    = document.getElementById('container-location').value.trim() || null;
  const value       = parseFloat(document.getElementById('container-value').value) || 0;
  const link        = document.getElementById('container-link').value.trim() || null;

  if (!code) { showToast('Code / ID is required'); return; }

  const btn = document.getElementById('save-container-btn');
  btn.disabled = true;
  btn.textContent = 'Saving…';

  const payload = {
    code, description: description || null, type_id, size,
    location, estimated_value: value, website_link: link
  };

  let error;
  if (id) {
    ({ error } = await db.from('storage_containers').update(payload).eq('id', id));
  } else {
    ({ error } = await db.from('storage_containers').insert(payload));
  }

  btn.disabled = false;
  btn.textContent = id ? 'Save Changes' : 'Add Container';

  if (error) { showToast('Error saving container'); console.error(error); return; }

  closeModal('container-modal');
  showToast(id ? 'Container updated ✓' : 'Container added ✓');
  await loadContainers();
}

// ── Delete Container ───────────────────────────────────
async function deleteContainer(id) {
  if (!confirm('Delete this container? This cannot be undone.')) return;
  const { error } = await db.from('storage_containers').delete().eq('id', id);
  if (error) { showToast('Error deleting container'); return; }
  showToast('Container deleted');
  await loadContainers();
}

// ── Add Bin Type ───────────────────────────────────────
async function addBinType() {
  const name = document.getElementById('new-bin-type-name').value.trim();
  if (!name) { showToast('Bin type name is required'); return; }

  const { error } = await db.from('storage_bin_types').insert({ name });
  if (error) { showToast('Error adding bin type'); console.error(error); return; }

  document.getElementById('new-bin-type-name').value = '';
  showToast('Bin type added ✓');
  await loadBinTypes();
}

// ── Delete Bin Type ────────────────────────────────────
async function deleteBinType(id) {
  if (!confirm('Delete this bin type? Containers using it will lose their type.')) return;
  const { error } = await db.from('storage_bin_types').delete().eq('id', id);
  if (error) { showToast('Error deleting bin type'); return; }
  showToast('Bin type deleted');
  await loadBinTypes();
}

// ── Insurance Report ───────────────────────────────────
function openInsuranceReport() {
  const total = allContainers.reduce((sum, c) => sum + (parseFloat(c.estimated_value) || 0), 0);
  document.getElementById('report-total').textContent = formatCurrency(total);
  document.getElementById('report-date').textContent  =
    'As of ' + new Date().toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });

  const list = document.getElementById('insurance-list');
  if (allContainers.length === 0) {
    list.innerHTML = `<p style="color:var(--text-muted);font-size:0.85rem;text-align:center;padding:16px;">No containers in inventory yet.</p>`;
  } else {
    list.innerHTML = allContainers
      .filter(c => c.estimated_value > 0)
      .sort((a, b) => b.estimated_value - a.estimated_value)
      .map(c => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border);">
          <div>
            <div style="font-weight:500;font-size:0.9rem;">${escapeHtml(c.code || '')}</div>
            <div style="font-size:0.78rem;color:var(--text-secondary);">
              ${escapeHtml(c.storage_bin_types?.name || '')}
              ${c.description ? ' — ' + escapeHtml(c.description.substring(0, 50)) : ''}
            </div>
          </div>
          <div style="font-family:'Cormorant Garamond',serif;font-size:1.1rem;color:var(--navy);flex-shrink:0;margin-left:16px;">
            ${formatCurrency(c.estimated_value)}
          </div>
        </div>
      `).join('');
  }

  openModal('insurance-modal');
}

// ── Helpers ────────────────────────────────────────────
function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
                    .replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}

// ── Init ───────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', loadAll);
