import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import {
  getIntelligenceRecords,
  addIntelligenceRecord,
  updateRecordVerification,
  executeTinySearch,
  executeTinyFetch,
  executeTinyAgentStream
} from './tinyfishService.js';
import { calculateSegmentRisk } from './riskEngine.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Aerial-image encroachment analysis module (teammate contribution).
// The router is CommonJS because the original module uses Node's execFile/Multer APIs.
const require = createRequire(import.meta.url);
const encroachmentRouter = require('../encroachment/server/router.cjs');
const encroachmentRoot = path.join(__dirname, '../encroachment');
app.use('/files', express.static(path.join(encroachmentRoot, 'data', 'analyses'), { fallthrough: false }));
app.use('/encroachment', express.static(path.join(encroachmentRoot, 'public')));


// In-memory data store initialized from corridors json
const corridorsFilePath = path.join(__dirname, '../src/data/delhi_rail_corridors.json');
let segmentsData = JSON.parse(fs.readFileSync(corridorsFilePath, 'utf-8'));

// Citizen reports in-memory storage
let citizenReports = [
  {
    id: "CIT-DEL-001",
    segment_id: "DEL-NDLS-01",
    category: "Drainage / Waterlogging",
    description: "Track culvert near Shivaji Bridge is completely choked with plastic waste after morning showers. Water standing on gravel ballast.",
    coords: [28.6325, 77.2345],
    submitted_at: "2026-10-14T08:15:00Z",
    status: "verified",
    image_url: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=500&auto=format&fit=crop&q=60"
  },
  {
    id: "CIT-DEL-002",
    segment_id: "DEL-DLI-01",
    category: "Water Level",
    description: "Yamuna river water level looks very high touching pillar base of Old Iron Bridge. Speed of local trains seems slow.",
    coords: [28.6608, 77.2472],
    submitted_at: "2026-10-14T07:20:00Z",
    status: "verified",
    image_url: "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=500&auto=format&fit=crop&q=60"
  }
];

// Inspection work orders storage
let inspectionWorkOrders = [
  {
    id: "WO-2026-098",
    segment_id: "DEL-DLI-01",
    segment_name: "Old Delhi - Yamuna Bridge (Loha Pul)",
    priority: "CRITICAL",
    assigned_crew: "SSE/P-Way/Delhi Main (Team Charlie)",
    trigger_reason: "CWC hydro-bulletin confirmed river level 205.85m + Track sensor warning",
    scheduled_date: "2026-10-14T14:00:00Z",
    status: "DISPATCHED"
  }
];

// In-memory API Key store (overrides .env if set via frontend settings)
let runtimeApiKey = process.env.TINYFISH_API_KEY || '';

// ----------------------
// REST API ROUTES
// ----------------------

// 1. Get Segments with recalculated live risk
app.get('/api/segments', (req, res) => {
  const verifiedWeb = getIntelligenceRecords();
  const updatedSegments = segmentsData.map(seg => {
    const risk = calculateSegmentRisk(seg, verifiedWeb, citizenReports);
    return {
      ...seg,
      ...risk
    };
  });
  res.json(updatedSegments);
});

// 2. Get single segment details
app.get('/api/segments/:id', (req, res) => {
  const segment = segmentsData.find(s => s.id === req.params.id);
  if (!segment) return res.status(404).json({ error: 'Segment not found' });
  const verifiedWeb = getIntelligenceRecords();
  const risk = calculateSegmentRisk(segment, verifiedWeb, citizenReports);
  const linkedWebRecords = verifiedWeb.filter(w => w.segment_id === segment.id);
  const linkedCitizen = citizenReports.filter(c => c.segment_id === segment.id);
  res.json({
    ...segment,
    ...risk,
    linked_evidence: {
      web_records: linkedWebRecords,
      citizen_reports: linkedCitizen
    }
  });
});

// 3. Web Intelligence Records
app.get('/api/intelligence', (req, res) => {
  res.json(getIntelligenceRecords());
});

// 4. Verify / Triage a Web Intelligence record
app.post('/api/intelligence/verify', (req, res) => {
  const { record_id, verification_status, reviewer_id, segment_id, notes } = req.body;
  if (!record_id || !verification_status) {
    return res.status(400).json({ error: 'record_id and verification_status are required' });
  }
  const updated = updateRecordVerification(record_id, {
    verification_status,
    reviewer_id,
    segment_id,
    notes
  });
  if (!updated) return res.status(404).json({ error: 'Record not found' });
  res.json(updated);
});

