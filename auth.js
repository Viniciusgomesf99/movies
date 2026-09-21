(function () {
  const users = {
    nefasto: { username: 'nefasto', password: 'nefasto@2026', displayName: 'Nefasto', initial: 'N', avatarClass: 'avatar-nefasto' },
    shaco: { username: 'shaco', password: 'shaco@2026', displayName: 'Shaco', initial: 'S', avatarClass: 'avatar-shaco' },
    pachenko: { username: 'pachenko', password: 'pachenko@2026', displayName: 'Pachenko', initial: 'P', avatarClass: 'user-avatar' }
  };
  const STORAGE_KEY = 'domingoAuthSession';
  const config = window.SUPABASE_CONFIG || {};
  const remote = window.supabase && config.url && config.anonKey && !config.url.includes('SEU-PROJETO') && !config.anonKey.includes('SUA_ANON');
  const supabaseAuth = remote ? window.supabase.createClient(config.url, config.anonKey) : null;
  const encode = value => btoa(unescape(encodeURIComponent(JSON.stringify(value)))).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const fakeToken = (user, expiresAt, kind) => `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: user.username, role: 'member', kind, exp: Math.floor(expiresAt / 1000) })}.demo`; 
  const now = () => Date.now();
  const getStored = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch { return null; } };
  const setSession = session => localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  const showApp = user => { window.currentUser = user; document.querySelector('#authScreen').hidden = true; document.querySelector('#appShell').hidden = false; window.dispatchEvent(new CustomEvent('auth:ready')); };
  const showLogin = message => { document.querySelector('#authScreen').hidden = false; document.querySelector('#appShell').hidden = true; if (message) document.querySelector('#authError').textContent = message; };
  async function refresh(session) {
    if (!session || session.refreshExpiresAt <= now()) return null;
    if (supabaseAuth && session.supabase) {
      const { data, error } = await supabaseAuth.auth.refreshSession({ refresh_token: session.supabase.refresh_token });
      if (error || !data.session) return null;
      const user = users[session.username];
      const updated = { ...session, accessToken: data.session.access_token, accessExpiresAt: Math.min(data.session.expires_at * 1000, now() + 3600000), supabase: data.session };
      setSession(updated); showApp(user); return updated;
    }
    const user = users[session.username];
    const updated = { ...session, accessToken: fakeToken(user, now() + 3600000, 'access'), accessExpiresAt: now() + 3600000 };
    setSession(updated); showApp(user); return updated;
  }
  async function login(username, password) {
    const user = users[username.toLowerCase().trim()];
    if (!user || user.password !== password) throw new Error('Usuário ou senha inválidos.');
    const accessExpiresAt = now() + 3600000;
    const refreshExpiresAt = now() + 3 * 86400000;
    if (supabaseAuth) {
      const { data, error } = await supabaseAuth.auth.signInWithPassword({ email: `${user.username}@planodedomingo.local`, password });
      if (error || !data.session) throw new Error('Não foi possível autenticar no Supabase. Confira se este usuário foi criado.');
      user.id = data.user.id; setSession({ username: user.username, userId: data.user.id, accessToken: data.session.access_token, accessExpiresAt: Math.min(data.session.expires_at * 1000, accessExpiresAt), refreshExpiresAt, supabase: data.session });
    } else {
      user.id = user.username; setSession({ username: user.username, userId: user.username, accessToken: fakeToken(user, accessExpiresAt, 'access'), refreshToken: fakeToken(user, refreshExpiresAt, 'refresh'), accessExpiresAt, refreshExpiresAt });
    }
    showApp(user);
  }
  async function logout() { if (supabaseAuth) await supabaseAuth.auth.signOut(); localStorage.removeItem(STORAGE_KEY); window.currentUser = null; showLogin(); }
  window.clubAuth = { login, logout, refresh, users };
  window.addEventListener('DOMContentLoaded', async () => {
    document.querySelector('#loginForm').addEventListener('submit', async event => { event.preventDefault(); const error = document.querySelector('#authError'); error.textContent = ''; try { await login(document.querySelector('#loginUsername').value, document.querySelector('#loginPassword').value); } catch (e) { error.textContent = e.message; } });
    const session = getStored();
    if (!session) return showLogin();
    if (!users[session.username]) return logout();
    if (session.accessExpiresAt > now()) { users[session.username].id = session.userId || session.username; return showApp(users[session.username]); }
    const refreshed = await refresh(session);
    if (!refreshed) await logout();
  });
  setInterval(async () => { const session = getStored(); if (!session) return; if (session.refreshExpiresAt <= now()) return logout(); if (session.accessExpiresAt <= now()) await refresh(session); }, 30000);
})();
