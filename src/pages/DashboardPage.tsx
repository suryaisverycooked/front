import { useState, useMemo } from 'react';
import type { Report } from '../types';
import InfrastructureMap from '../components/InfrastructureMap';
import SeverityBadge from '../components/SeverityBadge';
import IRIGauge from '../components/IRIGauge';
import { deleteReport } from '../utils/storage';

interface DashboardPageProps {
  reports: Report[];
  onReportsChange: () => void;
}

type FilterType = 'all' | 'critical' | 'high' | 'moderate' | 'low';

function getTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

export default function DashboardPage({ reports, onReportsChange }: DashboardPageProps) {
  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [activeTab, setActiveTab] = useState<'map' | 'list'>('map');

  const filteredReports = useMemo(() => {
    if (filter === 'all') return reports;
    return reports.filter(r => {
      if (!r.analysis) return filter === 'low';
      const iri = r.analysis.iri;
      if (filter === 'critical') return iri >= 80;
      if (filter === 'high') return iri >= 60 && iri < 80;
      if (filter === 'moderate') return iri >= 40 && iri < 60;
      return iri < 40;
    });
  }, [reports, filter]);

  const stats = useMemo(() => {
    const critical = reports.filter(r => (r.analysis?.iri ?? 0) >= 80).length;
    const high = reports.filter(r => { const iri = r.analysis?.iri ?? 0; return iri >= 60 && iri < 80; }).length;
    const moderate = reports.filter(r => { const iri = r.analysis?.iri ?? 0; return iri >= 40 && iri < 60; }).length;
    const low = reports.filter(r => (r.analysis?.iri ?? 0) < 40).length;
    const avgIri = reports.length > 0
      ? Math.round(reports.reduce((s, r) => s + (r.analysis?.iri ?? 0), 0) / reports.length)
      : 0;
    return { total: reports.length, critical, high, moderate, low, avgIri };
  }, [reports]);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteReport(id);
    onReportsChange();
    if (selectedReport?.id === id) setSelectedReport(null);
  };

  return (
    <div className="min-h-screen bg-gray-950 pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-semibold mb-4">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              Live Dashboard
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white mb-2">City Infrastructure Monitor</h1>
            <p className="text-gray-400">Real-time geospatial view of all infrastructure reports and risk levels</p>
          </div>
          <div className="text-right">
            <p className="text-gray-500 text-sm">{reports.length} total reports</p>
            <p className="text-gray-600 text-xs">Updated live</p>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {[
            { label: 'Total', value: stats.total, color: 'text-white', bg: 'bg-gray-800/60' },
            { label: 'Critical', value: stats.critical, color: 'text-red-400', bg: 'bg-red-500/8 border-red-500/15' },
            { label: 'High', value: stats.high, color: 'text-orange-400', bg: 'bg-orange-500/8 border-orange-500/15' },
            { label: 'Moderate', value: stats.moderate, color: 'text-yellow-400', bg: 'bg-yellow-500/8 border-yellow-500/15' },
            { label: 'Low', value: stats.low, color: 'text-emerald-400', bg: 'bg-emerald-500/8 border-emerald-500/15' },
            { label: 'Avg IRI', value: stats.avgIri, color: 'text-cyan-400', bg: 'bg-cyan-500/8 border-cyan-500/15' },
          ].map((stat) => (
            <div key={stat.label} className={`p-4 rounded-xl border border-gray-800 ${stat.bg} text-center`}>
              <div className={`text-2xl font-black ${stat.color}`}>{stat.value}</div>
              <div className="text-gray-500 text-xs mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Filter Row + Tab Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
          <div className="flex flex-wrap gap-2">
            {(['all', 'critical', 'high', 'moderate', 'low'] as FilterType[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                  filter === f
                    ? f === 'critical' ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                      : f === 'high' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                      : f === 'moderate' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                      : f === 'low' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-gray-700 text-white border border-gray-600'
                    : 'bg-gray-800/60 text-gray-400 border border-gray-700/50 hover:border-gray-600 hover:text-gray-200'
                }`}
              >
                {f === 'all' ? `All (${stats.total})` :
                  f === 'critical' ? `Critical (${stats.critical})` :
                  f === 'high' ? `High (${stats.high})` :
                  f === 'moderate' ? `Moderate (${stats.moderate})` :
                  `Low (${stats.low})`}
              </button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-2 bg-gray-800/60 rounded-lg p-1 border border-gray-700">
            <button
              onClick={() => setActiveTab('map')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${activeTab === 'map' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-gray-200'}`}
            >
              🗺 Map
            </button>
            <button
              onClick={() => setActiveTab('list')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${activeTab === 'list' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-gray-200'}`}
            >
              📋 List
            </button>
          </div>
        </div>

        {/* Main Content */}
        {reports.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 rounded-2xl bg-gray-900/30 border border-gray-800 border-dashed">
            <div className="w-16 h-16 rounded-2xl bg-gray-800/60 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </div>
            <p className="text-gray-400 font-semibold text-lg">No Reports Yet</p>
            <p className="text-gray-600 text-sm mt-2 text-center max-w-xs">
              Submit infrastructure reports or run AI analysis to see them appear on the dashboard map.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Map or List */}
            <div className="lg:col-span-2">
              {activeTab === 'map' ? (
                <div className="h-[520px] rounded-2xl overflow-hidden border border-gray-800">
                  <InfrastructureMap
                    reports={filteredReports}
                    onReportClick={setSelectedReport}
                  />
                </div>
              ) : (
                <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                  {filteredReports.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 text-sm">No reports match this filter</div>
                  ) : (
                    filteredReports.map((report) => (
                      <button
                        key={report.id}
                        onClick={() => setSelectedReport(report)}
                        className={`w-full text-left p-4 rounded-xl border transition-all duration-200 ${
                          selectedReport?.id === report.id
                            ? 'bg-gray-800/80 border-gray-600'
                            : 'bg-gray-900/60 border-gray-800 hover:border-gray-700 hover:bg-gray-800/40'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {report.imageUrl && (
                            <img src={report.imageUrl} alt="" className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <p className="text-white text-sm font-semibold truncate">{report.location.address}</p>
                              {report.analysis && <SeverityBadge severity={report.analysis.severity} size="sm" />}
                            </div>
                            <p className="text-gray-400 text-xs truncate">{report.description}</p>
                            <div className="flex items-center gap-3 mt-1.5">
                              {report.analysis && (
                                <span className="text-xs text-gray-500">IRI: <span className="font-bold text-gray-300">{report.analysis.iri}</span></span>
                              )}
                              <span className="text-xs text-gray-600">{getTimeAgo(report.timestamp)}</span>
                            </div>
                          </div>
                          <button
                            onClick={(e) => handleDelete(report.id, e)}
                            className="w-6 h-6 rounded flex items-center justify-center text-gray-600 hover:text-red-400 transition-colors flex-shrink-0"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Right Panel - Report Detail */}
            <div className="lg:col-span-1">
              {selectedReport ? (
                <div className="rounded-2xl bg-gray-900/60 border border-gray-800 overflow-hidden">
                  {/* Report image */}
                  {selectedReport.imageUrl && (
                    <div className="relative h-44">
                      <img src={selectedReport.imageUrl} alt="Report" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent" />
                      <button
                        onClick={() => setSelectedReport(null)}
                        className="absolute top-3 right-3 w-7 h-7 rounded-lg bg-gray-950/80 backdrop-blur-sm border border-gray-700 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  )}

                  <div className="p-5">
                    <div className="flex items-start justify-between gap-2 mb-4">
                      <div>
                        <h3 className="text-white font-bold text-sm">{selectedReport.location.address}</h3>
                        <p className="text-gray-500 text-xs mt-0.5">{getTimeAgo(selectedReport.timestamp)} • by {selectedReport.submittedBy}</p>
                      </div>
                      {selectedReport.analysis && (
                        <SeverityBadge severity={selectedReport.analysis.severity} size="sm" />
                      )}
                    </div>

                    {selectedReport.analysis ? (
                      <>
                        {/* IRI Gauge */}
                        <div className="flex justify-center mb-4">
                          <IRIGauge value={selectedReport.analysis.iri} size="md" showLabel={true} />
                        </div>

                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-2">
                            <div className="p-2.5 rounded-lg bg-gray-800/60">
                              <p className="text-gray-500 text-xs">Type</p>
                              <p className="text-gray-200 text-xs font-medium mt-0.5">{selectedReport.analysis.infrastructureType}</p>
                            </div>
                            <div className="p-2.5 rounded-lg bg-gray-800/60">
                              <p className="text-gray-500 text-xs">Damage</p>
                              <p className="text-gray-200 text-xs font-medium mt-0.5">{selectedReport.analysis.damageType}</p>
                            </div>
                          </div>

                          <div className="p-3 rounded-lg bg-gray-800/60">
                            <p className="text-gray-500 text-xs mb-1">Assessment</p>
                            <p className="text-gray-300 text-xs leading-relaxed">{selectedReport.analysis.description.slice(0, 200)}...</p>
                          </div>

                          <div className="p-3 rounded-lg bg-gray-800/60">
                            <p className="text-gray-500 text-xs mb-1.5">Description</p>
                            <p className="text-gray-300 text-xs leading-relaxed">{selectedReport.description}</p>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <span className={`w-2 h-2 rounded-full ${selectedReport.status === 'Pending' ? 'bg-yellow-400' : selectedReport.status === 'Resolved' ? 'bg-emerald-400' : 'bg-blue-400'}`} />
                              <span className="text-gray-400 text-xs">{selectedReport.status}</span>
                            </div>
                            <button
                              onClick={(e) => handleDelete(selectedReport.id, e)}
                              className="text-xs text-red-500/60 hover:text-red-400 transition-colors"
                            >
                              Delete Report
                            </button>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-6">
                        <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-2">
                          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-2" />
                          </svg>
                        </div>
                        <p className="text-gray-500 text-sm">No AI analysis</p>
                        <p className="text-gray-600 text-xs">Use the Analyze page to add AI results</p>
                        <p className="text-gray-400 text-sm mt-3 font-medium">{selectedReport.description}</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center py-16 rounded-2xl bg-gray-900/30 border border-gray-800 border-dashed">
                  <svg className="w-10 h-10 text-gray-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5" />
                  </svg>
                  <p className="text-gray-500 text-sm">Click a marker or report</p>
                  <p className="text-gray-600 text-xs mt-1">to view details</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
