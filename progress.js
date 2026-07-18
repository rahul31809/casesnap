/* CaseSnap — client-side progress tracker (localStorage, per-user scoped) */
const CS = {
  // ── User-scoped key helpers ───────────────────────────────────────────
  _uid() {
    const s = JSON.parse(localStorage.getItem('cs_session') || 'null');
    return s ? s.userId : 'anon';
  },
  _k:   k => k + '_' + CS._uid(),
  _get: k => JSON.parse(localStorage.getItem(CS._k(k)) || '[]'),
  _set: (k, v) => localStorage.setItem(CS._k(k), JSON.stringify(v)),

  // ── Progress ──────────────────────────────────────────────────────────
  getSolved:   () => CS._get('cs_solved'),
  getMastered: () => CS._get('cs_mastered'),
  getStreak:   () => parseInt(localStorage.getItem(CS._k('cs_streak')) || '0'),

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
    const last  = localStorage.getItem(CS._k('cs_last'));
    let streak  = CS.getStreak();
    if      (last === today) { /* already counted */ }
    else if (last === yest)  { streak++; }
    else                     { streak = 1; }
    localStorage.setItem(CS._k('cs_streak'), streak);
    localStorage.setItem(CS._k('cs_last'),   today);
  },

  // ── Guesstimates & Rounds (user-scoped) ──────────────────────────────
  getPractised() {
    return new Set(JSON.parse(localStorage.getItem(CS._k('gs_practised')) || '[]'));
  },
  savePractised(set) {
    localStorage.setItem(CS._k('gs_practised'), JSON.stringify([...set]));
  },
  getRounds() {
    return parseInt(localStorage.getItem(CS._k('mr_done')) || '0');
  },
  addRound() {
    const n = CS.getRounds() + 1;
    localStorage.setItem(CS._k('mr_done'), n);
    CS._tick();
    return n;
  },

  // ── Auth helpers ──────────────────────────────────────────────────────
  getUser:  () => JSON.parse(localStorage.getItem('cs_session') || 'null'),
  logout()  { localStorage.removeItem('cs_session'); location.replace('index.html'); },
  resetAll() {
    const uid = CS._uid();
    ['cs_solved','cs_mastered','cs_streak','cs_last','gs_practised','mr_done']
      .forEach(k => localStorage.removeItem(k + '_' + uid));
  },
  syncUser() {
    const u = CS.getUser();
    if (!u) return;
    const parts = u.name.trim().split(/\s+/);
    const ini = (parts[0][0] + (parts[1] ? parts[1][0] : '')).toUpperCase();
    document.querySelectorAll('.sb-user-name, .un').forEach(el => el.textContent = u.name);
    document.querySelectorAll('.sb-avatar, .av').forEach(el => el.textContent = ini);
  }
};

// Auth guard: redirect to login if session missing on app pages
(function() {
  const p = location.pathname;
  if (!p.endsWith('index.html') && p !== '/' && !localStorage.getItem('cs_session')) {
    location.replace('index.html');
  }
}());
