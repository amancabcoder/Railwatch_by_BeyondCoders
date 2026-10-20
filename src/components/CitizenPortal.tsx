import React, { useState } from 'react';
import { CitizenReport, Segment } from '../types';
import { Users, Camera, MapPin, Send, CheckCircle2, AlertTriangle } from 'lucide-react';

interface CitizenPortalProps {
  reports: CitizenReport[];
  segments: Segment[];
  onAddReport: (report: Partial<CitizenReport>) => void;
}

export const CitizenPortal: React.FC<CitizenPortalProps> = ({
  reports,
  segments,
  onAddReport
}) => {
  const [selectedSegmentId, setSelectedSegmentId] = useState<string>('DEL-NDLS-01');
  const [category, setCategory] = useState<string>('Drainage / Track Waterlogging');
  const [description, setDescription] = useState<string>('');
  const [imageUrl, setImageUrl] = useState<string>('https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=500&auto=format&fit=crop&q=60');
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    const matchedSeg = segments.find(s => s.id === selectedSegmentId);
    const coords = matchedSeg?.coordinates[1] || [28.632, 77.234];

    onAddReport({
      segment_id: selectedSegmentId,
      category,
      description,
      coords,
      image_url: imageUrl
    });

    setDescription('');
    setIsSuccess(true);
    setTimeout(() => setIsSuccess(false), 4000);
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      
      {/* Header */}
      <div className="bg-[#1C2541] p-6 rounded-2xl border border-[#3A506B]/40 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-purple-400 font-mono text-xs uppercase tracking-wider font-semibold flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" /> Crowdsourced Ground Truth
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
              Citizen Reporting
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white mt-1">Delhi Rail Safety Incident Reporter</h1>
          <p className="text-sm text-slate-300 max-w-2xl mt-1">
            Citizens and track commuters can log geotagged track hazards. Reports are matched with satellite observations and verified web notices to elevate localized priority.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Submission Form */}
        <div className="lg:col-span-5 bg-[#1C2541] p-6 rounded-2xl border border-[#3A506B]/50 shadow-xl space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Camera className="w-4 h-4 text-purple-400" />
            <span>Log a Track Hazard</span>
          </h2>

          {isSuccess && (
            <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Report successfully pinned to Delhi corridor map!
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Target Corridor Segment</label>
              <select
                value={selectedSegmentId}
                onChange={(e) => setSelectedSegmentId(e.target.value)}
                className="w-full bg-[#0B132B] border border-[#3A506B]/60 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-purple-400"
              >
                {segments.map(seg => (
                  <option key={seg.id} value={seg.id}>
                    {seg.id} - {seg.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Hazard Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-[#0B132B] border border-[#3A506B]/60 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-purple-400"
              >
                <option value="Drainage / Track Waterlogging">Drainage / Track Waterlogging</option>
                <option value="Vegetation / Tree Overgrowth on OHE">Vegetation / Tree Overgrowth on OHE</option>
                <option value="River Water Level Surge">River Water Level Surge</option>
                <option value="Trackside Debris / Encroachment">Trackside Debris / Encroachment</option>
                <option value="Broken Culvert / Retaining Wall">Broken Culvert / Retaining Wall</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Observation Description</label>
              <textarea
                rows={3}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe visible hazard, water stagnation, or track obstruction..."
                className="w-full bg-[#0B132B] border border-[#3A506B]/60 rounded-xl px-3.5 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-purple-400"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Photo Evidence URL</label>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://..."
                className="w-full bg-[#0B132B] border border-[#3A506B]/60 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-purple-400"
              />
            </div>

            {imageUrl && (
              <div>
                <span className="block text-[11px] text-slate-400 mb-1">Photo Preview:</span>
                <img src={imageUrl} alt="Hazard preview" className="w-full h-32 object-cover rounded-xl border border-[#3A506B]/40" />
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2.5 bg-purple-500 hover:bg-purple-400 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-1.5 transition shadow-lg shadow-purple-500/20"
            >
              <Send className="w-4 h-4" />
              <span>Submit Geotagged Incident</span>
            </button>
          </form>
        </div>

        {/* Right: Active Reports Feed */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span>Recent Geotagged Incident Logs ({reports.length})</span>
            <span>Live Feed</span>
          </div>

          <div className="space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
            {reports.map((rep) => (
              <div
                key={rep.id}
                className="bg-[#1C2541] p-4 rounded-xl border border-[#3A506B]/40 shadow-md flex flex-col md:flex-row gap-4 justify-between"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center space-x-2 text-xs">
                    <span className="font-mono text-purple-400 font-bold bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20">
                      {rep.id}
                    </span>
                    <span className="font-semibold text-slate-200">{rep.category}</span>
                    <span className="text-[10px] text-slate-400">
                      • {new Date(rep.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">{rep.description}</p>
                  
                  <div className="flex items-center space-x-2 text-[11px] text-emerald-400 pt-1">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Linked to {rep.segment_id}</span>
                  </div>
                </div>

                {rep.image_url && (
                  <img
                    src={rep.image_url}
                    alt="Report"
                    className="w-24 h-24 object-cover rounded-xl border border-[#3A506B]/40 shrink-0 self-center md:self-start"
                  />
                )}
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};

