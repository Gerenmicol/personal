// ── State ────────────────────────────────────────────────────────────
let allContainers = [];
let allBinTypes   = [];
const PHOTO_BUCKET = 'container-photos';

// ── Load All ─────────────────────────────────────────────────────────
async function loadAll() {
  await Promise.all([loadBinTypes(), loadContainers()]);
}

// ── Bin Types ─────────────────────────────────────────────────────────
async function loadBinTypes() {
  const { data, error } = await db
    .from('storage_bin_types')
    .select('*')
    .order('name', { ascending: true });
  if (error) { console.error(error); return; }
  allBinTypes = data || [];
  populateBinTypeSelects();
  renderBinTypeList();
}

function populateBinTypeSelects() {
  // Container modal type select
  const typeSelect = document.getElementById('container-type');
  if (typeSelect) {
    const v = typeSelect.value;
    typeSelect.innerHTML = `<option value="">Select type</option>` +
      allBinTypes.map(bt => `<option value="${bt.id}">${escapeHtml(bt.name)}</option>`).join('');
    if (v) typeSelect.value = v;
  }

  // Location filter (built from existing containers)
  const locs = [...new Set(allContainers.map(c => c.location).filter(Boolean))];
  const locSel = document.getElementById('filter-location');
  if (locSel) locSel.innerHTML = `<option value="">All Locations</option>` +
    locs.map(l => `<option value="${l}">${escapeHtml(l)}</option>`).join('');

  // Type filter
  const typFil = document.getElementById('filter-type');
  if (typFil) typFil.innerHTML = `<option value="">All Types</option>` +
    allBinTypes.map(bt => `<option value="${bt.id}">${escapeHtml(bt.name)}</option>`).join('');
}

