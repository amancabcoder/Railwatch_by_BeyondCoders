export interface Station {
  name: string;
  coords: [number, number];
  type: string;
}

export interface SegmentMetrics {
  vegetation_ndvi: number;
  vegetation_status: string;
  flood_waterlogging_index: number;
  flood_status: string;
  encroachment_risk: number;
  rainfall_last_24h_mm: number;
  water_level_gauge_m: number;
  culvert_flow_efficiency: number;
}

export interface ContributingFactor {
  factor: string;
  score: number;
  weight: string;
  contribution: number;
  items?: number;
}

export interface SegmentAlert {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  timestamp: string;
}

export interface Segment {
  id: string;
  name: string;
  corridor: string;
  length_km: number;
  status: 'normal' | 'warning' | 'urgent';
  risk_score: number;
  last_inspected: string;
  coordinates: [number, number][];
  stations: Station[];
  metrics: SegmentMetrics;
  risk_breakdown: {
    vegetation: number;
    flooding: number;
    encroachment: number;
    web_intelligence: number;
    citizen_reports: number;
  };
  contributing_factors?: ContributingFactor[];
  alerts: SegmentAlert[];
}

export interface IntelligenceRecord {
  record_id: string;
  provider: string;
  capability: string;
  source_url: string;
  publisher: string;
  title: string;
  published_at: string | null;
  retrieved_at: string;
  location_text: string;
  segment_id: string | null;
  topic: string;
  summary: string;
  source_type: string;
  verification_status: 'pending' | 'verified' | 'rejected' | 'duplicate';
  reviewer_id?: string | null;
  reviewed_at?: string | null;
  review_notes?: string;
}

export interface CitizenReport {
  id: string;
  segment_id: string;
  category: string;
  description: string;
  coords: [number, number];
  submitted_at: string;
  status: string;
  image_url: string;
}

export interface InspectionWorkOrder {
  id: string;
  segment_id: string;
  segment_name: string;
  priority: string;
  assigned_crew: string;
  trigger_reason: string;
  scheduled_date: string;
  status: string;
}

