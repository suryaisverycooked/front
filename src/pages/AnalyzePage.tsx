import { useState, useRef, useCallback } from 'react';
import type { AIAnalysisResult } from '../types';
import { sendTelegramAlert } from '../utils/telegram';
import { sendRiskScore, isConnected, getRiskLevel } from '../utils/webserial';
import { getTelegramConfig } from '../utils/storage';
import { BANGALORE_LOCATIONS, ZONE_ORDER, findLocation } from '../data/bangaloreLocations';
import SeverityBadge from '../components/SeverityBadge';
import IRIGauge from '../components/IRIGauge';
import { analyzeInfrastructureImage } from '../utils/aiAnalysis';

interface AnalyzePageProps {
  onAnalysisComplete?: (
    result: AIAnalysisResult,
    imageBase64: string,
    imageUrl: string,
    location: string,
    lat: number,
    lng: number,
  ) => void;
  onHardwareTrigger?: (time: number, iri: number) => void;
}

type AnalysisState = 'idle' | 'loading' | 'done' | 'error';

function iriCardClass(iri: number) {
  if (iri >= 80) return 'bg-red-500/8 border-red-500/25';
  if (iri >= 60) return 'bg-orange-500/8 border-orange-500/25';
  if (iri >= 40) return 'bg-yellow-500/8 border-yellow-500/25';
  return 'bg-emerald-500/8 border-emerald-500/25';
}

function getHardwareIndicator(iri: number) {
  const level = getRiskLevel(iri);
  switch (level) {
    case 'CRITICAL':
      return { bgClass: 'bg-red-500/10 border-red-500/20', dotClass: 'bg-red-500', textClass: 'text-red-400', emoji: '🔴', message: 'Pico Kit Triggered — CRITICAL Alert (Siren Active)' };
    case 'HIGH':
      return { bgClass: 'bg-orange-500/10 border-orange-500/20', dotClass: 'bg-orange-500', textClass: 'text-orange-400', emoji: '🟠', message: 'Pico Kit Triggered — HIGH Risk Alert (Warning Mode)' };
    case 'MODERATE':
      return { bgClass: 'bg-yellow-500/10 border-yellow-500/20', dotClass: 'bg-yellow-500', textClass: 'text-yellow-400', emoji: '🟡', message: 'Pico Kit Triggered — MODERATE Risk Alert (Warning Mode)' };
    default:
      return { bgClass: 'bg-emerald-500/10 border-emerald-500/20', dotClass: 'bg-emerald-500', textClass: 'text-emerald-400', emoji: '🟢', message: 'Pico Kit Triggered — LOW Risk (Safe Mode)' };
  }
}

