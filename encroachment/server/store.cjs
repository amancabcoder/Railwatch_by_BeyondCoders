// Tiny JSON-file persistence (atomic writes). Swap for SQLite/Postgres/Firebase later.
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'data', 'store.json');
let db = { analyses: {}, candidates: {} };

function load() {
  try { db = JSON.parse(fs.readFileSync(FILE, 'utf8')); }
  catch (e) { if (e.code !== 'ENOENT') console.error('store load failed, starting empty:', e.message); }
  db.analyses ||= {}; db.candidates ||= {};
}
function save() {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  const tmp = FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, FILE);
}
load();

module.exports = {
  addAnalysis(a, candidates) {
    db.analyses[a.id] = a;
    for (const c of candidates) db.candidates[c.id] = c;
    save();
  },
  listAnalyses: () => Object.values(db.analyses).sort((x, y) => y.created_at.localeCompare(x.created_at)),
  getAnalysis: (id) => db.analyses[id],
  candidatesOf: (aid) => Object.values(db.candidates).filter((c) => c.analysis_id === aid).sort((a, b) => a.index - b.index),
  listCandidates: () => Object.values(db.candidates),
  getCandidate: (id) => db.candidates[id],
  updateCandidate(id, patch, event) {
    const c = db.candidates[id];
    if (!c) return null;
    Object.assign(c, patch);
    c.history.push(event);
    save();
    return c;
  },
};