// 5. Create new Intelligence Record (e.g. from TinySearch/Fetch/Agent)
app.post('/api/intelligence/create', (req, res) => {
  const record = {
    record_id: `TINY-DEL-${Date.now().toString().slice(-4)}`,
    retrieved_at: new Date().toISOString(),
    verification_status: 'pending',
    reviewer_id: null,
    reviewed_at: null,
    ...req.body
  };
  addIntelligenceRecord(record);
  res.status(201).json(record);
});

// 6. TinySearch Proxy
app.post('/api/tinyfish/search', async (req, res) => {
  const { query } = req.body;
  if (!query) return res.status(400).json({ error: 'Search query is required' });
  try {
    const result = await executeTinySearch(query, runtimeApiKey);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. TinyFetch Proxy
app.post('/api/tinyfish/fetch', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'Target URL is required' });
  try {
    const result = await executeTinyFetch(url, runtimeApiKey);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 8. TinyAgent SSE Stream Proxy
app.post('/api/tinyfish/agent', (req, res) => {
  const { url, goal } = req.body;
  if (!url || !goal) return res.status(400).json({ error: 'url and goal are required' });
  executeTinyAgentStream(res, { url, goal }, runtimeApiKey);
});

// 9. Citizen Reports
app.get('/api/citizen-reports', (req, res) => {
  res.json(citizenReports);
});

app.post('/api/citizen-reports', (req, res) => {
  const { segment_id, category, description, coords, image_url } = req.body;
  const newReport = {
    id: `CIT-DEL-${(citizenReports.length + 1).toString().padStart(3, '0')}`,
    segment_id: segment_id || 'DEL-NDLS-01',
    category: category || 'Track Safety Issue',
    description: description || 'Reported hazard along corridor',
    coords: coords || [28.632, 77.234],
    submitted_at: new Date().toISOString(),
    status: 'pending_review',
    image_url: image_url || 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=500&auto=format&fit=crop&q=60'
  };
  citizenReports.unshift(newReport);
  res.status(201).json(newReport);
});

// 10. Inspection Work Orders
app.get('/api/inspections', (req, res) => {
  res.json(inspectionWorkOrders);
});

app.post('/api/inspections', (req, res) => {
  const { segment_id, segment_name, priority, trigger_reason, assigned_crew } = req.body;
  const newOrder = {
    id: `WO-2026-${(inspectionWorkOrders.length + 99).toString()}`,
    segment_id,
    segment_name,
    priority: priority || 'HIGH',
    trigger_reason: trigger_reason || 'Multi-modal threshold breached',
    assigned_crew: assigned_crew || 'Delhi Division Flying Squad',
    scheduled_date: new Date().toISOString(),
    status: 'DISPATCHED'
  };
  inspectionWorkOrders.unshift(newOrder);
  res.status(201).json(newOrder);
});

// 11. Settings & Config
app.get('/api/config', (req, res) => {
  res.json({
    has_api_key: Boolean(runtimeApiKey && runtimeApiKey.trim().length > 0),
    masked_key: runtimeApiKey ? `${runtimeApiKey.slice(0, 4)}...${runtimeApiKey.slice(-3)}` : null,
    backend_mode: runtimeApiKey ? 'Live TinyFish Connected' : 'High-Fidelity Demo Simulation'
  });
});

app.post('/api/config', (req, res) => {
  const { api_key } = req.body;
  if (typeof api_key === 'string') {
    runtimeApiKey = api_key.trim();
    return res.json({
      success: true,
      has_api_key: Boolean(runtimeApiKey.length > 0),
      masked_key: runtimeApiKey ? `${runtimeApiKey.slice(0, 4)}...${runtimeApiKey.slice(-3)}` : null,
      message: runtimeApiKey ? 'TinyFish API key updated successfully!' : 'TinyFish API key cleared. Operating in Demo Mode.'
    });
  }
  res.status(400).json({ error: 'api_key string required' });
});

// Register after the primary app routes so its API 404 handler cannot shadow existing endpoints.
app.use(encroachmentRouter);

app.listen(PORT, () => {
  console.log(`[RailWatch Server] Running at http://localhost:${PORT}`);
});