function renderBinTypeList() {
  const list  = document.getElementById('bin-type-list');
  const count = document.getElementById('bin-type-count');
  if (!list) return;
  if (count) count.textContent = `(${allBinTypes.length})`;
  if (allBinTypes.length === 0) {
    list.innerHTML = `<div class="empty-state" style="padding:24px;"><p>No bin types yet.</p></div>`;
    return;
  }
  list.innerHTML = allBinTypes.map(bt => `
    <div class="bin-type-item">
      <div class="bin-type-photo">
        ${bt.photo_url
          ? `<img src="${bt.photo_url}" alt="">`
          : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="20" height="20"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`}
      </div>
      <span class="bin-type-name">${escapeHtml(bt.name)}</span>
      <button class="bin-type-delete" onclick="deleteBinType('${bt.id}')" title="Delete">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="16" height="16"><polyline points="3 6 5 6 21 6"/><path stroke-linecap="round" stroke-linejoin="round" d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
      </button>
    </div>`).join('');
}

// ── Load Containers ───────────────────────────────────────────────────
async function loadContainers() {
  const { data, error } = await db
    .from('storage_containers')
    .select('*, storage_bin_types(name)')
    .order('code', { ascending: true });

  if (error) {
    console.error(error);
    document.getElementById('container-list').innerHTML =
      `<div class="empty-state"><p>Error loading inventory.</p></div>`;
    return;
  }

  allContainers = data || [];

  // Fetch photos for all containers
  const ids = allContainers.map(c => c.id);
  if (ids.length > 0) {
    const { data: photos } = await db
      .from('container_photos')
      .select('*')
      .in('container_id', ids)
      .order('sort_order', { ascending: true });
    const photoMap = {};
    (photos || []).forEach(p => {
      if (!photoMap[p.container_id]) photoMap[p.container_id] = [];
      photoMap[p.container_id].push(p);
    });
    allContainers = allContainers.map(c => ({ ...c, photos: photoMap[c.id] || [] }));
  }

  updateTotalValue();
  populateBinTypeSelects();
  renderContainers();
}

// ── Total Value ───────────────────────────────────────────────────────
function updateTotalValue() {
  const total = allContainers.reduce((s, c) => s + (parseFloat(c.estimated_value) || 0), 0);
  document.getElementById('total-value').textContent = formatCurrency(total);
}

// ── Filter & Sort ─────────────────────────────────────────────────────
function getFilteredContainers() {
  const search   = document.getElementById('search-input')?.value.toLowerCase().trim() || '';
  const typeId   = document.getElementById('filter-type')?.value || '';
  const location = document.getElementById('filter-location')?.value || '';
  const sort     = document.getElementById('sort-select')?.value || 'code';

  let c = [...allContainers];
  if (search)   c = c.filter(x =>
    x.code?.toLowerCase().includes(search) ||
    x.description?.toLowerCase().includes(search) ||
    x.storage_bin_types?.name?.toLowerCase().includes(search) ||
    x.location?.toLowerCase().includes(search));
  if (typeId)   c = c.filter(x => x.type_id === typeId);
  if (location) c = c.filter(x => x.location === location);

  c.sort((a, b) => {
    if (sort === 'value_desc') return (b.estimated_value || 0) - (a.estimated_value || 0);
    if (sort === 'value_asc')  return (a.estimated_value || 0) - (b.estimated_value || 0);
    if (sort === 'created')    return new Date(b.created_at) - new Date(a.created_at);
    return (a.code || '').localeCompare(b.code || '');
  });
  return c;
}

// ── Render Container Cards ────────────────────────────────────────────
function renderContainers() {
  const containers = getFilteredContainers();
  const list    = document.getElementById('container-list');
  const countEl = document.getElementById('container-count');

  if (countEl) countEl.textContent = `${containers.length} container${containers.length !== 1 ? 's' : ''}`;

  if (containers.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" style="width:48px;height:48px;margin:0 auto 16px;opacity:.3;display:block">
          <path stroke-linecap="round" stroke-linejoin="round" d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
        </svg>
        <h3>No containers yet</h3>
        <p>Add your first container above.</p>
      </div>`;
    return;
  }

  list.innerHTML = containers.map(c => {
    const photos   = c.photos || [];
    const extPhoto = photos.find(p => p.label === 'exterior') || photos[0];
    const typeName = c.storage_bin_types?.name || '';

    return `
      <div class="container-card" onclick="openContainerDetail('${c.id}')">
        <div class="container-photo-thumb">
          ${extPhoto
            ? `<img src="${extPhoto.url}" alt="">`
            : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="22" height="22"><path stroke-linecap="round" stroke-linejoin="round" d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>`}
          ${photos.length > 1 ? `<span class="photo-count">${photos.length}</span>` : ''}
        </div>
        <div class="container-body">
          <div class="container-code">${escapeHtml(c.code || '')}</div>
          ${c.description ? `<div class="container-desc">${escapeHtml(c.description)}</div>` : ''}
          ${typeName ? `<div class="container-type-label">${escapeHtml(typeName)}</div>` : ''}
          <div class="container-meta-row">
            ${c.location ? `<span class="container-loc">📍 ${escapeHtml(c.location)}</span>` : ''}
            ${c.product_link ? `<a href="${c.product_link}" target="_blank" onclick="event.stopPropagation()" class="container-link">Product ↗</a>` : ''}
          </div>
        </div>
        <div class="container-right">
          <div class="container-value">${formatCurrency(c.estimated_value)}</div>
          <div class="container-actions">
            <button class="btn btn-ghost" onclick="event.stopPropagation();editContainer('${c.id}')" title="Edit">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="14" height="14"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
            </button>
            <button class="btn btn-danger" onclick="event.stopPropagation();deleteContainer('${c.id}')" title="Delete">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path stroke-linecap="round" stroke-linejoin="round" d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
            </button>
          </div>
        </div>
      </div>`;
  }).join('');
}

// ── Container Detail Modal ────────────────────────────────────────────
function openContainerDetail(id) {
  const c = allContainers.find(x => x.id === id);
  if (!c) return;
  const photos = c.photos || [];

  document.getElementById('detail-code').textContent     = c.code || '';
  document.getElementById('detail-type').textContent     = c.storage_bin_types?.name || '—';
  document.getElementById('detail-desc').textContent     = c.description || '—';
  document.getElementById('detail-location').textContent = c.location || '—';
  document.getElementById('detail-value').textContent    = formatCurrency(c.estimated_value);
  document.getElementById('detail-link').innerHTML = c.product_link
    ? `<a href="${c.product_link}" target="_blank">${escapeHtml(c.product_link)}</a>` : '—';

  const gallery = document.getElementById('detail-photos');
  gallery.innerHTML = photos.length === 0
    ? `<p style="color:var(--text-muted);font-size:0.85rem;">No photos yet</p>`
    : photos.map(p => `
        <div class="detail-photo-item">
          <img src="${p.url}" alt="${p.label}" onclick="window.open('${p.url}','_blank')">
          <span class="photo-label-badge">${p.label}</span>
        </div>`).join('');

  document.getElementById('detail-edit-btn').onclick = () => {
    closeModal('container-detail-modal');
    editContainer(id);
  };
  openModal('container-detail-modal');
}

// ── Add / Edit Container ──────────────────────────────────────────────
function openAddContainer() {
  document.getElementById('container-modal-title').textContent  = 'Add New Container';
  document.getElementById('save-container-btn').textContent     = 'Add Container';
  document.getElementById('edit-container-id').value           = '';
  document.getElementById('container-code').value              = '';
  document.getElementById('container-description').value       = '';
  document.getElementById('container-type').value              = '';
  document.getElementById('container-location').value          = '';
  document.getElementById('container-value').value             = '';
  document.getElementById('container-product-link').value      = '';
  document.getElementById('photo-upload-list').innerHTML       = '';
  window._pendingPhotos = [];
  openModal('container-modal');
}

function editContainer(id) {
  const c = allContainers.find(x => x.id === id);
  if (!c) return;

  document.getElementById('container-modal-title').textContent  = 'Edit Container';
  document.getElementById('save-container-btn').textContent     = 'Save Changes';
  document.getElementById('edit-container-id').value           = c.id;
  document.getElementById('container-code').value              = c.code || '';
  document.getElementById('container-description').value       = c.description || '';
  document.getElementById('container-type').value              = c.type_id || '';
  document.getElementById('container-location').value          = c.location || '';
  document.getElementById('container-value').value             = c.estimated_value || '';
  document.getElementById('container-product-link').value      = c.product_link || '';

  window._pendingPhotos = [];
  const photos     = c.photos || [];
  const uploadList = document.getElementById('photo-upload-list');
  uploadList.innerHTML = photos.map(p => `
    <div class="existing-photo-item" id="epho-${p.id}">
      <img src="${p.url}" alt="${p.label}">
      <select class="photo-label-select" onchange="updatePhotoLabel('${p.id}',this.value)">
        <option value="exterior" ${p.label === 'exterior' ? 'selected' : ''}>Exterior</option>
        <option value="interior" ${p.label === 'interior' ? 'selected' : ''}>Interior</option>
        <option value="detail"   ${p.label === 'detail'   ? 'selected' : ''}>Detail</option>
      </select>
      <button class="photo-delete-btn" onclick="removeExistingPhoto('${p.id}')">✕</button>
    </div>`).join('');

  openModal('container-modal');
}

// ── Photo Management ──────────────────────────────────────────────────
async function updatePhotoLabel(photoId, label) {
  await db.from('container_photos').update({ label }).eq('id', photoId);
}

async function removeExistingPhoto(photoId) {
  await db.from('container_photos').delete().eq('id', photoId);
  document.getElementById(`epho-${photoId}`)?.remove();
  await loadContainers();
}

window._pendingPhotos = [];

function handlePhotoSelect(input) {
  Array.from(input.files).forEach(file => {
    const id     = Math.random().toString(36).slice(2);
    const reader = new FileReader();
    reader.onload = e => {
      window._pendingPhotos.push({ id, file, label: 'exterior', dataUrl: e.target.result });
      const item = document.createElement('div');
      item.className = 'pending-photo-item';
      item.id = `ppho-${id}`;
      item.innerHTML = `
        <img src="${e.target.result}" alt="preview">
        <select class="photo-label-select" onchange="updatePendingLabel('${id}',this.value)">
          <option value="exterior">Exterior</option>
          <option value="interior">Interior</option>
          <option value="detail">Detail</option>
        </select>
        <button class="photo-delete-btn" onclick="removePendingPhoto('${id}')">✕</button>`;
      document.getElementById('photo-upload-list').appendChild(item);
    };
    reader.readAsDataURL(file);
  });
  input.value = '';
}

function updatePendingLabel(id, label) {
  const p = window._pendingPhotos.find(x => x.id === id);
  if (p) p.label = label;
}

function removePendingPhoto(id) {
  window._pendingPhotos = window._pendingPhotos.filter(x => x.id !== id);
  document.getElementById(`ppho-${id}`)?.remove();
}

async function uploadPendingPhotos(containerId) {
  for (let i = 0; i < window._pendingPhotos.length; i++) {
    const pending = window._pendingPhotos[i];
    const ext  = pending.file.name.split('.').pop() || 'jpg';
    const path = `${containerId}/${Date.now()}-${i}-${pending.label}.${ext}`;
    const { error } = await db.storage.from(PHOTO_BUCKET).upload(path, pending.file, { upsert: true });
    if (error) { console.error('Photo upload error:', error); continue; }
    const { data: urlData } = db.storage.from(PHOTO_BUCKET).getPublicUrl(path);
    await db.from('container_photos').insert({
      container_id: containerId,
      url: urlData.publicUrl,
      label: pending.label,
      sort_order: i
    });
  }
}

// ── Save Container ────────────────────────────────────────────────────
async function saveContainer() {
  const id           = document.getElementById('edit-container-id').value;
  const code         = document.getElementById('container-code').value.trim();
  const description  = document.getElementById('container-description').value.trim();
  const type_id      = document.getElementById('container-type').value || null;
  const location     = document.getElementById('container-location').value.trim() || null;
  const value        = parseFloat(document.getElementById('container-value').value) || 0;
  const product_link = document.getElementById('container-product-link').value.trim() || null;

  if (!code) { showToast('Code / ID is required'); return; }

  const btn = document.getElementById('save-container-btn');
  btn.disabled    = true;
  btn.textContent = 'Saving…';

  const payload = { code, description: description || null, type_id, location, estimated_value: value, product_link };

  let error, savedId;
  if (id) {
    ({ error } = await db.from('storage_containers').update(payload).eq('id', id));
    savedId = id;
  } else {
    const { data, error: e } = await db.from('storage_containers').insert(payload).select().single();
    error   = e;
    savedId = data?.id;
  }

  btn.disabled    = false;
  btn.textContent = id ? 'Save Changes' : 'Add Container';

  if (error) { showToast('Error saving container'); console.error(error); return; }
  if (savedId && window._pendingPhotos.length > 0) await uploadPendingPhotos(savedId);

  closeModal('container-modal');
  showToast(id ? 'Container updated ✓' : 'Container added ✓');
  window._pendingPhotos = [];
  await loadContainers();
}

// ── Delete Container ──────────────────────────────────────────────────
async function deleteContainer(id) {
  if (!confirm('Delete this container? This cannot be undone.')) return;
  const { error } = await db.from('storage_containers').delete().eq('id', id);
  if (error) { showToast('Error deleting container'); return; }
  showToast('Container deleted');
  await loadContainers();
}

// ── Bin Type CRUD ─────────────────────────────────────────────────────
async function addBinType() {
  const name = document.getElementById('new-bin-type-name').value.trim();
  if (!name) { showToast('Name is required'); return; }
  const { error } = await db.from('storage_bin_types').insert({ name });
  if (error) { showToast('Error adding bin type'); return; }
  document.getElementById('new-bin-type-name').value = '';
  showToast('Bin type added ✓');
  await loadBinTypes();
}

async function deleteBinType(id) {
  if (!confirm('Delete this bin type?')) return;
  const { error } = await db.from('storage_bin_types').delete().eq('id', id);
  if (error) { showToast('Error deleting bin type'); return; }
  showToast('Bin type deleted');
  await loadBinTypes();
}

// ── Insurance Report ──────────────────────────────────────────────────
function openInsuranceReport() {
  const total = allContainers.reduce((s, c) => s + (parseFloat(c.estimated_value) || 0), 0);
  document.getElementById('report-total').textContent = formatCurrency(total);
  document.getElementById('report-date').textContent  =
    'As of ' + new Date().toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });

  const valued = allContainers
    .filter(c => c.estimated_value > 0)
    .sort((a, b) => b.estimated_value - a.estimated_value);

  document.getElementById('insurance-list').innerHTML = valued.length === 0
    ? `<p style="color:var(--text-muted);font-size:0.85rem;text-align:center;padding:16px;">No containers with values yet.</p>`
    : valued.map(c => `
        <div class="insurance-row">
          <div>
            <div class="insurance-code">${escapeHtml(c.code || '')}</div>
            <div class="insurance-detail">${escapeHtml(c.storage_bin_types?.name || '')}${c.location ? ' · ' + escapeHtml(c.location) : ''}</div>
            ${c.description ? `<div class="insurance-desc">${escapeHtml(c.description.substring(0, 60))}${c.description.length > 60 ? '…' : ''}</div>` : ''}
          </div>
          <div class="insurance-value">${formatCurrency(c.estimated_value)}</div>
        </div>`).join('');

  openModal('insurance-modal');
}

// ── Location Hint Helper ──────────────────────────────────────────────
function insertLocationHint(hint) {
  const f = document.getElementById('container-location');
  f.value = hint;
  f.focus();
}

// ── Helpers ───────────────────────────────────────────────────────────
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

document.addEventListener('DOMContentLoaded', loadAll);
