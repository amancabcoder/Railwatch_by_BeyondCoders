import React, { useState } from 'react';
import { IntelligenceRecord, Segment } from '../types';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  ExternalLink, 
  ShieldCheck, 
  Filter, 
  CheckCheck,
  MapPin,
  ArrowRight
} from 'lucide-react';

interface ReviewDeskProps {
  records: IntelligenceRecord[];
  segments: Segment[];
  onVerifyRecord: (data: { record_id: string; verification_status: string; segment_id?: string; notes?: string }) => void;
  onNavigateToMap: () => void;
}

export const ReviewDesk: React.FC<ReviewDeskProps> = ({
  records,
  segments,
  onVerifyRecord,
  onNavigateToMap
}) => {
  const [filter, setFilter] = useState<'all' | 'pending' | 'verified' | 'rejected'>('pending');
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [assignedSegmentId, setAssignedSegmentId] = useState<string>('DEL-NDLS-01');
  const [reviewNote, setReviewNote] = useState<string>('');

  const filteredRecords = records.filter(r => {
    if (filter === 'all') return true;
    return r.verification_status === filter;
  });

  const selectedRecord = records.find(r => r.record_id === selectedRecordId) || filteredRecords[0];

  const handleAction = (status: 'verified' | 'rejected' | 'duplicate') => {
    if (!selectedRecord) return;
    onVerifyRecord({
      record_id: selectedRecord.record_id,
      verification_status: status,
      segment_id: assignedSegmentId,
      notes: reviewNote
    });
    setReviewNote('');
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      
      {/* Header */}
      <div className="bg-[#1C2541] p-6 rounded-2xl border border-[#3A506B]/40 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-indigo-400 font-mono text-xs uppercase tracking-wider font-semibold flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" /> Human-in-the-Loop Review Desk
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Audit Guardrail
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white mt-1">Web Intelligence Triage & Segment Linker</h1>
          <p className="text-sm text-slate-300 max-w-2xl mt-1">
            TinyFish discovers public notices and media reports. To prevent misleading web articles from triggering false track safety closures, an authorized operator must verify source validity and link the notice to a specific railway corridor.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center bg-[#0B132B] p-1.5 rounded-xl border border-[#3A506B]/50 space-x-1 text-xs">
          {(['pending', 'verified', 'rejected', 'all'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3 py-1.5 rounded-lg capitalize font-medium transition ${
                filter === tab
                  ? 'bg-indigo-500 text-white font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Main Review Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Records Queue */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span>Showing {filteredRecords.length} records in queue</span>
            <span>Click item to triage</span>
          </div>

          <div className="space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
            {filteredRecords.length === 0 ? (
              <div className="bg-[#1C2541] p-8 rounded-2xl border border-[#3A506B]/30 text-center text-slate-400 text-sm">
                No records found matching "{filter}" status.
              </div>
            ) : (
              filteredRecords.map(rec => {
                const isSelected = selectedRecord?.record_id === rec.record_id;
                return (
                  <div
                    key={rec.record_id}
                    onClick={() => {
                      setSelectedRecordId(rec.record_id);
                      if (rec.segment_id) setAssignedSegmentId(rec.segment_id);
                    }}
                    className={`p-4 rounded-xl border cursor-pointer transition shadow-md space-y-2 ${
                      isSelected
                        ? 'bg-[#233256] border-indigo-400 ring-1 ring-indigo-400'
                        : 'bg-[#1C2541] border-[#3A506B]/40 hover:border-slate-500'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono text-[10px] text-teal-400 bg-teal-500/10 px-1.5 py-0.5 rounded border border-teal-500/20">
                        {rec.capability}
                      </span>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        rec.verification_status === 'verified' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                        rec.verification_status === 'rejected' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                        'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}>
                        {rec.verification_status}
                      </span>
                    </div>

                    <h3 className="font-bold text-white text-sm line-clamp-2 leading-snug">{rec.title}</h3>
                    <p className="text-xs text-slate-300 line-clamp-2">{rec.summary}</p>

                    <div className="pt-2 border-t border-[#3A506B]/30 flex items-center justify-between text-[11px] text-slate-400">
                      <span>{rec.publisher}</span>
                      <span>{new Date(rec.retrieved_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Detailed Triage & Side-by-Side Review */}
        <div className="lg:col-span-7">
          {selectedRecord ? (
            <div className="bg-[#1C2541] p-6 rounded-2xl border border-[#3A506B]/50 shadow-2xl space-y-5 sticky top-20">
              
              <div className="flex items-center justify-between border-b border-[#3A506B]/40 pb-3">
                <div>
                  <span className="text-xs font-mono text-slate-400">{selectedRecord.record_id}</span>
                  <h2 className="text-lg font-bold text-white mt-0.5 leading-snug">{selectedRecord.title}</h2>
                </div>
                <span className={`text-xs font-bold uppercase px-2.5 py-1 rounded-full ${
                  selectedRecord.verification_status === 'verified' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                  selectedRecord.verification_status === 'rejected' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                  'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                }`}>
                  {selectedRecord.verification_status}
                </span>
              </div>

              {/* Side-by-Side Source Information */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-[#0B132B] p-3 rounded-xl border border-[#3A506B]/30 space-y-1">
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Issuing Publisher</span>
                  <span className="font-bold text-slate-200">{selectedRecord.publisher}</span>
                </div>
                <div className="bg-[#0B132B] p-3 rounded-xl border border-[#3A506B]/30 space-y-1">
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Mentioned Location</span>
                  <span className="font-bold text-slate-200">{selectedRecord.location_text || 'Delhi Region'}</span>
                </div>
              </div>

              {/* Extracted Summary */}
              <div className="bg-[#0B132B] p-4 rounded-xl border border-[#3A506B]/30 space-y-2">
                <span className="text-slate-400 block text-xs font-semibold uppercase tracking-wider">
                  Extracted Intelligence Content
                </span>
                <p className="text-xs text-slate-200 leading-relaxed">{selectedRecord.summary}</p>
                <div className="pt-2">
                  <a
                    href={selectedRecord.source_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-teal-400 hover:underline"
                  >
                    <span>Verify Live Source Webpage</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {/* Corridor Segment Linker */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                  Link to Delhi Railway Corridor Segment
                </label>
                <select
                  value={assignedSegmentId}
                  onChange={(e) => setAssignedSegmentId(e.target.value)}
                  className="w-full bg-[#0B132B] border border-[#3A506B]/60 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-indigo-400"
                >
                  {segments.map(seg => (
                    <option key={seg.id} value={seg.id}>
                      {seg.id} - {seg.name} ({seg.corridor})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400">
                  Linking this verified notice will update the target segment's composite risk breakdown on the GIS map.
                </p>
              </div>

              {/* Reviewer Note */}
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                  Operator Audit Note (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Cross-checked with Northern Railway morning flood circular"
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  className="w-full bg-[#0B132B] border border-[#3A506B]/60 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400"
                />
              </div>

              {/* Triage Action Buttons */}
              <div className="pt-2 flex flex-wrap items-center gap-3">
                <button
                  onClick={() => handleAction('verified')}
                  className="flex-1 py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center space-x-1.5 transition shadow-lg shadow-emerald-500/20"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Verify & Elevate Risk</span>
                </button>

                <button
                  onClick={() => handleAction('rejected')}
                  className="py-2.5 px-4 bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 font-semibold rounded-xl text-xs flex items-center justify-center space-x-1.5 transition"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Reject (False Positive)</span>
                </button>

                <button
                  onClick={() => handleAction('duplicate')}
                  className="py-2.5 px-3 bg-[#0B132B] hover:bg-[#233256] text-slate-300 border border-[#3A506B]/40 rounded-xl text-xs transition"
                >
                  Duplicate
                </button>
              </div>

              {selectedRecord.verification_status === 'verified' && (
                <div className="pt-3 border-t border-[#3A506B]/30 flex items-center justify-between text-xs text-emerald-400">
                  <span className="flex items-center gap-1.5">
                    <CheckCheck className="w-4 h-4" /> Actively contributing to segment safety score
                  </span>
                  <button
                    onClick={onNavigateToMap}
                    className="hover:underline flex items-center gap-1 text-teal-300 font-semibold"
                  >
                    <span>View on Corridor Map</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

            </div>
          ) : (
            <div className="bg-[#1C2541] p-12 rounded-2xl border border-[#3A506B]/30 text-center text-slate-400 text-sm">
              Select a record from the queue to review and link.
            </div>
          )}
        </div>

      </div>

    </div>
  );
};

