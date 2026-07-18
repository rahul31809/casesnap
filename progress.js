/* CaseSnap — client-side progress tracker (localStorage) */
const CS = {
  _get: k => JSON.parse(localStorage.getItem(k) || '[]'),
  _set: (k, v) => localStorage.setItem(k, JSON.stringify(v)),

  getSolved:   () => CS._get('cs_solved'),
  getMastered: () => CS._get('cs_mastered'),
  getStreak:   () => parseInt(localStorage.getItem('cs_streak') || '0'),

  isSolved:   id => CS.getSolved().includes(id),
  isMastered: id => CS.getMastered().includes(id),

  markSolved(id) {
    const s = CS.getSolved();
    if (!s.includes(id)) { s.push(id); CS._set('cs_solved', s); }
    CS._tick();
  },

  toggleMastered(id) {
    const m = CS.getMastered();
    const i = m.indexOf(id);
    if (i >= 0) m.splice(i, 1); else m.push(id);
    CS._set('cs_mastered', m);
    return m.includes(id);
  },

  _tick() {
    const today = new Date().toDateString();
    const yest  = new Date(Date.now() - 864e5).toDateString();
    const last  = localStorage.getItem('cs_last');
    let streak  = CS.getStreak();
    if      (last === today) { /* already counted */ }
    else if (last === yest)  { streak++; }
    else                     { streak = 1; }
    localStorage.setItem('cs_streak', streak);
    localStorage.setItem('cs_last',   today);
  }
};

// ── Auth helpers ──────────────────────────────────────────────────────────
CS.getUser  = () => JSON.parse(localStorage.getItem('cs_session') || 'null');
CS.logout   = function() { localStorage.removeItem('cs_session'); location.replace('index.html'); };
CS.resetAll = function() {
  ['cs_solved','cs_mastered','cs_streak','cs_last','gs_practised','mr_done'].forEach(k => localStorage.removeItem(k));
};
CS.syncUser = function() {
  const u = CS.getUser();
  if (!u) return;
  const parts = u.name.trim().split(/\s+/);
  const ini = (parts[0][0] + (parts[1] ? parts[1][0] : '')).toUpperCase();
  document.querySelectorAll('.sb-user-name, .un').forEach(el => el.textContent = u.name);
  document.querySelectorAll('.sb-avatar, .av').forEach(el => el.textContent = ini);
};

// Auth guard: redirect to login if session missing on app pages
(function() {
  const p = location.pathname;
  if (!p.endsWith('index.html') && p !== '/' && !localStorage.getItem('cs_session')) {
    location.replace('index.html');
  }
}());
