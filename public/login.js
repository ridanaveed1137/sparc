async function login() {
  const employeeId = document.getElementById('employeeId').value;
  const password = document.getElementById('password').value;
  const errorEl = document.getElementById('error');
  errorEl.textContent = '';

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employeeId, password }),
    });
    const data = await res.json();

    if (!res.ok) {
      errorEl.textContent = data.error || 'Login failed';
      return;
    }

    localStorage.setItem('token', data.token);
    localStorage.setItem('role', data.user.role);
    localStorage.setItem('fullName', data.user.fullName);

    if (data.user.role === 'admin' || data.user.role === 'manager') {
      window.location.href = '/dashboard.html';
    } else {
      window.location.href = '/employee.html';
    }
  } catch (err) {
    errorEl.textContent = 'Could not reach server';
  }
}

document.getElementById('loginBtn').addEventListener('click', login);
document.getElementById('password').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') login();
});
