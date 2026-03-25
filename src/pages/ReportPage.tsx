import { useState, useRef, useCallback } from 'react';
import type { Report, AIAnalysisResult } from '../types';
import { analyzeInfrastructureImage } from '../utils/aiAnalysis';
import { sendTelegramAlert } from '../utils/telegram';
import { sendRiskScore, isConnected, getRiskLevel } from '../utils/webserial';
import { saveReport, generateId, getTelegramConfig } from '../utils/storage';
import SeverityBadge from '../components/SeverityBadge';

interface ReportPageProps {
  onReportSubmitted: (report: Report) => void;
  onHardwareTrigger?: (time: number, iri: number) => void;
}

const CITY_CENTER = { lat: 12.9716, lng: 77.5946 }; // Bangalore, India

function randomOffset(): number {
  return (Math.random() - 0.5) * 0.08;
}

// ─── Hardware signal indicator helper ──────────────────────────────────────────
function getHardwareIndicator(iri: number): {
  bgClass: string;
  textClass: string;
  message: string;
} {
  const level = getRiskLevel(iri);
  switch (level) {
    case 'CRITICAL':
      return {
        bgClass: 'bg-red-500/10 border-red-500/20',
        textClass: 'text-red-400',
        message: '🔴 Pico Kit Triggered — CRITICAL Alert (Siren Active)',
      };
    case 'HIGH':
      return {
        bgClass: 'bg-orange-500/10 border-orange-500/20',
        textClass: 'text-orange-400',
        message: '🟠 Pico Kit Triggered — HIGH Risk Alert',
      };
    case 'MODERATE':
      return {
        bgClass: 'bg-yellow-500/10 border-yellow-500/20',
        textClass: 'text-yellow-400',
        message: '🟡 Pico Kit Triggered — MODERATE Risk Alert',
      };
    case 'LOW':
    default:
      return {
        bgClass: 'bg-emerald-500/10 border-emerald-500/20',
        textClass: 'text-emerald-400',
        message: '🟢 Pico Kit Triggered — LOW Risk (Safe Mode)',
      };
  }
}

