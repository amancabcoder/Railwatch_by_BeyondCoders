import React from 'react';
import { 
  ShieldAlert, 
  MapPin, 
  Search, 
  CheckSquare, 
  FileText, 
  Users, 
  Settings, 
  Activity,
  Layers,
  Sparkles,
  ScanSearch
} from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  pendingCount: number;
  hasApiKey: boolean;
  onOpenSettings: () => void;
  onOpenPitchGuide: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  pendingCount,
  hasApiKey,
  onOpenSettings,
  onOpenPitchGuide,
}) => {
  return (
    <header className="bg-[#1C2541]/90 backdrop-blur-md border-b border-[#3A506B]/50 sticky top-0 z-50 px-4 py-2.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        
        {/* Brand */}
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setCurrentTab('map')}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <ShieldAlert className="w-6 h-6 text-slate-950 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xl font-bold tracking-tight text-white">RailWatch</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                DELHI CORRIDOR
              </span>
            </div>
            <p className="text-xs text-slate-400 flex items-center space-x-1">
              <span>Decision Support</span>
              <span>•</span>
              <span className="text-teal-400 font-medium flex items-center gap-1">
                <Sparkles className="w-3 h-3 inline" /> Powered by TinyFish AI
              </span>
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center bg-[#0B132B]/80 p-1 rounded-xl border border-[#3A506B]/40 space-x-1">
          <button
            onClick={() => setCurrentTab('map')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
              currentTab === 'map'
                ? 'bg-emerald-500 text-slate-950 font-semibold shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-[#1C2541]'
            }`}
          >
            <MapPin className="w-4 h-4" />
            <span>GIS Map</span>
          </button>

          <button
            onClick={() => setCurrentTab('tinyfish')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
              currentTab === 'tinyfish'
                ? 'bg-teal-400 text-slate-950 font-semibold shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-[#1C2541]'
            }`}
          >
            <Search className="w-4 h-4" />
            <span>TinyFish Intel Hub</span>
          </button>

          <button
            onClick={() => setCurrentTab('review')}
            className={`relative flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
              currentTab === 'review'
                ? 'bg-indigo-500 text-white font-semibold shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-[#1C2541]'
            }`}
          >
            <CheckSquare className="w-4 h-4" />
            <span>Review Desk</span>
            {pendingCount > 0 && (
              <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[11px] font-bold bg-amber-500 text-slate-950">
                {pendingCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setCurrentTab('inspections')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
              currentTab === 'inspections'
                ? 'bg-sky-500 text-white font-semibold shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-[#1C2541]'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Work Orders</span>
          </button>

          <button
            onClick={() => setCurrentTab('citizen')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
              currentTab === 'citizen'
                ? 'bg-purple-500 text-white font-semibold shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-[#1C2541]'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Citizen Portal</span>
          </button>

          <button
            onClick={() => setCurrentTab('encroachment')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
              currentTab === 'encroachment'
                ? 'bg-amber-400 text-slate-950 font-semibold shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-[#1C2541]'
            }`}
          >
            <ScanSearch className="w-4 h-4" />
            <span>Aerial Analysis</span>
          </button>
        </nav>

        {/* Right Actions */}
        <div className="flex items-center space-x-2.5">
          {/* Hackathon Pitch Walkthrough Button */}
          <button
            onClick={onOpenPitchGuide}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-semibold hover:bg-amber-500/30 transition-colors"
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Pitch Demo Flow</span>
          </button>

          {/* TinyFish API Status & Settings */}
          <button
            onClick={onOpenSettings}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              hasApiKey
                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40 hover:bg-emerald-900/60'
                : 'bg-amber-950/60 text-amber-300 border-amber-500/40 hover:bg-amber-900/60'
            }`}
            title="Click to configure TinyFish API Key"
          >
            <span className={`w-2 h-2 rounded-full ${hasApiKey ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <span>{hasApiKey ? 'TinyFish Live' : 'Demo Mode'}</span>
            <Settings className="w-3.5 h-3.5 ml-1 text-slate-400" />
          </button>
        </div>

      </div>
    </header>
  );
};

