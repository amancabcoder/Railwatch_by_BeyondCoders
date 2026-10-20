/**
 * Multi-Modal Explainable Risk Engine
 * Computes safety risk priority scores (0 - 100) for railway segments
 * using fused multi-modal sources:
 * 1. Satellite Vegetation (NDVI anomaly)
 * 2. Hydrological Flood & Waterlogging Gauge Index
 * 3. Encroachment / Right-of-Way risk
 * 4. Verified TinyFish Web Intelligence
 * 5. Geotagged Citizen Incident Reports
 */

export function calculateSegmentRisk(segment, verifiedWebRecords = [], citizenReports = []) {
  // 1. Vegetation Component (Weight: 25%)
  // High NDVI (> 0.5) near overhead traction lines creates arcing & obstruction hazard
  const ndvi = segment.metrics.vegetation_ndvi || 0.2;
  const vegScore = Math.min(100, Math.round(ndvi * 120));

  // 2. Flood & Hydrology Component (Weight: 35%)
  // Gauge level and culvert efficiency directly impact track stability
  const floodBase = segment.metrics.flood_waterlogging_index || 20;
  const floodScore = floodBase;

  // 3. Encroachment Component (Weight: 15%)
  const encScore = segment.metrics.encroachment_risk || 30;

  // 4. Verified Web Intelligence Component (Weight: 15%)
  // Count how many verified public reports target this segment
  const matchingRecords = verifiedWebRecords.filter(r => r.segment_id === segment.id && r.verification_status === 'verified');
  let webScore = 0;
  if (matchingRecords.length > 0) {
    webScore = Math.min(100, matchingRecords.length * 35);
  }

  // 5. Citizen Reports Component (Weight: 10%)
  const matchingCitizen = citizenReports.filter(c => c.segment_id === segment.id);
  const citizenScore = Math.min(100, matchingCitizen.length * 40);

  // Weighted Composite Risk
  const composite = Math.round(
    (0.25 * vegScore) +
    (0.35 * floodScore) +
    (0.15 * encScore) +
    (0.15 * webScore) +
    (0.10 * citizenScore)
  );

  let status = 'normal';
  if (composite >= 75) {
    status = 'urgent';
  } else if (composite >= 45) {
    status = 'warning';
  }

  return {
    risk_score: composite,
    status,
    risk_breakdown: {
      vegetation: Math.round(0.25 * vegScore),
      flooding: Math.round(0.35 * floodScore),
      encroachment: Math.round(0.15 * encScore),
      web_intelligence: Math.round(0.15 * webScore),
      citizen_reports: Math.round(0.10 * citizenScore)
    },
    contributing_factors: [
      { factor: "Vegetation (NDVI)", score: vegScore, weight: "25%", contribution: Math.round(0.25 * vegScore) },
      { factor: "Hydrological Flood Risk", score: floodScore, weight: "35%", contribution: Math.round(0.35 * floodScore) },
      { factor: "Right-of-Way Encroachment", score: encScore, weight: "15%", contribution: Math.round(0.15 * encScore) },
      { factor: "Verified TinyFish Intelligence", score: webScore, weight: "15%", contribution: Math.round(0.15 * webScore), items: matchingRecords.length },
      { factor: "Citizen Reports", score: citizenScore, weight: "10%", contribution: Math.round(0.10 * citizenScore), items: matchingCitizen.length }
    ]
  };
}

