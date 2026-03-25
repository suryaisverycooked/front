import { useEffect, useRef } from 'react';
import type { Report } from '../types';

interface InfrastructureMapProps {
  reports: Report[];
  onReportClick?: (report: Report) => void;
}

function getMarkerColor(report: Report): string {
  if (!report.analysis) return '#6b7280';
  const iri = report.analysis.iri;
  if (iri >= 80) return '#ef4444'; // red - critical
  if (iri >= 60) return '#f97316'; // orange - high
  if (iri >= 40) return '#eab308'; // yellow - moderate
  return '#10b981'; // green - low
}

function createMarkerIcon(color: string, iri: number): string {
  const isCritical = iri >= 80;
  return `
    <div style="
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: ${color};
      border: 3px solid rgba(255,255,255,0.9);
      box-shadow: 0 2px 12px ${color}80, 0 0 0 0 ${color};
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 900;
      font-size: 11px;
      color: white;
      cursor: pointer;
      font-family: monospace;
      animation: ${isCritical ? 'markerPulse 1.5s ease-in-out infinite' : 'none'};
    ">${iri}</div>
  `;
}

export default function InfrastructureMap({ reports, onReportClick }: InfrastructureMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);

  useEffect(() => {
    if (!mapRef.current || leafletMapRef.current) return;

    // Dynamically import Leaflet
    const initMap = async () => {
      const L = (await import('leaflet')).default;

      // Fix default icon path issue with vite
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const map = L.map(mapRef.current!, {
        center: [12.9716, 77.5946], // Bangalore, India
        zoom: 12,
        zoomControl: true,
        scrollWheelZoom: true,
      });

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap contributors © CARTO',
        subdomains: 'abcd',
        maxZoom: 20,
      }).addTo(map);

      leafletMapRef.current = map;

      // Add style for pulse animation
      const style = document.createElement('style');
      style.textContent = `
        @keyframes markerPulse {
          0% { box-shadow: 0 2px 12px rgba(239,68,68,0.5), 0 0 0 0 rgba(239,68,68,0.4); }
          70% { box-shadow: 0 2px 12px rgba(239,68,68,0.5), 0 0 0 12px rgba(239,68,68,0); }
          100% { box-shadow: 0 2px 12px rgba(239,68,68,0.5), 0 0 0 0 rgba(239,68,68,0); }
        }
      `;
      document.head.appendChild(style);
    };

    initMap();

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!leafletMapRef.current) return;

    const updateMarkers = async () => {
      const L = (await import('leaflet')).default;
      const map = leafletMapRef.current!;

      // Clear existing markers
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];

      reports.forEach((report) => {
        const color = getMarkerColor(report);
        const iri = report.analysis?.iri ?? 0;

        const icon = L.divIcon({
          html: createMarkerIcon(color, iri),
          iconSize: [36, 36],
          iconAnchor: [18, 36],
          popupAnchor: [0, -38],
          className: '',
        });

        const marker = L.marker([report.location.lat, report.location.lng], { icon });

        const severity = report.analysis?.severity || 'Unknown';
        const damageType = report.analysis?.damageType || 'Not analyzed';
        const popupContent = `
          <div style="
            background: #111827;
            border: 1px solid #374151;
            border-radius: 12px;
            padding: 14px;
            min-width: 220px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            color: #f3f4f6;
          ">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
              <span style="font-weight:700;font-size:13px;color:#fff;">Infrastructure Report</span>
              <span style="
                background:${color}25;
                color:${color};
                border:1px solid ${color}40;
                padding:2px 8px;
                border-radius:999px;
                font-size:11px;
                font-weight:700;
              ">${severity}</span>
            </div>
            <div style="font-size:12px;color:#9ca3af;margin-bottom:6px;">
              📍 ${report.location.address}
            </div>
            <div style="font-size:12px;color:#9ca3af;margin-bottom:6px;">
              🔧 ${damageType}
            </div>
            <div style="display:flex;justify-content:space-between;margin-top:10px;padding-top:10px;border-top:1px solid #1f2937;">
              <span style="font-size:11px;color:#6b7280;">IRI Score</span>
              <span style="font-size:13px;font-weight:800;color:${color};">${iri}/100</span>
            </div>
            <div style="font-size:11px;color:#6b7280;margin-top:6px;">
              ${new Date(report.timestamp).toLocaleDateString()}
            </div>
          </div>
        `;

        marker.bindPopup(popupContent, {
          maxWidth: 260,
          className: 'custom-popup',
        });

        marker.on('click', () => {
          onReportClick?.(report);
        });

        marker.addTo(map);
        markersRef.current.push(marker);
      });

      // Fit bounds to markers if reports exist, otherwise stay centred on Bangalore
      if (reports.length > 0 && markersRef.current.length > 0) {
        const group = L.featureGroup(markersRef.current);
        map.fitBounds(group.getBounds().pad(0.2));
      } else {
        map.setView([12.9716, 77.5946], 12); // Bangalore, India
      }
    };

    updateMarkers();
  }, [reports, onReportClick]);

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden">
      <div ref={mapRef} className="w-full h-full" style={{ minHeight: '400px' }} />
      {/* Map overlay legend */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-gray-950/90 backdrop-blur-sm rounded-xl border border-gray-800 p-3">
        <p className="text-gray-500 text-xs font-medium mb-2 uppercase tracking-wider">Risk Level</p>
        <div className="space-y-1.5">
          {[
            { color: '#ef4444', label: 'Critical (≥80)' },
            { color: '#f97316', label: 'High (60–79)' },
            { color: '#eab308', label: 'Moderate (40–59)' },
            { color: '#10b981', label: 'Low (<40)' },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
              <span className="text-gray-400 text-xs">{label}</span>
            </div>
          ))}
        </div>
      </div>
      <style>{`
        .custom-popup .leaflet-popup-content-wrapper {
          background: transparent !important;
          border: none !important;
          padding: 0 !important;
          box-shadow: none !important;
        }
        .custom-popup .leaflet-popup-tip {
          background: #374151 !important;
        }
        .leaflet-popup-content {
          margin: 0 !important;
        }
        .leaflet-container {
          background: #0f172a;
        }
      `}</style>
    </div>
  );
}
