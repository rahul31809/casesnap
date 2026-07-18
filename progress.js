/* CaseSnap — per-user progress tracker with Supabase cloud sync */
const SB_URL = 'https://pniqqakcyoncvmarkazy.supabase.co';
const SB_KEY = 'sb_publishable_ZEAmDgmC9GaQBQuC7wA8jw_GLrbxoSD';
const _SBH = () => ({
  'apikey': SB_KEY,
  'Authorization': 'Bearer ' + SB_KEY,
  'Content-Type': 'application/json'
});

const CS = {
  // ── User-scoped key helpers ───────────────────────────────────────────
  _uid() {
    const s = JSON.parse(localStorage.getItem('cs_session') || 'null');
    return s ? s.userId : 'anon';
  },
  _k:   k => k + '_' + CS._uid(),
  _get: k => JSON.parse(localStorage.getItem(CS._k(k)) || '[]'),
  _set: (k, v) => localStorage.setItem(CS._k(k), JSON.stringify(v)),

  // ── Progress reads ────────────────────────────────────────────────────
  getSolved:   () => CS._get('cs_solved'),
  getMastered: () => CS._get('cs_mastered'),
  getStreak:   () => parseInt(localStorage.getItem(CS._k('cs_streak')) || '0'),
  isSolved:    id => CS.getSolved().includes(id),
  isMastered:  id => CS.getMastered().includes(id),

  // ── Progress writes (localStorage-first, then cloud) ─────────────────
  markSolved(id) {
    const s = CS.getSolved();
    if (!s.includes(id)) { s.push(id); CS._set('cs_solved', s); }
    CS._tick();
    CS.syncProgress();
  },

  toggleMastered(id) {
    const m = CS.getMastered();
    const i = m.indexOf(id);
    if (i >= 0) m.splice(i, 1); else m.push(id);
    CS._set('cs_mastered', m);
    CS.syncProgress();
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

  // ── Guesstimates & Rounds ─────────────────────────────────────────────
  getPractised() {
    return new Set(JSON.parse(localStorage.getItem(CS._k('gs_practised')) || '[]'));
  },
  savePractised(set) {
    localStorage.setItem(CS._k('gs_practised'), JSON.stringify([...set]));
    CS.syncProgress();
  },
  getRounds() {
    return parseInt(localStorage.getItem(CS._k('mr_done')) || '0');
  },
  addRound() {
    const n = CS.getRounds() + 1;
    localStorage.setItem(CS._k('mr_done'), n);
    CS._tick();
    CS.syncProgress();
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
  },

  // ── Cloud sync ────────────────────────────────────────────────────────
  async syncProgress() {
    const u = CS.getUser();
    if (!u) return;
    const body = JSON.stringify({
      user_id:            u.userId,
      cases_solved:       CS.getSolved(),
      cases_mastered:     CS.getMastered(),
      streak:             CS.getStreak(),
      last_activity_date: new Date().toISOString().slice(0, 10),
      rounds_done:        CS.getRounds(),
      guesstimates_done:  CS.getPractised().size,
      updated_at:         new Date().toISOString()
    });
    fetch(SB_URL + '/rest/v1/cs_progress', {
      method: 'POST',
      headers: { ..._SBH(), 'Prefer': 'resolution=merge-duplicates,return=minimal' },
      body
    }).catch(() => {});
    fetch(SB_URL + '/rest/v1/cs_users?id=eq.' + u.userId, {
      method: 'PATCH',
      headers: { ..._SBH(), 'Prefer': 'return=minimal' },
      body: JSON.stringify({ last_active_at: new Date().toISOString() })
    }).catch(() => {});
  },

  async loadFromCloud() {
    const u = CS.getUser();
    if (!u) return;
    const res = await fetch(
      SB_URL + '/rest/v1/cs_progress?user_id=eq.' + u.userId + '&select=*',
      { headers: _SBH() }
    ).catch(() => null);
    if (!res || !res.ok) return;
    const rows = await res.json();
    if (!rows.length) return;
    const p = rows[0];
    if (Array.isArray(p.cases_solved))   CS._set('cs_solved',   p.cases_solved);
    if (Array.isArray(p.cases_mastered)) CS._set('cs_mastered', p.cases_mastered);
    if (p.streak != null)      localStorage.setItem(CS._k('cs_streak'), p.streak);
    if (p.rounds_done != null) localStorage.setItem(CS._k('mr_done'),   p.rounds_done);
    if (p.last_activity_date)  localStorage.setItem(CS._k('cs_last'), new Date(p.last_activity_date).toDateString());
  }
};

// Auth guard + cloud load on every app page
(function() {
  const p = location.pathname;
  const onLogin = p.endsWith('index.html') || p === '/';
  const onAdmin = p.endsWith('admin.html');
  if (!onLogin && !onAdmin) {
    if (!localStorage.getItem('cs_session')) {
      location.replace('index.html');
    } else {
      CS.loadFromCloud(); // async, updates localStorage in background
    }
  }
}());
