const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { execFile } = require('child_process');
const store = require('./store.cjs');

const ROOT = path.join(__dirname, '..');
const DATA = path.join(ROOT, 'data');
const SECTIONS = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'sections.json'), 'utf8'));
const STATUSES = ['pending_review', 'verified', 'dismissed'];


const app = express.Router();

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => { const d = path.join(DATA, 'tmp'); fs.mkdirSync(d, { recursive: true }); cb(null, d); },
    filename: (req, file, cb) => cb(null, crypto.randomUUID() + path.extname(file.originalname).toLowerCase()),
  }),
  limits: { fileSize: 40 * 1024 * 1024, files: 2 },
  fileFilter: (req, file, cb) => (/^image\/(png|jpe?g|tiff?|webp)$/.test(file.mimetype) ? cb(null, true)
    : cb(new ApiError(400, 'bad_file_type', `${file.fieldname} must be a PNG/JPEG/TIFF/WebP image`))),
});

class ApiError extends Error {
  constructor(status, code, message, details) { super(message); this.status = status; this.code = code; this.details = details; }
}
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// ---------- validation helpers
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
function parseJsonField(v, name) {
  if (v === undefined || v === '') return undefined;
  if (typeof v !== 'string') return v;
  try { return JSON.parse(v); } catch { throw new ApiError(400, 'bad_json', `${name} is not valid JSON`); }
}
function validBounds(b, name) {
  if (!b || ![b.west, b.east, b.north, b.south].every(isNum)) throw new ApiError(400, 'bad_bounds', `${name} needs numeric west, east, north, south`);
  if (!(b.east > b.west && b.north > b.south)) throw new ApiError(400, 'bad_bounds', `${name}: east must be > west and north must be > south`);
  if (b.west < -180 || b.east > 180 || b.south < -90 || b.north > 90) throw new ApiError(400, 'bad_bounds', `${name} outside valid lon/lat range`);
  return b;
}
function validDate(d, name) {
  if (typeof d !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(d) || Number.isNaN(Date.parse(d))) throw new ApiError(400, 'bad_date', `${name} must be YYYY-MM-DD`);
  return d;
}
function validLine(l, name, min) {
  if (!Array.isArray(l) || l.length < min || !l.every((p) => Array.isArray(p) && p.length === 2 && p.every(isNum)))
    throw new ApiError(400, 'bad_geometry', `${name} must be an array of at least ${min} [lon, lat] points`);
  return l;
}

function runPipeline(cfg) {
  const cfgPath = path.join(cfg.out_dir, 'config.json');
  fs.mkdirSync(cfg.out_dir, { recursive: true });
  fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2));
  return new Promise((resolve, reject) => {
    execFile('python3', [path.join(ROOT, 'cv', 'detect.py'), cfgPath], { timeout: 180000, maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
      let parsed;
      try { parsed = JSON.parse(stdout.trim().split('\n').pop()); } catch { /* ignore */ }
      if (err && err.killed) return reject(new ApiError(504, 'pipeline_timeout', 'Image analysis took too long'));
      if (parsed && parsed.ok === false) {
        const e = parsed.error;
        return reject(new ApiError(e.code === 'internal' ? 500 : 422, e.code, e.message));
      }
      if (err) return reject(new ApiError(500, 'pipeline_crashed', 'Analysis failed unexpectedly', String(stderr).slice(-500)));
      resolve(JSON.parse(fs.readFileSync(path.join(cfg.out_dir, 'result.json'), 'utf8')));
    });
  });
}

async function createAnalysis({ before, after, section, buffer_m, boundaryMode }) {
  const id = new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + crypto.randomBytes(3).toString('hex');
  const dir = path.join(DATA, 'analyses', id);
  fs.mkdirSync(dir, { recursive: true });
  const keep = (p, label) => { const dest = path.join(dir, `${label}_input${path.extname(p)}`); fs.copyFileSync(p, dest); return dest; };
  const useBoundary = boundaryMode === 'section' && section.boundary;
  const cfg = {
    out_dir: dir,
    before: { ...before.meta, path: keep(before.path, 'before') },
    after: { ...after.meta, path: keep(after.path, 'after') },
    corridor: {
      track: section.track, buffer_m,
      ...(useBoundary ? { boundary: section.boundary, boundary_verified: !!section.boundary_verified, boundary_source: section.boundary_source } : {}),
    },
  };
  const result = await runPipeline(cfg);
  const created_at = new Date().toISOString();
  const analysis = {
    id, created_at, section_id: section.id, section_name: section.name,
    before: result.images.before, after: result.images.after,
    corridor: result.corridor, validation: result.validation, summary: result.summary,
    vegetation: result.vegetation, files: result.files, params: result.params,
  };
  const cands = result.candidates.map((c) => ({
    ...c, id: `${id}-${c.index}`, analysis_id: id, section_id: section.id,
    status: 'pending_review', note: '', reviewer: null, reviewed_at: null,
    history: [{ at: created_at, event: 'detected', status: 'pending_review' }],
  }));
  store.addAnalysis(analysis, cands);
  return { analysis, candidates: cands };
}

