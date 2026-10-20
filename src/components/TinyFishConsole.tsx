import React, { useState } from 'react';
import { 
  Search, 
  FileCode, 
  Bot, 
  Sparkles, 
  ExternalLink, 
  CheckCircle, 
  AlertCircle, 
  ArrowRight, 
  Play, 
  Terminal,
  Clock,
  ShieldCheck,
  SendHorizontal
} from 'lucide-react';
import { IntelligenceRecord } from '../types';

interface TinyFishConsoleProps {
  onAddRecordToReview: (record: Partial<IntelligenceRecord>) => void;
  hasApiKey: boolean;
  onOpenSettings: () => void;
}

export const TinyFishConsole: React.FC<TinyFishConsoleProps> = ({
  onAddRecordToReview,
  hasApiKey,
  onOpenSettings
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'search' | 'fetch' | 'agent'>('search');

  // Search State
  const [searchQuery, setSearchQuery] = useState('Delhi railway drainage flood public notice');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any>(null);

  // Fetch State
  const [fetchUrl, setFetchUrl] = useState('https://nr.indianrailways.gov.in/notices/delhi-drainage-monsoon-2026.html');
  const [isFetching, setIsFetching] = useState(false);
  const [fetchResult, setFetchResult] = useState<any>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Agent State
  const [agentUrl, setAgentUrl] = useState('https://indianrailways.gov.in/');
  const [agentGoal, setAgentGoal] = useState('Investigate public safety advisories for Delhi railway flood waterlogging and track desilting. Extract location mentions and safety directives.');
  const [isAgentRunning, setIsAgentRunning] = useState(false);
  const [agentLogs, setAgentLogs] = useState<Array<{ type: string; message: string; timestamp: string; step?: number }>>([]);
  const [agentResult, setAgentResult] = useState<any>(null);

  const [notification, setNotification] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  // Pre-configured quick search themes
  const quickQueries = [
    'Delhi railway drainage flood public notice',
    'Yamuna river water level railway bridge warning',
    'Sarai Rohilla railway land encroachment notice',
    'Delhi railway bridge maintenance engineering update'
  ];

  // Run TinySearch
  const handleRunSearch = async () => {
    setIsSearching(true);
    setSearchResults(null);
    try {
      const resp = await fetch('/api/tinyfish/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery })
      });
      const data = await resp.json();
      setSearchResults(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  // Run TinyFetch
  const handleRunFetch = async () => {
    setIsFetching(true);
    setFetchResult(null);
    setFetchError(null);
    try {
      const resp = await fetch('/api/tinyfish/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: fetchUrl })
      });
      const data = await resp.json();
      if (!resp.ok) {
        setFetchError(data.error || 'Failed to fetch page');
      } else {
        setFetchResult(data);
      }
    } catch (err: any) {
      setFetchError(err.message);
    } finally {
      setIsFetching(false);
    }
  };

  // Run TinyAgent (SSE Stream)
  const handleRunAgent = async () => {
    setIsAgentRunning(true);
    setAgentLogs([]);
    setAgentResult(null);

    try {
      const response = await fetch('/api/tinyfish/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: agentUrl, goal: agentGoal })
      });

      if (!response.body) return;
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      let buffer = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          const match = line.match(/^event: (.*)\ndata: (.*)$/s);
          if (match) {
            const event = match[1];
            try {
              const parsed = JSON.parse(match[2]);
              setAgentLogs(prev => [...prev, {
                type: event,
                message: parsed.message || JSON.stringify(parsed),
                timestamp: new Date().toLocaleTimeString(),
                step: parsed.step
              }]);
              if (parsed.result) {
                setAgentResult(parsed.result);
              }
            } catch (e) {
              // Raw text chunk
            }
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsAgentRunning(false);
    }
  };

  const handlePromoteToReview = (item: any) => {
    onAddRecordToReview({
      capability: activeSubTab === 'search' ? 'TinySearch' : activeSubTab === 'fetch' ? 'TinyFetch' : 'TinyAgent',
      title: item.title || 'Investigated Web Notice',
      source_url: item.url || item.canonical_url || fetchUrl,
      publisher: item.publisher || 'Public Source',
      published_at: item.published_date || item.published_at || new Date().toISOString(),
      location_text: item.location || 'Delhi Railway Corridor',
      topic: 'Infrastructure Safety',
      summary: item.snippet || item.extracted_content?.public_summary || item.summary || 'Extracted via TinyFish',
      source_type: 'official_notice'
    });
    showNotification('Record added to Human Review Desk! Head to Review Desk tab to verify.');
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#1C2541] via-[#233256] to-[#1C2541] p-6 rounded-2xl border border-teal-500/30 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-teal-400 font-mono text-xs uppercase tracking-wider font-semibold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> TinyFish Web Intelligence Layer
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
              Autonomous Ingestion
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white mt-1">Delhi Railway Web Intelligence Hub</h1>
          <p className="text-sm text-slate-300 max-w-2xl mt-1">
            Extract unstructured public railway notices, flood bulletins, and municipal drainage advisories from the live web and feed them into the RailWatch risk engine with full provenance citations.
          </p>
        </div>

        {/* API Status Card */}
        <div className="bg-[#0B132B]/80 px-4 py-3 rounded-xl border border-[#3A506B]/50 flex items-center space-x-3">
          <div className={`w-3 h-3 rounded-full ${hasApiKey ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
          <div className="text-xs">
            <p className="font-semibold text-slate-200">
              {hasApiKey ? 'TinyFish API Connected' : 'High-Fidelity Demo Simulation'}
            </p>
            <p className="text-slate-400 text-[11px]">
              {hasApiKey ? 'Live network extraction active' : 'Click settings to input live API key'}
            </p>
          </div>
          <button
            onClick={onOpenSettings}
            className="px-2.5 py-1 text-xs bg-[#233256] hover:bg-[#3A506B] text-slate-200 rounded font-medium transition"
          >
            Configure
          </button>
        </div>
      </div>

      {/* Floating Notification */}
      {notification && (
        <div className="fixed top-20 right-6 z-50 bg-emerald-500 text-slate-950 font-bold px-4 py-2.5 rounded-xl shadow-2xl flex items-center space-x-2 text-sm animate-bounce">
          <CheckCircle className="w-4 h-4" />
          <span>{notification}</span>
        </div>
      )}

      {/* Sub-Tabs: TinySearch | TinyFetch | TinyAgent */}
      <div className="flex items-center space-x-2 border-b border-[#3A506B]/40 pb-3">
        <button
          onClick={() => setActiveSubTab('search')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-semibold transition ${
            activeSubTab === 'search'
              ? 'bg-teal-500 text-slate-950 shadow-lg shadow-teal-500/20'
              : 'text-slate-400 hover:text-white hover:bg-[#1C2541]'
          }`}
        >
          <Search className="w-4 h-4" />
          <span>TinySearch (Web Discovery)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('fetch')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-semibold transition ${
            activeSubTab === 'fetch'
              ? 'bg-teal-500 text-slate-950 shadow-lg shadow-teal-500/20'
              : 'text-slate-400 hover:text-white hover:bg-[#1C2541]'
          }`}
        >
          <FileCode className="w-4 h-4" />
          <span>TinyFetch (Structured Page Ingestion)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('agent')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-semibold transition ${
            activeSubTab === 'agent'
              ? 'bg-teal-500 text-slate-950 shadow-lg shadow-teal-500/20'
              : 'text-slate-400 hover:text-white hover:bg-[#1C2541]'
          }`}
        >
          <Bot className="w-4 h-4" />
          <span>TinyAgent (Autonomous Portal Navigation)</span>
        </button>
      </div>

      {/* ----------------- TAB 1: TINYSEARCH ----------------- */}
      {activeSubTab === 'search' && (
        <div className="space-y-5">
          <div className="bg-[#1C2541] p-5 rounded-2xl border border-[#3A506B]/40 shadow-xl space-y-4">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
              Search Query for Delhi Railway Corridors
            </label>
            
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Enter Delhi railway topic, flood notice, or bridge update..."
                  className="w-full bg-[#0B132B] border border-[#3A506B]/60 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-400 transition"
                  onKeyDown={(e) => e.key === 'Enter' && handleRunSearch()}
                />
              </div>
              <button
                onClick={handleRunSearch}
                disabled={isSearching}
                className="px-6 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-sm rounded-xl transition flex items-center space-x-2 disabled:opacity-50"
              >
                {isSearching ? (
                  <>
                    <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    <span>Searching...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-slate-950" />
                    <span>Run TinySearch</span>
                  </>
                )}
              </button>
            </div>

            {/* Quick Themes Pills */}
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
              <span className="text-slate-400">Quick Themes:</span>
              {quickQueries.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => { setSearchQuery(q); }}
                  className="px-2.5 py-1 rounded-lg bg-[#0B132B] hover:bg-[#233256] text-slate-300 hover:text-teal-300 border border-[#3A506B]/40 transition text-xs"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Search Results Display */}
          {searchResults && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                <span>Discovered {searchResults.count || searchResults.results?.length || 0} public source records</span>
                <span className="text-teal-400 font-mono">Mode: {searchResults.mode}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(Array.isArray(searchResults.results) ? searchResults.results : [searchResults.results]).map((res: any, idx: number) => (
                  <div
                    key={idx}
                    className="bg-[#1C2541] p-5 rounded-2xl border border-[#3A506B]/40 hover:border-teal-500/50 transition shadow-lg flex flex-col justify-between space-y-3"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/20">
                          {res.publisher || 'Public Authority'}
                        </span>
                        <span className="text-slate-400 text-[11px]">
                          {res.published_date ? new Date(res.published_date).toLocaleDateString() : 'Live Bulletin'}
                        </span>
                      </div>

                      <h3 className="font-bold text-white text-sm leading-snug">{res.title}</h3>
                      <p className="text-xs text-slate-300 leading-relaxed">{res.snippet || res.summary}</p>
                    </div>

                    <div className="pt-3 border-t border-[#3A506B]/30 flex items-center justify-between text-xs">
                      <a
                        href={res.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-slate-400 hover:text-white flex items-center gap-1 transition text-xs"
                      >
                        <span>Visit Source</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>

                      <button
                        onClick={() => handlePromoteToReview(res)}
                        className="px-3 py-1.5 bg-indigo-500 hover:bg-indigo-400 text-white rounded-lg font-semibold flex items-center space-x-1.5 transition text-xs"
                      >
                        <span>Send to Review Desk</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ----------------- TAB 2: TINYFETCH ----------------- */}
      {activeSubTab === 'fetch' && (
        <div className="space-y-5">
          <div className="bg-[#1C2541] p-5 rounded-2xl border border-[#3A506B]/40 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Known Public Webpage URL (SSRF Protected)
              </label>
              <span className="text-[11px] text-teal-400 font-mono flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Domain Allowlist Active
              </span>
            </div>

            <div className="flex gap-2">
              <input
                type="url"
                value={fetchUrl}
                onChange={(e) => setFetchUrl(e.target.value)}
                placeholder="https://nr.indianrailways.gov.in/..."
                className="w-full bg-[#0B132B] border border-[#3A506B]/60 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-400 transition"
              />
              <button
                onClick={handleRunFetch}
                disabled={isFetching}
                className="px-6 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-sm rounded-xl transition flex items-center space-x-2 disabled:opacity-50 whitespace-nowrap"
              >
                {isFetching ? (
                  <>
                    <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    <span>Extracting...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-slate-950" />
                    <span>Run TinyFetch</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-[11px] text-slate-400">
              Allowed origins: official railways portals (<code>.gov.in</code>), Central Water Commission (<code>cwc.gov.in</code>), IMD, and accredited media.
            </p>
          </div>

          {fetchError && (
            <div className="p-4 bg-red-950/40 border border-red-500/40 rounded-xl text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{fetchError}</span>
            </div>
          )}

          {fetchResult && (
            <div className="bg-[#1C2541] p-6 rounded-2xl border border-teal-500/40 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-[#3A506B]/40 pb-3">
                <div>
                  <span className="text-[10px] uppercase font-bold text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/20">
                    Structured Ingestion Result
                  </span>
                  <h3 className="text-base font-bold text-white mt-1">
                    {fetchResult.extracted?.title || 'Extracted Document'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Publisher: {fetchResult.extracted?.publisher} • Published: {fetchResult.extracted?.published_at}
                  </p>
                </div>

                <button
                  onClick={() => handlePromoteToReview(fetchResult.extracted)}
                  className="px-4 py-2 bg-indigo-500 hover:bg-indigo-400 text-white rounded-xl font-bold text-xs flex items-center space-x-1.5 transition shadow-lg"
                >
                  <SendHorizontal className="w-3.5 h-3.5" />
                  <span>Send to Review Desk</span>
                </button>
              </div>

              {/* Parsed JSON schema preview */}
              <div className="bg-[#0B132B] p-4 rounded-xl border border-[#3A506B]/30 font-mono text-xs text-emerald-300 overflow-x-auto">
                <pre>{JSON.stringify(fetchResult.extracted, null, 2)}</pre>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ----------------- TAB 3: TINYAGENT ----------------- */}
      {activeSubTab === 'agent' && (
        <div className="space-y-5">
          <div className="bg-[#1C2541] p-5 rounded-2xl border border-[#3A506B]/40 shadow-xl space-y-4">
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Starting Public Website URL
                </label>
                <input
                  type="url"
                  value={agentUrl}
                  onChange={(e) => setAgentUrl(e.target.value)}
                  className="w-full bg-[#0B132B] border border-[#3A506B]/60 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-teal-400 transition"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Agent Investigation Goal (Prompt)
                </label>
                <textarea
                  rows={3}
                  value={agentGoal}
                  onChange={(e) => setAgentGoal(e.target.value)}
                  className="w-full bg-[#0B132B] border border-[#3A506B]/60 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-teal-400 transition"
                />
              </div>
            </div>

            <button
              onClick={handleRunAgent}
              disabled={isAgentRunning}
              className="px-6 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-sm rounded-xl transition flex items-center space-x-2 disabled:opacity-50"
            >
              {isAgentRunning ? (
                <>
                  <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Agent Exploring Public Portal...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-slate-950" />
                  <span>Launch TinyAgent Stream</span>
                </>
              )}
            </button>
          </div>

          {/* SSE Stream Logs Console */}
          <div className="bg-[#0B132B] rounded-2xl border border-[#3A506B]/50 shadow-2xl overflow-hidden font-mono text-xs">
            <div className="bg-[#1C2541] px-4 py-2.5 border-b border-[#3A506B]/40 flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-2 font-semibold">
                <Terminal className="w-4 h-4 text-teal-400" />
                <span>TinyAgent Real-Time Execution Log (SSE Stream)</span>
              </span>
              <span className="text-[10px] text-slate-400">Endpoint: /v1/automation/run-sse</span>
            </div>

            <div className="p-4 space-y-2 max-h-64 overflow-y-auto">
              {agentLogs.length === 0 && !isAgentRunning && (
                <p className="text-slate-500 italic">Click "Launch TinyAgent Stream" to begin multi-step autonomous browsing.</p>
              )}

              {agentLogs.map((log, idx) => (
                <div key={idx} className="flex items-start space-x-2 text-xs">
                  <span className="text-slate-500 shrink-0">[{log.timestamp}]</span>
                  <span className={`font-semibold shrink-0 uppercase text-[10px] px-1.5 rounded ${
                    log.type === 'action' ? 'bg-sky-500/20 text-sky-400' :
                    log.type === 'reasoning' ? 'bg-amber-500/20 text-amber-400' :
                    log.type === 'extraction' ? 'bg-emerald-500/20 text-emerald-400' :
                    'bg-slate-700 text-slate-300'
                  }`}>
                    {log.type}
                  </span>
                  <span className="text-slate-200">{log.message}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Agent Structured Final Result */}
          {agentResult && (
            <div className="bg-[#1C2541] p-5 rounded-2xl border border-teal-500/40 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-teal-400 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4" /> Agent Structured Finding
                </span>
                <button
                  onClick={() => handlePromoteToReview({
                    title: `Agent Finding: ${agentResult.suggested_corridor_id}`,
                    summary: agentResult.recommended_action,
                    location: 'Delhi Railway Track'
                  })}
                  className="px-3.5 py-1.5 bg-indigo-500 hover:bg-indigo-400 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5"
                >
                  <SendHorizontal className="w-3.5 h-3.5" />
                  <span>Send to Review Desk</span>
                </button>
              </div>

              <div className="bg-[#0B132B] p-3 rounded-xl border border-[#3A506B]/30 font-mono text-xs text-slate-200">
                <pre>{JSON.stringify(agentResult, null, 2)}</pre>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
};

