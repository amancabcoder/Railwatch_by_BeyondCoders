import React, { useState } from 'react';
import { Segment, IntelligenceRecord, CitizenReport } from '../types';
import { 
  X, 
  AlertTriangle, 
  ShieldCheck, 
  Droplets, 
  Trees, 
  Home, 
  ExternalLink, 
  Send, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  FileText,
  Sparkles
} from 'lucide-react';

interface SegmentDrawerProps {
  segment: Segment | null;
  onClose: () => void;
  intelligenceRecords: IntelligenceRecord[];
  citizenReports: CitizenReport[];
  onDispatchInspection: (data: { segment_id: string; segment_name: string; priority: string; trigger_reason: string }) => void;
}

export const SegmentDrawer: React.FC<SegmentDrawerProps> = ({
  segment,
  onClose,
  intelligenceRecords,
  citizenReports,
  onDispatchInspection
}) => {
  const [isDispatched, setIsDispatched] = useState(false);

  if (!segment) return null;

  const linkedIntel = intelligenceRecords.filter(r => r.segment_id === segment.id && r.verification_status === 'verified');
  const linkedCitizen = citizenReports.filter(c => c.segment_id === segment.id);

  const handleDispatch = () => {
    onDispatchInspection({
      segment_id: segment.id,
      segment_name: segment.name,
      priority: segment.status === 'urgent' ? 'CRITICAL' : 'HIGH',
      trigger_reason: `Elevated multi-modal risk score (${segment.risk_score}/100) combining sensor telemetry and verified intelligence.`
    });
    setIsDispatched(true);
    setTimeout(() => setIsDispatched(false), 4000);
  };

  return (
    <aside className="fixed inset-y-0 right-0 z-[1100] w-full max-w-md bg-[#1C2541]/95 backdrop-blur-xl border-l border-[#3A506B]/50 shadow-2xl flex flex-col overflow-y-auto transition-transform duration-300">
      
      {/* Header */}
      <div className="p-5 border-b border-[#3A506B]/40 bg-[#0B132B]/60 sticky top-0 z-10 flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-mono font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              {segment.id}
            </span>
            <span className={`text-[11px] font-bold uppercase px-2 py-0.5 rounded-full ${
              segment.status === 'urgent' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
              segment.status === 'warning' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
              'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
            }`}>
              {segment.status} priority
            </span>
          </div>
          <h2 className="text-lg font-bold text-white mt-1 leading-snug">{segment.name}</h2>
          <p className="text-xs text-slate-400">{segment.corridor} • {segment.length_km} km</p>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#233256] transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-5 space-y-6 flex-1">
        
        {/* Composite Risk Score Banner */}
        <div className={`p-4 rounded-xl border ${
          segment.status === 'urgent' ? 'bg-red-950/30 border-red-500/40' :
          segment.status === 'warning' ? 'bg-amber-950/30 border-amber-500/40' :
          'bg-emerald-950/30 border-emerald-500/40'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Composite Risk Index</span>
              <div className="flex items-baseline space-x-2 mt-0.5">
                <span className="text-3xl font-extrabold text-white">{segment.risk_score}</span>
                <span className="text-sm text-slate-400">/ 100</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400">Inspection Status:</span>
              <p className="text-xs font-semibold text-slate-200 mt-0.5">
                {segment.status === 'urgent' ? '🚨 Immediate Inspection Mandated' : 'Periodic Monitoring Active'}
              </p>
            </div>
          </div>

          {/* Quick Progress Bar */}
          <div className="w-full bg-[#0B132B] h-2.5 rounded-full overflow-hidden mt-3 border border-[#3A506B]/30">
            <div
              className={`h-full transition-all duration-500 ${
                segment.status === 'urgent' ? 'bg-red-500' :
                segment.status === 'warning' ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${segment.risk_score}%` }}
            />
          </div>
        </div>

        {/* Explainable Factor Breakdown */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center justify-between">
            <span>Explainable Risk Weights</span>
            <span className="text-[11px] text-teal-400 font-normal">Audit Compliant</span>
          </h3>
          
          <div className="space-y-2.5 text-xs">
            {/* Flooding */}
            <div className="bg-[#0B132B]/50 p-2.5 rounded-lg border border-[#3A506B]/30">
              <div className="flex justify-between items-center mb-1">
                <span className="flex items-center gap-1.5 text-slate-300 font-medium">
                  <Droplets className="w-3.5 h-3.5 text-sky-400" />
                  Hydrological & Flood Susceptibility (35%)
                </span>
                <span className="font-mono font-bold text-sky-300">{segment.risk_breakdown.flooding} pts</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Index: {segment.metrics.flood_waterlogging_index}% • {segment.metrics.flood_status}
              </p>
            </div>

            {/* Vegetation */}
            <div className="bg-[#0B132B]/50 p-2.5 rounded-lg border border-[#3A506B]/30">
              <div className="flex justify-between items-center mb-1">
                <span className="flex items-center gap-1.5 text-slate-300 font-medium">
                  <Trees className="w-3.5 h-3.5 text-emerald-400" />
                  Satellite Vegetation NDVI (25%)
                </span>
                <span className="font-mono font-bold text-emerald-300">{segment.risk_breakdown.vegetation} pts</span>
              </div>
              <p className="text-[11px] text-slate-400">
                NDVI Value: {segment.metrics.vegetation_ndvi} • {segment.metrics.vegetation_status}
              </p>
            </div>

            {/* TinyFish Web Intelligence */}
            <div className="bg-[#0B132B]/50 p-2.5 rounded-lg border border-[#3A506B]/30">
              <div className="flex justify-between items-center mb-1">
                <span className="flex items-center gap-1.5 text-slate-300 font-medium">
                  <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                  TinyFish Verified Web Bulletins (15%)
                </span>
                <span className="font-mono font-bold text-teal-300">{segment.risk_breakdown.web_intelligence} pts</span>
              </div>
              <p className="text-[11px] text-slate-400">
                {linkedIntel.length} verified official report(s) actively influencing priority
              </p>
            </div>

            {/* Encroachment */}
            <div className="bg-[#0B132B]/50 p-2.5 rounded-lg border border-[#3A506B]/30">
              <div className="flex justify-between items-center mb-1">
                <span className="flex items-center gap-1.5 text-slate-300 font-medium">
                  <Home className="w-3.5 h-3.5 text-amber-400" />
                  Trackside Encroachment Risk (15%)
                </span>
                <span className="font-mono font-bold text-amber-300">{segment.risk_breakdown.encroachment} pts</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Right-of-Way risk metric: {segment.metrics.encroachment_risk}%
              </p>
            </div>
          </div>
        </div>

        {/* Environmental & Hydrological Sensors */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
            Real-Time Environmental Telemetry
          </h3>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="bg-[#0B132B] p-2.5 rounded-lg border border-[#3A506B]/40">
              <span className="text-[10px] text-slate-400 block">River Gauge</span>
              <span className="text-sm font-bold text-sky-400 mt-1 block">
                {segment.metrics.water_level_gauge_m} m
              </span>
              <span className="text-[9px] text-slate-500">Warning: 204.5m</span>
            </div>

            <div className="bg-[#0B132B] p-2.5 rounded-lg border border-[#3A506B]/40">
              <span className="text-[10px] text-slate-400 block">Rainfall (24h)</span>
              <span className="text-sm font-bold text-emerald-400 mt-1 block">
                {segment.metrics.rainfall_last_24h_mm} mm
              </span>
              <span className="text-[9px] text-slate-500">IMD Station</span>
            </div>

            <div className="bg-[#0B132B] p-2.5 rounded-lg border border-[#3A506B]/40">
              <span className="text-[10px] text-slate-400 block">Culvert Flow</span>
              <span className="text-sm font-bold text-amber-400 mt-1 block">
                {segment.metrics.culvert_flow_efficiency}%
              </span>
              <span className="text-[9px] text-slate-500">Efficiency</span>
            </div>
          </div>
        </div>

        {/* Linked TinyFish Web Evidence */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center justify-between">
            <span>Linked TinyFish Web Intel ({linkedIntel.length})</span>
            <span className="text-[10px] text-teal-400 font-normal">Human Verified</span>
          </h3>

          {linkedIntel.length === 0 ? (
            <p className="text-xs text-slate-500 italic bg-[#0B132B]/40 p-3 rounded-lg border border-[#3A506B]/20">
              No verified public web notices currently linked to this segment.
            </p>
          ) : (
            <div className="space-y-2">
              {linkedIntel.map((item) => (
                <div key={item.record_id} className="bg-[#0B132B] p-3 rounded-xl border border-teal-500/30 text-xs space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-teal-400">
                    <span className="font-semibold">{item.publisher}</span>
                    <span className="text-slate-400 text-[10px]">
                      {item.published_at ? new Date(item.published_at).toLocaleDateString() : 'Recent'}
                    </span>
                  </div>
                  <p className="font-bold text-slate-100">{item.title}</p>
                  <p className="text-slate-300 text-[11px] leading-relaxed">{item.summary}</p>
                  <div className="pt-1 flex items-center justify-between text-[10px]">
                    <span className="text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 inline" /> Verified by {item.reviewer_id}
                    </span>
                    <a
                      href={item.source_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-teal-400 hover:underline flex items-center gap-0.5"
                    >
                      Original Source <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Footer Action: Dispatch Inspection Crew */}
      <div className="p-4 border-t border-[#3A506B]/40 bg-[#0B132B]/80 sticky bottom-0">
        {isDispatched ? (
          <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-center text-xs text-emerald-300 font-semibold flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            Inspection Work Order Dispatched to Delhi Division P-Way!
          </div>
        ) : (
          <button
            onClick={handleDispatch}
            className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition shadow-lg ${
              segment.status === 'urgent'
                ? 'bg-red-500 hover:bg-red-400 text-white shadow-red-500/25'
                : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/25'
            }`}
          >
            <Send className="w-4 h-4" />
            <span>Dispatch Track Inspection Crew</span>
          </button>
        )}
      </div>

    </aside>
  );
};

