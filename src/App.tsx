import { useState, useCallback } from 'react';
import type { NavSection, Report, AIAnalysisResult } from './types';
import { getReports, saveReport } from './utils/storage';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import AnalyzePage from './pages/AnalyzePage';
import ReportPage from './pages/ReportPage';
import DashboardPage from './pages/DashboardPage';
import HardwarePage from './pages/HardwarePage';

export default function App() {
  const [activeSection, setActiveSection] = useState<NavSection>('home');
  const [reports, setReports] = useState<Report[]>(() => getReports());

  // Hardware state (lifted to App level so all pages can see it)
  const [picoConnected, setPicoConnected] = useState(false);
  const [picoPortName, setPicoPortName] = useState('');
  const [lastTriggerTime, setLastTriggerTime] = useState<number | null>(null);
  const [lastRiskLevel, setLastRiskLevel] = useState<number | null>(null);

  const refreshReports = useCallback(() => {
    setReports(getReports());
  }, []);

  const handleNavigate = (section: NavSection) => {
    setActiveSection(section);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAnalysisComplete = (
    result: AIAnalysisResult,
    imageBase64: string,
    imageUrl: string,
    location: string,
    lat: number,
    lng: number,
  ) => {
    // Use the exact coordinates passed from the location selector
    const report: Report = {
      id: `ai_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: Date.now(),
      location: {
        lat,
        lng,
        address: location || 'Bangalore — Location not specified',
      },
      description: `AI Quick Analysis: ${result.damageType} detected`,
      imageUrl,
      imageBase64,
      analysis: result,
      status: 'Pending',
      submittedBy: 'AI Analysis Tool',
    };
    saveReport(report);
    refreshReports();
  };

  const handleReportSubmitted = (_report: Report) => {
    refreshReports();
  };

  const handleHardwareTrigger = (time: number, iri: number) => {
    setLastTriggerTime(time);
    setLastRiskLevel(iri);
  };

  const handleConnectionChange = (connected: boolean, portName: string) => {
    setPicoConnected(connected);
    setPicoPortName(portName);
  };

  const renderSection = () => {
    switch (activeSection) {
      case 'home':
        return (
          <HomePage
            onNavigate={handleNavigate}
            reportCount={reports.length}
          />
        );
      case 'analyze':
        return (
          <AnalyzePage
            onAnalysisComplete={handleAnalysisComplete}
            onHardwareTrigger={handleHardwareTrigger}
          />
        );
      case 'report':
        return (
          <ReportPage
            onReportSubmitted={handleReportSubmitted}
            onHardwareTrigger={handleHardwareTrigger}
          />
        );
      case 'dashboard':
        return (
          <DashboardPage
            reports={reports}
            onReportsChange={refreshReports}
          />
        );
      case 'hardware':
        return (
          <HardwarePage
            picoConnected={picoConnected}
            picoPortName={picoPortName}
            lastTriggerTime={lastTriggerTime}
            lastRiskLevel={lastRiskLevel}
            onConnectionChange={handleConnectionChange}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Hardware Status Bar (persistent, shown when connected) */}
      {picoConnected && (
        <div className="fixed top-16 left-0 right-0 z-40 bg-emerald-500/10 border-b border-emerald-500/20 px-4 py-1.5">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-emerald-400 font-semibold">Infrastructure Kit Connected</span>
              <span className="text-emerald-600 hidden sm:inline">— {picoPortName}</span>
            </div>
            {lastTriggerTime && (
              <span className="text-xs text-emerald-700">
                Last trigger: {new Date(lastTriggerTime).toLocaleTimeString()} • IRI {lastRiskLevel}
              </span>
            )}
          </div>
        </div>
      )}

      <Navbar
        activeSection={activeSection}
        onNavigate={handleNavigate}
        reportCount={reports.length}
      />

      <main className={picoConnected ? 'pt-8' : ''}>
        {renderSection()}
      </main>
    </div>
  );
}