export default function ReportPage({
  onReportSubmitted,
  onHardwareTrigger,
}: ReportPageProps) {
  const [dragOver, setDragOver] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [imageBase64, setImageBase64] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [submitterName, setSubmitterName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AIAnalysisResult | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [hardwareTriggered, setHardwareTriggered] = useState(false);
  const [triggeredIRI, setTriggeredIRI] = useState<number>(0);

  // Typed ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file.');
      return;
    }
    setError('');
    setAnalysis(null);
    setHardwareTriggered(false);
    setTriggeredIRI(0);
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setImageBase64(e.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handleQuickAnalyze = async () => {
    if (!imageBase64) return;
    setIsAnalyzing(true);
    setError('');
    try {
      const result = await analyzeInfrastructureImage(imageBase64);
      setAnalysis(result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'AI analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!imageBase64) {
      setError('Please upload an image.');
      return;
    }
    if (!address.trim()) {
      setError('Please enter a location.');
      return;
    }
    if (!description.trim()) {
      setError('Please add a description.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setHardwareTriggered(false);
    setTriggeredIRI(0);

    let finalAnalysis = analysis;

    // Auto-analyze on submission if not already done
    if (!finalAnalysis && imageBase64) {
      try {
        setIsAnalyzing(true);
        finalAnalysis = await analyzeInfrastructureImage(imageBase64);
        setAnalysis(finalAnalysis);
      } catch {
        // proceed without analysis
      } finally {
        setIsAnalyzing(false);
      }
    }

    const report: Report = {
      id: generateId(),
      timestamp: Date.now(),
      location: {
        lat: CITY_CENTER.lat + randomOffset(),
        lng: CITY_CENTER.lng + randomOffset(),
        address: address.trim(),
      },
      description: description.trim(),
      imageUrl,
      imageBase64,
      analysis: finalAnalysis,
      status: 'Pending',
      submittedBy: submitterName.trim() || 'Anonymous',
    };

    // Save to MongoDB (via storage.ts)
    saveReport(report);

    // Hardware trigger for ALL risk levels
    if (finalAnalysis && isConnected()) {
      const sent = await sendRiskScore(finalAnalysis.iri);
      if (sent) {
        setHardwareTriggered(true);
        setTriggeredIRI(finalAnalysis.iri);
        onHardwareTrigger?.(Date.now(), finalAnalysis.iri);
      }
    }

    // Telegram alert only for critical (IRI >= 80)
    if (finalAnalysis && finalAnalysis.iri >= 80) {
      const { botToken, chatId } = getTelegramConfig();
      if (botToken && chatId) {
        await sendTelegramAlert(
          botToken,
          chatId,
          address,
          finalAnalysis.iri,
          finalAnalysis.damageType,
          finalAnalysis.severity
        );
      }
    }

    onReportSubmitted(report);
    setSubmitted(true);
    setIsSubmitting(false);
  };

  const handleNewReport = () => {
    setImageFile(null);
    setImageUrl('');
    setImageBase64('');
    setDescription('');
    setAddress('');
    setSubmitterName('');
    setAnalysis(null);
    setSubmitted(false);
    setError('');
    setHardwareTriggered(false);
    setTriggeredIRI(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (submitted) {
    const indicator = analysis ? getHardwareIndicator(analysis.iri) : null;

    return (
      <div className="min-h-screen bg-gray-950 pt-24 pb-16 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-full bg-emerald-500/15 border-2 border-emerald-500/30 flex items-center justify-center mx-auto mb-6">
            <svg
              className="w-10 h-10 text-emerald-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-black text-white mb-3">Report Submitted!</h2>
          <p className="text-gray-400 mb-2">
            Your infrastructure report has been logged and{' '}
            {analysis ? (
              <span>
                analyzed by AI with an IRI score of{' '}
                <span
                  className={`font-bold ${
                    analysis.iri >= 80
                      ? 'text-red-400'
                      : analysis.iri >= 60
                      ? 'text-orange-400'
                      : analysis.iri >= 40
                      ? 'text-yellow-400'
                      : 'text-emerald-400'
                  }`}
                >
                  {analysis.iri}/100
                </span>
              </span>
            ) : (
              'added to the monitoring dashboard'
            )}
            .
          </p>

          {/* Hardware trigger indicator */}
          {hardwareTriggered && indicator && (
            <div className={`mt-4 p-4 rounded-xl border ${indicator.bgClass}`}>
              <p className={`text-sm font-semibold ${indicator.textClass}`}>
                {indicator.message}
              </p>
            </div>
          )}

          {/* Critical alert extra notice */}
          {analysis && analysis.iri >= 80 && (
            <div className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
              <p className="text-red-400 text-sm font-semibold">
                🚨 Critical risk detected — Telegram alert sent
              </p>
            </div>
          )}

          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={handleNewReport}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold hover:shadow-lg hover:shadow-cyan-500/25 transition-all"
            >
              Submit Another Report
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 pt-24 pb-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-4">
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Citizen Report
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white mb-3">
            Report Infrastructure Issue
          </h1>
          <p className="text-gray-400 text-lg">
            Submit a photo and details of any infrastructure damage you've spotted. AI
            analysis will be run automatically.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Image Upload */}
          <div className="rounded-2xl bg-gray-900/60 border border-gray-800 p-6">
            <h2 className="text-white font-bold text-lg mb-4">1. Upload Photo</h2>

            {/* FIXED DIV: Types added, ref check added, syntax cleaned */}
            <div
              onDragOver={(e: React.DragEvent<HTMLDivElement>) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => {
                if (!imageUrl && fileInputRef.current) {
                  fileInputRef.current.click();
                }
              }}
              className={`relative rounded-xl border-2 border-dashed transition-all duration-200 ${
                dragOver
                  ? 'border-emerald-400 bg-emerald-500/5'
                  : imageUrl
                  ? 'border-gray-700'
                  : 'border-gray-700 hover:border-gray-600 cursor-pointer hover:bg-gray-800/40'
              }`}
            >
              {imageUrl ? (
                <div className="relative">
                  <img
                    src={imageUrl}
                    alt="Preview"
                    className="w-full h-56 object-cover rounded-xl"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-950/60 to-transparent rounded-xl" />
                  <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
                    <span className="text-white text-xs font-medium bg-gray-950/70 px-2.5 py-1 rounded-lg backdrop-blur-sm truncate max-w-xs">
                      {imageFile?.name}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setImageFile(null);
                        setImageUrl('');
                        setImageBase64('');
                        setAnalysis(null);
                        setHardwareTriggered(false);
                        setTriggeredIRI(0);
                        if (fileInputRef.current) {
                          fileInputRef.current.value = '';
                        }
                      }}
                      className="w-7 h-7 rounded-lg bg-gray-950/80 border border-gray-700 flex items-center justify-center text-gray-400 hover:text-red-400 transition-colors"
                    >
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center py-14 px-6">
                  <svg
                    className="w-10 h-10 text-gray-600 mb-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <p className="text-gray-400 font-medium text-sm">
                    Drop image here or click to browse
                  </p>
                  <p className="text-gray-600 text-xs mt-1">JPG, PNG, WebP • Max 10MB</p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) processFile(f);
                }}
              />
            </div>

            {/* Quick AI Analysis */}
            {imageBase64 && !analysis && (
              <button
                type="button"
                onClick={handleQuickAnalyze}
                disabled={isAnalyzing}
                className="mt-3 w-full py-2.5 rounded-xl border border-cyan-500/30 text-cyan-400 text-sm font-medium hover:bg-cyan-500/8 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {isAnalyzing ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
                    Running AI Analysis...
                  </>
                ) : (
                  <>
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                    Pre-analyze with AI (Optional)
                  </>
                )}
              </button>
            )}

            {/* Quick Analysis Result */}
            {analysis && (
              <div
                className={`mt-3 p-4 rounded-xl border ${
                  analysis.iri >= 80
                    ? 'bg-red-500/8 border-red-500/25'
                    : analysis.iri >= 60
                    ? 'bg-orange-500/8 border-orange-500/25'
                    : analysis.iri >= 40
                    ? 'bg-yellow-500/8 border-yellow-500/25'
                    : 'bg-emerald-500/8 border-emerald-500/25'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-white text-sm font-semibold">
                    AI Pre-Analysis Result
                  </p>
                  <SeverityBadge severity={analysis.severity} size="sm" />
                </div>
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>
                    <span className="text-gray-300">Damage:</span> {analysis.damageType}
                  </span>
                  <span>
                    <span className="text-gray-300">IRI:</span>{' '}
                    <span className="font-bold text-white">{analysis.iri}/100</span>
                  </span>
                </div>
                <p className="text-gray-500 text-xs mt-1.5 leading-relaxed">
                  {analysis.description.slice(0, 150)}...
                </p>

                {/* Risk level indicator */}
                <div className="mt-2 text-xs">
                  {analysis.iri >= 80 && (
                    <span className="text-red-400">🔴 CRITICAL — Will trigger siren</span>
                  )}
                  {analysis.iri >= 60 && analysis.iri < 80 && (
                    <span className="text-orange-400">
                      🟠 HIGH RISK — Will trigger warning
                    </span>
                  )}
                  {analysis.iri >= 40 && analysis.iri < 60 && (
                    <span className="text-yellow-400">
                      🟡 MODERATE — Will trigger warning
                    </span>
                  )}
                  {analysis.iri < 40 && (
                    <span className="text-emerald-400">
                      🟢 LOW RISK — Will show safe mode
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Location */}
          <div className="rounded-2xl bg-gray-900/60 border border-gray-800 p-6">
            <h2 className="text-white font-bold text-lg mb-4">2. Location</h2>
            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Street Address / Landmark *
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g., 123 Main Street, Brooklyn Bridge Approach"
                required
                className="w-full bg-gray-800/60 border border-gray-700 rounded-xl px-4 py-3 text-gray-200 text-sm placeholder-gray-600 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 transition-all"
              />
            </div>
          </div>

          {/* Description */}
          <div className="rounded-2xl bg-gray-900/60 border border-gray-800 p-6">
            <h2 className="text-white font-bold text-lg mb-4">3. Description</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Describe the damage *
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  placeholder="Describe what you see — size, location on the road/structure, any immediate hazards..."
                  required
                  className="w-full bg-gray-800/60 border border-gray-700 rounded-xl px-4 py-3 text-gray-200 text-sm placeholder-gray-600 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 transition-all resize-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Your Name (optional)
                </label>
                <input
                  type="text"
                  value={submitterName}
                  onChange={(e) => setSubmitterName(e.target.value)}
                  placeholder="Anonymous"
                  className="w-full bg-gray-800/60 border border-gray-700 rounded-xl px-4 py-3 text-gray-200 text-sm placeholder-gray-600 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/25 flex items-start gap-3">
              <svg
                className="w-5 h-5 text-red-400 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting || isAnalyzing}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-base transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/25 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex items-center justify-center gap-3"
          >
            {isSubmitting || isAnalyzing ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {isAnalyzing ? 'Analyzing...' : 'Submitting...'}
              </>
            ) : (
              <>
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Submit Report
              </>
            )}
          </button>

          <p className="text-gray-600 text-xs text-center">
            AI analysis runs automatically. Hardware kit responds to all risk levels:
            CRITICAL (siren), HIGH/MODERATE (warning), LOW (safe).
          </p>
        </form>
      </div>
    </div>
  );
}