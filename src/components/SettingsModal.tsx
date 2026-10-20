import React, { useState } from 'react';
import { X, Key, CheckCircle, Shield, AlertTriangle, Sparkles } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  hasApiKey: boolean;
  maskedKey: string | null;
  onSaveApiKey: (key: string) => Promise<void>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  hasApiKey,
  maskedKey,
  onSaveApiKey
}) => {
  const [keyInput, setKeyInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setStatusMsg(null);
    try {
      await onSaveApiKey(keyInput);
      setStatusMsg('TinyFish API Key updated successfully! Live mode activated.');
      setKeyInput('');
    } catch (err: any) {
      setStatusMsg('Failed to update API key: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = async () => {
    setIsSaving(true);
    try {
      await onSaveApiKey('');
      setStatusMsg('Key cleared. Operating in zero-latency hackathon demo mode.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1200] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#1C2541] border border-[#3A506B]/60 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#3A506B]/40 pb-3">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center border border-teal-500/30">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">TinyFish API Settings</h3>
              <p className="text-xs text-slate-400">Configure credentials for live web intelligence</p>
            </div>
          </div>

          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Status Pill */}
        <div className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
          hasApiKey
            ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
            : 'bg-amber-950/40 border-amber-500/40 text-amber-300'
        }`}>
          <div className="flex items-center space-x-2">
            <span className={`w-2 h-2 rounded-full ${hasApiKey ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <span className="font-semibold">
              {hasApiKey ? 'Active Key Connected' : 'Running in Zero-Latency Demo Mode'}
            </span>
          </div>
          {maskedKey && <span className="font-mono text-[11px] bg-[#0B132B] px-2 py-0.5 rounded">{maskedKey}</span>}
        </div>

        {statusMsg && (
          <div className="p-3 bg-teal-500/20 border border-teal-500/40 text-teal-300 rounded-xl text-xs font-medium">
            {statusMsg}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Enter TinyFish API Key
            </label>
            <input
              type="password"
              placeholder="Paste your TinyFish API key here..."
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              className="w-full bg-[#0B132B] border border-[#3A506B]/60 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-teal-400 transition"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Obtained from <a href="https://www.tinyfish.ai" target="_blank" rel="noreferrer" className="text-teal-400 hover:underline">tinyfish.ai dashboard</a>. Saved securely in local backend environment.
            </p>
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <button
              type="submit"
              disabled={isSaving || !keyInput.trim()}
              className="flex-1 py-2.5 bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-xs transition flex items-center justify-center space-x-1"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isSaving ? 'Updating...' : 'Save & Activate Key'}</span>
            </button>

            {hasApiKey && (
              <button
                type="button"
                onClick={handleClear}
                disabled={isSaving}
                className="py-2.5 px-3 bg-[#0B132B] hover:bg-red-950/40 text-slate-300 hover:text-red-300 border border-[#3A506B]/40 hover:border-red-500/40 rounded-xl text-xs transition"
              >
                Clear Key
              </button>
            )}
          </div>
        </form>

        <div className="bg-[#0B132B] p-3 rounded-xl border border-[#3A506B]/30 text-[11px] text-slate-400 space-y-1">
          <span className="font-semibold text-slate-300 block">Why Dual-Mode is Great for Hackathons:</span>
          <p>
            When pitching to judges, network glitches or rate limits can happen. RailWatch's dual-mode automatically ensures live queries query TinyFish when configured, while seamlessly protecting your demo with zero lag.
          </p>
        </div>

      </div>
    </div>
  );
};