export default function AnalyzePage({ onAnalysisComplete, onHardwareTrigger }: AnalyzePageProps) {
  const [dragOver, setDragOver] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [imageBase64, setImageBase64] = useState('');
  const [analysisState, setAnalysisState] = useState<AnalysisState>('idle');
  const [result, setResult] = useState<AIAnalysisResult | null>(null);
  const [error, setError] = useState('');
  const [telegramSent, setTelegramSent] = useState(false);
  const [hardwareTriggered, setHardwareTriggered] = useState(false);
  const [triggeredIRI, setTriggeredIRI] = useState<number>(0);
  const [selectedLocationName, setSelectedLocationName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file (JPG, PNG, WebP, etc.)');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Image must be under 10 MB');
      return;
    }
    setError('');
    setResult(null);
    setAnalysisState('idle');
    setTelegramSent(false);
    setHardwareTriggered(false);
    setTriggeredIRI(0);
    setImageUrl(URL.createObjectURL(file));
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setImageBase64(e.target?.result as string);
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleAnalyze = async () => {
    if (!imageBase64) {
      setError('Please upload an image first.');
      return;
    }

    setAnalysisState('loading');
    setError('');
    setResult(null);
    setTelegramSent(false);
    setHardwareTriggered(false);
    setTriggeredIRI(0);

    try {
      const locObj = findLocation(selectedLocationName);
      const locName = selectedLocationName || 'Bangalore — Location not specified';
      const locLat = locObj?.lat ?? 12.9716;
      const locLng = locObj?.lng ?? 77.5946;

      // Updated to use new AI utility (works with MongoDB backend)
      const analysisResult = await analyzeInfrastructureImage(imageBase64, {
        lat: locLat,
        lng: locLng,
        address: locName,
      });

      setResult(analysisResult);
      setAnalysisState('done');

      onAnalysisComplete?.(analysisResult, imageBase64, imageUrl, locName, locLat, locLng);

      if (isConnected()) {
        const sent = await sendRiskScore(analysisResult.iri);
        if (sent) {
          setHardwareTriggered(true);
          setTriggeredIRI(analysisResult.iri);
          onHardwareTrigger?.(Date.now(), analysisResult.iri);
        }
      }

      if (analysisResult.iri >= 80) {
        const { botToken, chatId } = getTelegramConfig();
        if (botToken && chatId) {
          const sent = await sendTelegramAlert(
            botToken,
            chatId,
            locName,
            analysisResult.iri,
            analysisResult.damageType,
            analysisResult.severity
          );
          setTelegramSent(sent);
        }
      }
    } catch (err: unknown) {
      setAnalysisState('error');
      const msg = err instanceof Error ? err.message : 'Unknown error during analysis';
      setError(msg);
      console.error(err);
    }
  };

  const handleReset = () => {
    setImageFile(null);
    setImageUrl('');
    setImageBase64('');
    setResult(null);
    setAnalysisState('idle');
    setError('');
    setTelegramSent(false);
    setHardwareTriggered(false);
    setTriggeredIRI(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="min-h-screen bg-gray-950 pt-24 pb-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold mb-4">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-2" />
            </svg>
            AI Damage Detection
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white mb-3">
            Infrastructure Analysis
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl">
            Upload an infrastructure image and our AI backend will identify damage type,
            assess severity, and generate a risk score — no API key required.
          </p>
        </div>

        <div className="mb-8 p-4 rounded-2xl bg-blue-500/8 border border-blue-500/20 flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/25 flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </div>
          <div>
            <p className="text-blue-300 text-sm font-semibold">Powered by Cloud AI Backend</p>
            <p className="text-blue-400/70 text-xs mt-0.5">
              Analysis is handled by deployed backend at{' '}
              <code className="bg-blue-500/15 px-1.5 py-0.5 rounded text-blue-300 font-mono">
                https://anveshana-ai-backend.onrender.com
              </code>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">

          <div className="space-y-5">
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => !imageUrl && fileInputRef.current?.click()}
              className={[
                'relative rounded-2xl border-2 border-dashed transition-all duration-300',
                dragOver ? 'border-cyan-400 bg-cyan-500/8' :
                imageUrl ? 'border-gray-700 cursor-default' :
                'border-gray-700 hover:border-gray-600 bg-gray-900/40 cursor-pointer hover:bg-gray-900/60',
              ].join(' ')}
            >
              {imageUrl ? (
                <div className="relative">
                  <img src={imageUrl} alt="Upload preview" className="w-full h-72 object-cover rounded-2xl" />
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-950/60 via-transparent to-transparent rounded-2xl" />

                  <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
                    <div className="text-white text-sm font-medium truncate max-w-xs bg-gray-950/70 px-3 py-1 rounded-lg backdrop-blur-sm">
                      {imageFile?.name ?? 'Uploaded image'}
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); handleReset(); }}
                      className="w-8 h-8 rounded-lg bg-gray-950/80 backdrop-blur-sm border border-gray-700 flex items-center justify-center text-gray-400 hover:text-red-400 hover:border-red-500/40 transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {analysisState === 'loading' && (
                    <div className="absolute inset-0 rounded-2xl bg-gray-950/75 flex flex-col items-center justify-center gap-3 backdrop-blur-sm">
                      <div className="w-12 h-12 rounded-full border-4 border-gray-700 border-t-cyan-400 animate-spin" />
                      <p className="text-white font-semibold">Analyzing with AI…</p>
                      <p className="text-gray-400 text-sm">Sending to backend server</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 px-6">
                  <div className="w-16 h-16 rounded-2xl bg-gray-800 border border-gray-700 flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-gray-300 font-semibold mb-1">Drop image here or click to upload</p>
                  <p className="text-gray-500 text-sm">JPG, PNG, WebP · Max 10 MB</p>
                  <p className="text-gray-600 text-xs mt-3">Roads · Bridges · Buildings · Drainage · Sidewalks</p>
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                Location <span className="text-gray-600 font-normal">(pins exact spot on dashboard map)</span>
              </label>
              <select
                value={selectedLocationName}
                onChange={(e) => setSelectedLocationName(e.target.value)}
                className="w-full appearance-none bg-gray-900/80 border border-gray-700 rounded-xl px-4 py-3 pr-10 text-gray-200 text-sm focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/30 transition-all cursor-pointer"
              >
                <option value="" disabled className="text-gray-500 bg-gray-900">— Select a Bangalore area —</option>
                {ZONE_ORDER.map(({ zone, emoji }) => (
                  <optgroup key={zone} label={`${emoji}  ${zone}`} className="bg-gray-900 text-gray-300">
                    {BANGALORE_LOCATIONS.filter((l) => l.zone === zone).map((loc) => (
                      <option key={loc.name} value={loc.name} className="bg-gray-900 text-gray-200">
                        {loc.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            {error && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/25 flex items-start gap-3">
                <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-red-300 text-sm font-medium">Analysis Failed</p>
                  <p className="text-red-400/80 text-xs mt-0.5 leading-relaxed">{error}</p>
                </div>
              </div>
            )}

            <button
              onClick={handleAnalyze}
              disabled={!imageBase64 || analysisState === 'loading'}
              className="w-full py-4 rounded-xl font-semibold text-base transition-all duration-300 flex items-center justify-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:shadow-lg hover:shadow-cyan-500/25 hover:-translate-y-0.5 disabled:hover:translate-y-0 disabled:hover:shadow-none"
            >
              {analysisState === 'loading' ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Analyzing…
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Run AI Analysis
                </>
              )}
            </button>

            {(telegramSent || hardwareTriggered) && (
              <div className="space-y-2">
                {hardwareTriggered && (() => {
                  const indicator = getHardwareIndicator(triggeredIRI);
                  return (
                    <div className={`flex items-center gap-3 p-3 rounded-xl border ${indicator.bgClass}`}>
                      <span className={`w-2 h-2 rounded-full animate-pulse flex-shrink-0 ${indicator.dotClass}`} />
                      <span className={`text-sm font-medium ${indicator.textClass}`}>
                        {indicator.emoji} {indicator.message}
                      </span>
                    </div>
                  );
                })()}
                {telegramSent && (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                    <span className="w-2 h-2 bg-blue-400 rounded-full flex-shrink-0" />
                    <span className="text-blue-400 text-sm font-medium">📡 Telegram Alert Sent Successfully</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            {analysisState === 'idle' && !result && (
              <div className="h-full min-h-[400px] flex flex-col items-center justify-center rounded-2xl bg-gray-900/30 border border-gray-800 border-dashed">
                <div className="w-16 h-16 rounded-2xl bg-gray-800/60 flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-gray-500 font-medium">AI results will appear here</p>
                <p className="text-gray-600 text-sm mt-1">Upload an image and click Analyze</p>
              </div>
            )}

            {analysisState === 'error' && !result && (
              <div className="h-full min-h-[400px] flex flex-col items-center justify-center rounded-2xl bg-red-500/5 border border-red-500/20">
                <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-red-400 font-semibold">Analysis Error</p>
                <p className="text-gray-500 text-sm mt-1 text-center px-6">
                  Check that your backend is running and try again.
                </p>
              </div>
            )}

            {result && (
              <div className="space-y-5">
                <div className={`p-6 rounded-2xl border ${iriCardClass(result.iri)}`}>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-gray-400 text-sm mb-1">Infrastructure Risk Index</p>
                      <h3 className="text-white font-black text-xl">Risk Assessment</h3>
                    </div>
                    <SeverityBadge severity={result.severity} size="md" />
                  </div>
                  <div className="flex items-center justify-center py-2">
                    <IRIGauge value={result.iri} size="lg" showLabel />
                  </div>
                  {result.iri >= 80 && (
                    <div className="mt-4 flex items-center gap-2 p-3 rounded-lg bg-red-500/15 border border-red-500/25">
                      <span className="text-red-400 animate-pulse text-lg">🚨</span>
                      <span className="text-red-300 text-sm font-semibold">
                        CRITICAL THRESHOLD EXCEEDED — Immediate action required
                      </span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'Damage Type', value: result.damageType },
                    { label: 'Infrastructure', value: result.infrastructureType },
                    { label: 'Risk Score', value: `${result.iri} / 100` },
                    { label: 'AI Confidence', value: `${Math.round(result.confidence * 100)}%` },
                  ].map(({ label, value }) => (
                    <div key={label} className="p-4 rounded-xl bg-gray-900/60 border border-gray-800">
                      <p className="text-gray-500 text-xs uppercase tracking-wider mb-1.5">{label}</p>
                      <p className="text-white font-semibold text-sm">{value}</p>
                    </div>
                  ))}
                </div>

                <div className="p-5 rounded-xl bg-gray-900/60 border border-gray-800">
                  <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">AI Assessment</p>
                  <p className="text-gray-200 text-sm leading-relaxed">{result.description}</p>
                </div>

                <div className="p-5 rounded-xl bg-gray-900/60 border border-gray-800">
                  <p className="text-gray-500 text-xs uppercase tracking-wider mb-3">Recommendations</p>
                  <div className="space-y-3">
                    {result.recommendations?.map((rec, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-cyan-400 text-xs font-bold">{i + 1}</span>
                        </div>
                        <p className="text-gray-300 text-sm leading-relaxed">{rec}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}