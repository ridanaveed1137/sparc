const token = localStorage.getItem('token');
if (!token) window.location.href = '/index.html';

document.getElementById('whoami').textContent =
  `${localStorage.getItem('fullName')} (${localStorage.getItem('role')})`;

function authHeaders(extra = {}) {
  return { Authorization: `Bearer ${token}`, ...extra };
}

function logout() {
  localStorage.clear();
  window.location.href = '/index.html';
}

async function apiGet(url) {
  const res = await fetch(url, { headers: authHeaders() });
  if (res.status === 401) { logout(); return null; }
  return res.json();
}

function severityBadge(sev) {
  return `<span class="badge ${sev}">${sev}</span>`;
}

async function loadSummary() {
  const s = await apiGet('/api/dashboard/summary');
  if (!s) return;
  const grid = document.getElementById('statGrid');
  grid.innerHTML = `
    <div class="stat"><div class="num">${s.totalUsers}</div><div class="label">Total Users</div></div>
    <div class="stat warning"><div class="num">${s.lockedUsers}</div><div class="label">Locked Accounts</div></div>
    <div class="stat critical"><div class="num">${s.criticalAlerts}</div><div class="label">Critical Alerts</div></div>
    <div class="stat warning"><div class="num">${s.warningAlerts}</div><div class="label">Warnings</div></div>
  `;
}

async function loadAlerts() {
  const alerts = await apiGet('/api/dashboard/alerts');
  if (!alerts) return;
  const tbody = document.querySelector('#alertsTable tbody');
  tbody.innerHTML = alerts.slice(0, 20).map(a => `
    <tr>
      <td>${new Date(a.timestamp).toLocaleString()}</td>
      <td>${a.eventType}</td>
      <td>${a.actorId || '-'}</td>
      <td>${a.ipAddress || '-'}</td>
      <td>${severityBadge(a.severity)}</td>
    </tr>
  `).join('') || '<tr><td colspan="5">No alerts yet.</td></tr>';
}

async function loadPolicies() {
  const policies = await apiGet('/api/policies');
  if (!policies) return;
  const tbody = document.querySelector('#policiesTable tbody');
  tbody.innerHTML = policies.map(p => `
    <tr>
      <td>${p.key}</td>
      <td><input value="${p.value}" id="policy-${p.key}" style="width:100px;" /></td>
      <td>${p.description || ''}</td>
      <td><button class="small save-policy-btn" data-key="${p.key}">Save</button></td>
    </tr>
  `).join('');

  // Event delegation for the dynamically-created Save buttons
  tbody.querySelectorAll('.save-policy-btn').forEach((btn) => {
    btn.addEventListener('click', () => updatePolicy(btn.dataset.key));
  });
}

async function updatePolicy(key) {
  const value = document.getElementById(`policy-${key}`).value;
  const res = await fetch(`/api/policies/${key}`, {
    method: 'PUT',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ value }),
  });
  if (res.ok) {
    loadAlerts();
    loadSummary();
  }
}

async function createEmployee() {
  const employeeId = document.getElementById('newEmpId').value;
  const fullName = document.getElementById('newFullName').value;
  const email = document.getElementById('newEmail').value;
  const password = document.getElementById('newPassword').value;
  const role = document.getElementById('newRole').value;
  const msgEl = document.getElementById('createMsg');

  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ employeeId, fullName, email, password, role }),
  });
  const data = await res.json();

  if (res.ok) {
    msgEl.textContent = `✅ Created ${data.employeeId} (${data.role})`;
    msgEl.className = 'msg ok';
    document.getElementById('newEmpId').value = '';
    document.getElementById('newFullName').value = '';
    document.getElementById('newEmail').value = '';
    document.getElementById('newPassword').value = '';
    loadSummary();
  } else {
    msgEl.textContent = `❌ ${data.error || (data.errors && data.errors[0].msg) || 'Failed'}`;
    msgEl.className = 'msg err';
  }
}

async function checkIntegrity() {
  const result = await apiGet('/api/dashboard/integrity');
  const el = document.getElementById('integrityResult');
  if (!result) return;
  if (result.valid) {
    el.textContent = '✅ Chain is intact — no tampering detected';
    el.className = 'integrity-ok';
  } else {
    el.textContent = `❌ Tampering detected at entry #${result.brokenAtId} (${result.reason})`;
    el.className = 'integrity-bad';
  }
}

document.getElementById('logoutBtn').addEventListener('click', logout);
document.getElementById('addEmployeeBtn').addEventListener('click', createEmployee);
document.getElementById('verifyChainBtn').addEventListener('click', checkIntegrity);

loadSummary();
loadAlerts();
loadPolicies();

// Auto-refresh every 10s so alerts feel "live"
setInterval(() => { loadSummary(); loadAlerts(); }, 10000);
