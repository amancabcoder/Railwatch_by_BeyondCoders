import React from 'react';
import { X, Play, ShieldAlert, Sparkles, CheckSquare, Send, ArrowRight } from 'lucide-react';

interface PitchGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTab: (tab: string) => void;
}

export const PitchGuideModal: React.FC<PitchGuideModalProps> = ({
  isOpen,
  onClose,
  onSelectTab
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1200] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#1C2541] border border-amber-500/40 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#3A506B]/40 pb-3">
          <div className="flex items-center space-x-2">
            <span className="text-amber-400 font-bold text-base flex items-center gap-1.5">
              🏆 5-Minute Hackathon Demo Script
            </span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-300">
          Follow this structured narrative while pitching to judges. Click any step to immediately jump to the relevant screen:
        </p>

        {/* Steps */}
        <div className="space-y-3 text-xs">
          
          {/* Step 1 */}
          <div className="bg-[#0B132B] p-3.5 rounded-xl border border-[#3A506B]/40 space-y-1.5 hover:border-emerald-500/50 transition">
            <div className="flex items-center justify-between">
              <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center text-[10px]">1</span>
                The Hook: Delhi Railway Safety Problem (1 min)
              </span>
              <button
                onClick={() => { onSelectTab('map'); onClose(); }}
                className="text-emerald-400 hover:underline flex items-center gap-1 text-[11px]"
              >
                Go to GIS Map <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              <strong>Say:</strong> "Indian Railways operates high-density track corridors across Delhi. Monsoon flooding in the Yamuna basin and trackside vegetation pose severe derailment risks. Here on the RailWatch GIS map, each track segment is color-coded by real-time composite risk."
            </p>
          </div>

          {/* Step 2 */}
          <div className="bg-[#0B132B] p-3.5 rounded-xl border border-[#3A506B]/40 space-y-1.5 hover:border-teal-500/50 transition">
            <div className="flex items-center justify-between">
              <span className="font-bold text-teal-400 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-teal-500/20 text-teal-300 flex items-center justify-center text-[10px]">2</span>
                The Intelligence Layer: TinyFish Integration (1.5 min)
              </span>
              <button
                onClick={() => { onSelectTab('tinyfish'); onClose(); }}
                className="text-teal-400 hover:underline flex items-center gap-1 text-[11px]"
              >
                Go to TinyFish Hub <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              <strong>Say:</strong> "Crucial ground warnings—municipal drainage alerts, flood bulletins, and desilting notices—are published as unstructured web text. We integrate <strong>TinyFish</strong>: <code>TinySearch</code> to find live notices, <code>TinyFetch</code> for clean structured JSON, and <code>TinyAgent</code> for autonomous multi-step portal research."
            </p>
          </div>

          {/* Step 3 */}
          <div className="bg-[#0B132B] p-3.5 rounded-xl border border-[#3A506B]/40 space-y-1.5 hover:border-indigo-500/50 transition">
            <div className="flex items-center justify-between">
              <span className="font-bold text-indigo-400 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center text-[10px]">3</span>
                Human-in-the-Loop Verification Desk (1 min)
              </span>
              <button
                onClick={() => { onSelectTab('review'); onClose(); }}
                className="text-indigo-400 hover:underline flex items-center gap-1 text-[11px]"
              >
                Go to Review Desk <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              <strong>Say:</strong> "AI should never blindly shut down high-speed railway corridors based on a random webpage. RailWatch introduces a Human-in-the-Loop review queue. The operator verifies the bulletin side-by-side with the source and links it to Segment DEL-NDLS-01."
            </p>
          </div>

          {/* Step 4 */}
          <div className="bg-[#0B132B] p-3.5 rounded-xl border border-[#3A506B]/40 space-y-1.5 hover:border-red-500/50 transition">
            <div className="flex items-center justify-between">
              <span className="font-bold text-red-400 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-red-500/20 text-red-300 flex items-center justify-center text-[10px]">4</span>
                Explainable Risk Elevation & Field Dispatch (1.5 min)
              </span>
              <button
                onClick={() => { onSelectTab('inspections'); onClose(); }}
                className="text-red-400 hover:underline flex items-center gap-1 text-[11px]"
              >
                Go to Work Orders <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              <strong>Say:</strong> "Back on the map, the segment immediately elevates to Urgent Priority. The risk engine transparently explains the exact weight breakdown (satellite NDVI, river water level gauge, and verified TinyFish bulletins). With one click, the operator dispatches an official inspection work order to the Delhi P-Way squad."
            </p>
          </div>

        </div>

        <div className="pt-2 text-right">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#233256] hover:bg-[#3A506B] text-white rounded-xl text-xs font-semibold transition"
          >
            Close Guide
          </button>
        </div>

      </div>
    </div>
  );
};

