import React, { useState } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Segment, IntelligenceRecord, CitizenReport } from '../types';
import { 
  AlertTriangle, 
  Droplets, 
  Compass, 
  ShieldAlert, 
  ExternalLink,
  Layers,
  Train,
  Eye,
  CheckCircle2
} from 'lucide-react';

// Custom Map Marker Icons using Leaflet divIcon
const createCustomIcon = (bgColor: string, text: string) => {
  return L.divIcon({
    className: 'custom-div-icon',
    html: `
      <div style="background-color: ${bgColor}; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.6); color: white; font-size: 11px; font-weight: bold;">
        ${text}
      </div>
    `,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
};

const stationIcon = L.divIcon({
  className: 'station-div-icon',
  html: `
    <div style="background-color: #38BDF8; width: 14px; height: 14px; border-radius: 50%; border: 2px solid #0F172A; box-shadow: 0 0 6px #38BDF8;"></div>
  `,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const tinyfishIcon = L.divIcon({
  className: 'tinyfish-div-icon',
  html: `
    <div style="background: linear-gradient(135deg, #2DD4BF, #06B6D4); width: 22px; height: 22px; border-radius: 6px; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 0 12px rgba(6,182,212,0.8); color: black; font-weight: 800; font-size: 11px;">
      TF
    </div>
  `,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

const citizenIcon = L.divIcon({
  className: 'citizen-div-icon',
  html: `
    <div style="background-color: #A855F7; width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 0 10px rgba(168,85,247,0.7); color: white; font-size: 10px;">
      CIT
    </div>
  `,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

interface CorridorMapProps {
  segments: Segment[];
  selectedSegmentId: string | null;
  onSelectSegment: (id: string) => void;
  intelligenceRecords: IntelligenceRecord[];
  citizenReports: CitizenReport[];
}

export const CorridorMap: React.FC<CorridorMapProps> = ({
  segments,
  selectedSegmentId,
  onSelectSegment,
  intelligenceRecords,
  citizenReports
}) => {
  const [showStations, setShowStations] = useState(true);
  const [showTinyFishPins, setShowTinyFishPins] = useState(true);
  const [showCitizenPins, setShowCitizenPins] = useState(true);
  const [showRailwayOverlay, setShowRailwayOverlay] = useState(false);
  const [mapStyle, setMapStyle] = useState<'dark' | 'voyager' | 'osm'>('dark');

  // Delhi center
  const centerPosition: [number, number] = [28.632, 77.235];

  // Clean API key parameter for CARTO
  const rawKey = (((import.meta as any).env?.VITE_CARTO_API_KEY as string) || '').trim();
  const apiKeyParam = rawKey ? `?api_key=${rawKey}` : '';

  const getTileUrl = () => {
    if (mapStyle === 'voyager') {
      return `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png${apiKeyParam}`;
    }
    if (mapStyle === 'osm') {
      return 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    }
    return `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png${apiKeyParam}`;
  };

  const getSegmentColor = (status: string, isSelected: boolean) => {
    if (status === 'urgent') return '#EF4444'; // Red
    if (status === 'warning') return '#F59E0B'; // Amber
    return '#10B981'; // Green
  };

  const getSegmentWeight = (status: string, isSelected: boolean) => {
    if (isSelected) return 8;
    if (status === 'urgent') return 6;
    return 4;
  };

  return (
    <div className="relative w-full h-[calc(100vh-65px)] bg-[#0B132B] overflow-hidden">
      
      {/* Map Layer Controls Floating Bar */}
      <div className="absolute top-4 left-4 z-[1000] bg-[#1C2541]/95 backdrop-blur-md p-3.5 rounded-xl border border-[#3A506B]/50 shadow-2xl flex flex-col space-y-2.5 text-xs min-w-[210px]">
        <div className="flex items-center justify-between pb-2 border-b border-[#3A506B]/40 font-semibold text-slate-200">
          <div className="flex items-center space-x-1.5">
            <Layers className="w-4 h-4 text-emerald-400" />
            <span>Map Layers</span>
          </div>
          <span className="text-[10px] text-teal-400 font-mono">CARTO Pro</span>
        </div>

        {/* Basemap Style Switcher */}
        <div className="space-y-1">
          <span className="text-[10px] text-slate-400 uppercase font-semibold">Basemap Style</span>
          <div className="grid grid-cols-3 gap-1 bg-[#0B132B] p-1 rounded-lg border border-[#3A506B]/40 text-[11px] text-center">
            <button
              onClick={() => setMapStyle('dark')}
              className={`py-1 rounded font-medium transition ${
                mapStyle === 'dark' ? 'bg-teal-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Dark
            </button>
            <button
              onClick={() => setMapStyle('voyager')}
              className={`py-1 rounded font-medium transition ${
                mapStyle === 'voyager' ? 'bg-teal-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Voyager
            </button>
            <button
              onClick={() => setMapStyle('osm')}
              className={`py-1 rounded font-medium transition ${
                mapStyle === 'osm' ? 'bg-teal-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              OSM
            </button>
          </div>
        </div>
        
        <label className="flex items-center space-x-2 cursor-pointer text-slate-300 hover:text-white pt-1">
          <input
            type="checkbox"
            checked={showStations}
            onChange={(e) => setShowStations(e.target.checked)}
            className="rounded bg-[#0B132B] border-[#3A506B] text-emerald-500 focus:ring-0"
          />
          <span className="w-2.5 h-2.5 rounded-full bg-sky-400 inline-block" />
          <span>Stations & Junctions</span>
        </label>

        <label className="flex items-center space-x-2 cursor-pointer text-slate-300 hover:text-white">
          <input
            type="checkbox"
            checked={showTinyFishPins}
            onChange={(e) => setShowTinyFishPins(e.target.checked)}
            className="rounded bg-[#0B132B] border-[#3A506B] text-teal-400 focus:ring-0"
          />
          <span className="w-2.5 h-2.5 rounded bg-teal-400 inline-block" />
          <span>TinyFish Intel ({intelligenceRecords.filter(r => r.verification_status === 'verified').length})</span>
        </label>

        <label className="flex items-center space-x-2 cursor-pointer text-slate-300 hover:text-white">
          <input
            type="checkbox"
            checked={showCitizenPins}
            onChange={(e) => setShowCitizenPins(e.target.checked)}
            className="rounded bg-[#0B132B] border-[#3A506B] text-purple-400 focus:ring-0"
          />
          <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block" />
          <span>Citizen Reports ({citizenReports.length})</span>
        </label>

        <label className="flex items-center space-x-2 cursor-pointer text-slate-300 hover:text-white pt-1 border-t border-[#3A506B]/30">
          <input
            type="checkbox"
            checked={showRailwayOverlay}
            onChange={(e) => setShowRailwayOverlay(e.target.checked)}
            className="rounded bg-[#0B132B] border-[#3A506B] text-amber-400 focus:ring-0"
          />
          <span className="w-2.5 h-2.5 rounded bg-amber-400 inline-block" />
          <span>OpenRailwayMap Tracks</span>
        </label>
      </div>

      {/* Corridor Legend Floating Card */}
      <div className="absolute bottom-6 left-4 z-[1000] bg-[#1C2541]/90 backdrop-blur-md px-3.5 py-2.5 rounded-xl border border-[#3A506B]/50 shadow-xl flex items-center space-x-4 text-xs">
        <span className="text-slate-400 font-medium">Risk Status:</span>
        <div className="flex items-center space-x-1.5">
          <span className="w-3 h-3 rounded-full bg-red-500 shadow-sm shadow-red-500/50" />
          <span className="text-slate-200">Urgent (75+)</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="w-3 h-3 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50" />
          <span className="text-slate-200">Warning (45-74)</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
          <span className="text-slate-200">Monitored (0-44)</span>
        </div>
      </div>

      {/* Main Leaflet Map */}
      <MapContainer
        center={centerPosition}
        zoom={13}
        scrollWheelZoom={true}
        style={{ width: '100%', height: '100%' }}
      >
        <TileLayer
          key={mapStyle}
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url={getTileUrl()}
        />

        {/* Optional OpenRailwayMap Track Infrastructure Overlay */}
        {showRailwayOverlay && (
          <TileLayer
            attribution='&copy; <a href="https://www.openrailwaymap.org">OpenRailwayMap</a>'
            url="https://{s}.tiles.openrailwaymap.org/standard/{z}/{x}/{y}.png"
            opacity={0.8}
          />
        )}

        {/* Railway Corridor Tracks */}
        {segments.map((seg) => {
          const isSelected = seg.id === selectedSegmentId;
          const color = getSegmentColor(seg.status, isSelected);
          const weight = getSegmentWeight(seg.status, isSelected);

          return (
            <React.Fragment key={seg.id}>
              {/* Outer glow for selected or urgent track */}
              {(isSelected || seg.status === 'urgent') && (
                <Polyline
                  positions={seg.coordinates}
                  pathOptions={{
                    color: seg.status === 'urgent' ? '#EF4444' : '#38BDF8',
                    weight: weight + 6,
                    opacity: 0.35,
                    dashArray: isSelected ? '4 8' : undefined,
                  }}
                />
              )}

              <Polyline
                positions={seg.coordinates}
                pathOptions={{
                  color: color,
                  weight: weight,
                  opacity: 0.95,
                  dashArray: seg.status === 'urgent' ? undefined : undefined,
                }}
                eventHandlers={{
                  click: () => onSelectSegment(seg.id),
                }}
              >
                <Popup>
                  <div className="p-1 space-y-2 min-w-[200px]">
                    <div className="flex items-center justify-between border-b border-slate-700 pb-1.5">
                      <span className="font-bold text-sm text-white">{seg.name}</span>
                      <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                        seg.status === 'urgent' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                        seg.status === 'warning' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                        'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      }`}>
                        {seg.status}
                      </span>
                    </div>
                    <div className="text-xs text-slate-300 space-y-1">
                      <div className="flex justify-between">
                        <span>Risk Score:</span>
                        <span className="font-bold text-white">{seg.risk_score} / 100</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Yamuna / Flood Index:</span>
                        <span className="text-amber-300">{seg.metrics.flood_waterlogging_index}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Vegetation NDVI:</span>
                        <span className="text-emerald-300">{seg.metrics.vegetation_ndvi}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Length:</span>
                        <span>{seg.length_km} km</span>
                      </div>
                    </div>
                    <button
                      onClick={() => onSelectSegment(seg.id)}
                      className="w-full mt-2 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold rounded text-xs transition"
                    >
                      Inspect Corridor Details &rarr;
                    </button>
                  </div>
                </Popup>
              </Polyline>

              {/* Station Markers */}
              {showStations && seg.stations.map((station, sIdx) => (
                <Marker
                  key={`${seg.id}-stn-${sIdx}`}
                  position={station.coords}
                  icon={stationIcon}
                >
                  <Popup>
                    <div className="text-xs p-1">
                      <p className="font-bold text-white flex items-center gap-1">
                        <Train className="w-3.5 h-3.5 text-sky-400" />
                        {station.name}
                      </p>
                      <p className="text-slate-400 mt-0.5">Corridor: {seg.id}</p>
                      <p className="text-slate-400 capitalize">Type: {station.type}</p>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </React.Fragment>
          );
        })}

        {/* Verified TinyFish Intelligence Markers */}
        {showTinyFishPins && intelligenceRecords
          .filter(r => r.verification_status === 'verified')
          .map((rec) => {
            // Find linked segment coordinates to position marker
            const linkedSeg = segments.find(s => s.id === rec.segment_id);
            const markerPos: [number, number] = linkedSeg?.coordinates[1] || [28.632, 77.234];

            return (
              <Marker
                key={rec.record_id}
                position={markerPos}
                icon={tinyfishIcon}
              >
                <Popup>
                  <div className="text-xs p-1.5 max-w-[260px] space-y-1.5">
                    <div className="flex items-center space-x-1.5 text-teal-400 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>TinyFish Verified Web Intel</span>
                    </div>
                    <p className="font-bold text-white text-xs leading-snug">{rec.title}</p>
                    <p className="text-[11px] text-slate-300 line-clamp-3">{rec.summary}</p>
                    <div className="pt-1 border-t border-slate-700 flex items-center justify-between text-[10px] text-slate-400">
                      <span>{rec.publisher}</span>
                      <a
                        href={rec.source_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-teal-400 hover:underline flex items-center gap-0.5"
                      >
                        Source <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
        })}

        {/* Geotagged Citizen Reports */}
        {showCitizenPins && citizenReports.map((cit) => (
          <Marker
            key={cit.id}
            position={cit.coords}
            icon={citizenIcon}
          >
            <Popup>
              <div className="text-xs p-1 max-w-[240px] space-y-1.5">
                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Citizen Report: {cit.category}
                </span>
                <p className="text-slate-200 text-xs">{cit.description}</p>
                {cit.image_url && (
                  <img src={cit.image_url} alt="Track hazard" className="w-full h-24 object-cover rounded mt-1" />
                )}
                <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-700">
                  Logged: {new Date(cit.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

      </MapContainer>
    </div>
  );
};

