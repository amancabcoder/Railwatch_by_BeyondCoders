import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { CorridorMap } from './components/CorridorMap';
import { SegmentDrawer } from './components/SegmentDrawer';
import { TinyFishConsole } from './components/TinyFishConsole';
import { ReviewDesk } from './components/ReviewDesk';
import { WorkOrdersList } from './components/WorkOrdersList';
import { CitizenPortal } from './components/CitizenPortal';
import { SettingsModal } from './components/SettingsModal';
import { PitchGuideModal } from './components/PitchGuideModal';
import { Segment, IntelligenceRecord, CitizenReport, InspectionWorkOrder } from './types';

export default function App() {
  const [currentTab, setCurrentTab] = useState<'map' | 'tinyfish' | 'review' | 'inspections' | 'citizen' | 'encroachment'>('map');
  const [segments, setSegments] = useState<Segment[]>([]);
  const [intelligenceRecords, setIntelligenceRecords] = useState<IntelligenceRecord[]>([]);
  const [citizenReports, setCitizenReports] = useState<CitizenReport[]>([]);
  const [inspectionOrders, setInspectionOrders] = useState<InspectionWorkOrder[]>([]);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>('DEL-NDLS-01');
  
  // Settings & Pitch Guide
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPitchGuideOpen, setIsPitchGuideOpen] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [maskedKey, setMaskedKey] = useState<string | null>(null);

  // Fetch initial data
  const fetchData = async () => {
    try {
      const [segRes, intelRes, citRes, inspRes, confRes] = await Promise.all([
        fetch('/api/segments'),
        fetch('/api/intelligence'),
        fetch('/api/citizen-reports'),
        fetch('/api/inspections'),
        fetch('/api/config')
      ]);

      if (segRes.ok) setSegments(await segRes.json());
      if (intelRes.ok) setIntelligenceRecords(await intelRes.json());
      if (citRes.ok) setCitizenReports(await citRes.json());
      if (inspRes.ok) setInspectionOrders(await inspRes.json());
      if (confRes.ok) {
        const conf = await confRes.json();
        setHasApiKey(conf.has_api_key);
        setMaskedKey(conf.masked_key);
      }
    } catch (err) {
      console.error('Failed to load initial RailWatch data:', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const pendingCount = intelligenceRecords.filter(r => r.verification_status === 'pending').length;
  const selectedSegment = segments.find(s => s.id === selectedSegmentId) || null;

  // Handle Record Verification & Segment Link
  const handleVerifyRecord = async (data: { record_id: string; verification_status: string; segment_id?: string; notes?: string }) => {
    try {
      const resp = await fetch('/api/intelligence/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (resp.ok) {
        // Refresh segments and records to recalculate risk
        await fetchData();
      }
    } catch (err) {
      console.error('Error verifying record:', err);
    }
  };

  // Add Record to Review Queue from TinyFish
  const handleAddRecordToReview = async (record: Partial<IntelligenceRecord>) => {
    try {
      const resp = await fetch('/api/intelligence/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record)
      });
      if (resp.ok) {
        await fetchData();
      }
    } catch (err) {
      console.error('Error creating intelligence record:', err);
    }
  };

  // Dispatch Inspection
  const handleDispatchInspection = async (data: { segment_id: string; segment_name: string; priority: string; trigger_reason: string }) => {
    try {
      const resp = await fetch('/api/inspections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (resp.ok) {
        await fetchData();
      }
    } catch (err) {
      console.error('Error dispatching inspection:', err);
    }
  };

  // Citizen Report Submission
  const handleAddCitizenReport = async (report: Partial<CitizenReport>) => {
    try {
      const resp = await fetch('/api/citizen-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report)
      });
      if (resp.ok) {
        await fetchData();
      }
    } catch (err) {
      console.error('Error submitting citizen report:', err);
    }
  };

  // Save TinyFish API Key
  const handleSaveApiKey = async (key: string) => {
    const resp = await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: key })
    });
    if (resp.ok) {
      const data = await resp.json();
      setHasApiKey(data.has_api_key);
      setMaskedKey(data.masked_key);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B132B] text-slate-100 flex flex-col font-sans">
      
      {/* Top Navbar */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={(tab: any) => setCurrentTab(tab)}
        pendingCount={pendingCount}
        hasApiKey={hasApiKey}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenPitchGuide={() => setIsPitchGuideOpen(true)}
      />

      {/* Main Views */}
      <main className="flex-1 relative">
        {currentTab === 'map' && (
          <div className="relative w-full h-[calc(100vh-65px)]">
            <CorridorMap
              segments={segments}
              selectedSegmentId={selectedSegmentId}
              onSelectSegment={(id) => setSelectedSegmentId(id)}
              intelligenceRecords={intelligenceRecords}
              citizenReports={citizenReports}
            />

            {/* Segment Inspector Drawer */}
            {selectedSegmentId && (
              <SegmentDrawer
                segment={selectedSegment}
                onClose={() => setSelectedSegmentId(null)}
                intelligenceRecords={intelligenceRecords}
                citizenReports={citizenReports}
                onDispatchInspection={handleDispatchInspection}
              />
            )}
          </div>
        )}

        {currentTab === 'tinyfish' && (
          <TinyFishConsole
            onAddRecordToReview={handleAddRecordToReview}
            hasApiKey={hasApiKey}
            onOpenSettings={() => setIsSettingsOpen(true)}
          />
        )}

        {currentTab === 'review' && (
          <ReviewDesk
            records={intelligenceRecords}
            segments={segments}
            onVerifyRecord={handleVerifyRecord}
            onNavigateToMap={() => setCurrentTab('map')}
          />
        )}

        {currentTab === 'inspections' && (
          <WorkOrdersList orders={inspectionOrders} />
        )}

        {currentTab === 'encroachment' && (
          <section className="w-full h-[calc(100vh-65px)] bg-[#0B132B]">
            <iframe
              title="RailWatch Aerial Encroachment Analysis"
              src="/encroachment/"
              className="w-full h-full border-0"
            />
          </section>
        )}

        {currentTab === 'citizen' && (
          <CitizenPortal
            reports={citizenReports}
            segments={segments}
            onAddReport={handleAddCitizenReport}
          />
        )}
      </main>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        hasApiKey={hasApiKey}
        maskedKey={maskedKey}
        onSaveApiKey={handleSaveApiKey}
      />

      {/* Pitch Guide Modal */}
      <PitchGuideModal
        isOpen={isPitchGuideOpen}
        onClose={() => setIsPitchGuideOpen(false)}
        onSelectTab={(tab: any) => setCurrentTab(tab)}
      />

    </div>
  );
}