// ---------- routes
app.get('/api/health', (req, res) => res.json({ ok: true }));
app.get('/api/sections', (req, res) => res.json(SECTIONS.map(({ demo_images, ...s }) => ({ ...s, has_demo: !!demo_images }))));

app.post('/api/analyses', upload.fields([{ name: 'before', maxCount: 1 }, { name: 'after', maxCount: 1 }]), wrap(async (req, res) => {
  const b = req.body;
  const files = req.files || {};
  if (!files.before || !files.after) throw new ApiError(400, 'missing_images', 'Both "before" and "after" images are required');
  const section = SECTIONS.find((s) => s.id === b.section_id);
  if (!section) throw new ApiError(400, 'bad_section', 'Unknown section_id');
  const bounds = b.bounds ? validBounds(parseJsonField(b.bounds, 'bounds'), 'bounds') : section.bounds;
  const bAfter = b.after_bounds ? validBounds(parseJsonField(b.after_bounds, 'after_bounds'), 'after_bounds') : bounds;
  const buffer = b.buffer_m === undefined || b.buffer_m === '' ? section.default_buffer_m : Number(b.buffer_m);
  if (!(buffer >= 5 && buffer <= 500)) throw new ApiError(400, 'bad_buffer', 'buffer_m must be between 5 and 500');
  const bd = validDate(b.before_date, 'before_date'), ad = validDate(b.after_date, 'after_date');
  if (bd >= ad) throw new ApiError(400, 'bad_dates', 'before_date must be earlier than after_date');
  validLine(section.track, 'section track', 2);
  const out = await createAnalysis({
    before: { path: files.before[0].path, meta: { date: bd, source: b.before_source || 'unspecified', bounds } },
    after: { path: files.after[0].path, meta: { date: ad, source: b.after_source || 'unspecified', bounds: bAfter } },
    section, buffer_m: buffer, boundaryMode: b.use_boundary === 'true' ? 'section' : 'buffer',
  });
  res.status(201).json(out);
}));

app.post('/api/analyses/demo', wrap(async (req, res) => {
  const section = SECTIONS.find((s) => s.id === (req.body.section_id || 'tilak-bridge-demo'));
  if (!section || !section.demo_images) throw new ApiError(400, 'no_demo', 'No demo images for this section');
  const d = section.demo_images;
  const buffer = Number(req.body.buffer_m ?? section.default_buffer_m);
  if (!(buffer >= 5 && buffer <= 500)) throw new ApiError(400, 'bad_buffer', 'buffer_m must be between 5 and 500');
  const out = await createAnalysis({
    before: { path: path.join(ROOT, d.before), meta: { date: d.before_date, source: d.before_source, bounds: section.bounds } },
    after: { path: path.join(ROOT, d.after), meta: { date: d.after_date, source: d.after_source, bounds: section.bounds } },
    section, buffer_m: buffer, boundaryMode: req.body.use_boundary ? 'section' : 'buffer',
  });
  res.status(201).json(out);
}));

app.get('/api/analyses', (req, res) => res.json(store.listAnalyses()));
app.get('/api/analyses/:id', (req, res) => {
  const a = store.getAnalysis(req.params.id);
  if (!a) throw new ApiError(404, 'not_found', 'Analysis not found');
  res.json({ analysis: a, candidates: store.candidatesOf(a.id) });
});

app.get('/api/candidates', (req, res) => {
  let list = store.listCandidates();
  if (req.query.status) {
    if (!STATUSES.includes(req.query.status)) throw new ApiError(400, 'bad_status', `status must be one of ${STATUSES.join(', ')}`);
    list = list.filter((c) => c.status === req.query.status);
  }
  if (req.query.severity) list = list.filter((c) => c.severity === req.query.severity);
  res.json(list);
});

app.patch('/api/candidates/:id', (req, res) => {
  const { status, note, reviewer } = req.body || {};
  if (!STATUSES.includes(status)) throw new ApiError(400, 'bad_status', `status must be one of ${STATUSES.join(', ')}`);
  if (note !== undefined && (typeof note !== 'string' || note.length > 1000)) throw new ApiError(400, 'bad_note', 'note must be text up to 1000 chars');
  const at = new Date().toISOString();
  const c = store.updateCandidate(req.params.id,
    { status, note: note ?? '', reviewer: reviewer || 'inspector', reviewed_at: status === 'pending_review' ? null : at },
    { at, event: 'review', status, note: note ?? '', reviewer: reviewer || 'inspector' });
  if (!c) throw new ApiError(404, 'not_found', 'Candidate not found');
  res.json(c);
});

app.use('/api', (req, res, next) => next(new ApiError(404, 'not_found', 'Unknown API route')));
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) err = new ApiError(400, 'upload_error', err.message);
  if (!(err instanceof ApiError) && err.status === 404) err = new ApiError(404, 'not_found', 'File not found');
  if (!(err instanceof ApiError)) { console.error(err); err = new ApiError(500, 'internal', 'Something went wrong'); }
  res.status(err.status).json({ error: { code: err.code, message: err.message, details: err.details } });
});

module.exports = app;
