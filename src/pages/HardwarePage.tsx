import { useState } from 'react';
import {
  connectToPico,
  disconnectFromPico,
  isWebSerialSupported,
  sendTestSignal,
} from '../utils/webserial';
import { saveTelegramConfig, getTelegramConfig } from '../utils/storage';

interface HardwarePageProps {
  picoConnected: boolean;
  picoPortName: string;
  lastTriggerTime: number | null;
  lastRiskLevel: number | null;
  onConnectionChange: (connected: boolean, portName: string) => void;
}

export default function HardwarePage({
  picoConnected,
  picoPortName,
  lastTriggerTime,
  lastRiskLevel,
  onConnectionChange,
}: HardwarePageProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectError, setConnectError] = useState('');
  const [testSent, setTestSent] = useState(false);
  const [tgToken, setTgToken] = useState(getTelegramConfig().botToken);
  const [tgChatId, setTgChatId] = useState(getTelegramConfig().chatId);
  const [configSaved, setConfigSaved] = useState(false);

  const handleConnect = async () => {
    setIsConnecting(true);
    setConnectError('');
    const result = await connectToPico();
    setIsConnecting(false);
    if (result.success) {
      onConnectionChange(true, result.portName);
    } else {
      setConnectError(result.error || 'Connection failed');
    }
  };

  const handleDisconnect = async () => {
    await disconnectFromPico();
    onConnectionChange(false, '');
  };

  const handleTestTrigger = async () => {
    if (!picoConnected) return;
    setTestSent(false);
    const sent = await sendTestSignal();
    setTestSent(sent);
    setTimeout(() => setTestSent(false), 3000);
  };

  const handleSaveConfig = () => {
    saveTelegramConfig(tgToken, tgChatId);
    setConfigSaved(true);
    setTimeout(() => setConfigSaved(false), 2500);
  };

  const webSerialSupported = isWebSerialSupported();

  const formatTime = (ts: number | null) => {
    if (!ts) return 'Never';
    return new Date(ts).toLocaleString();
  };

  return (
    <div className="min-h-screen bg-gray-950 pt-24 pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold mb-4">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
            </svg>
            Infrastructure Kit
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white mb-3">Hardware & Configuration</h1>
          <p className="text-gray-400 text-lg">
            Connect the Raspberry Pi Pico infrastructure kit, configure API tokens, and manage alert settings.
          </p>
        </div>

        <div className="space-y-6">
          {/* Pico Status Card */}
          <div className="rounded-2xl bg-gray-900/60 border border-gray-800 overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-800">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${picoConnected ? 'bg-emerald-500/15 border border-emerald-500/25' : 'bg-gray-800 border border-gray-700'}`}>
                  <svg className={`w-5 h-5 ${picoConnected ? 'text-emerald-400' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-white font-bold text-lg">Infrastructure Kit Status</h2>
                  <p className="text-gray-500 text-sm">Raspberry Pi Pico via WebSerial</p>
                </div>
              </div>
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-semibold ${picoConnected ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' : 'bg-gray-800/60 border-gray-700 text-gray-400'}`}>
                <span className={`w-2 h-2 rounded-full ${picoConnected ? 'bg-emerald-400 animate-pulse' : 'bg-gray-600'}`} />
                {picoConnected ? 'Connected' : 'Disconnected'}
              </div>
            </div>

            <div className="p-6">
              {/* Status Details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="p-4 rounded-xl bg-gray-800/60 border border-gray-700">
                  <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Status</p>
                  <p className={`font-bold text-sm ${picoConnected ? 'text-emerald-400' : 'text-gray-400'}`}>
                    {picoConnected ? '🟢 Connected' : '⚫ Not Connected'}
                  </p>
                  {picoConnected && picoPortName && (
                    <p className="text-gray-600 text-xs mt-1 truncate">{picoPortName}</p>
                  )}
                </div>
                <div className="p-4 rounded-xl bg-gray-800/60 border border-gray-700">
                  <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Last Trigger</p>
                  <p className="text-gray-200 font-semibold text-sm">{formatTime(lastTriggerTime)}</p>
                </div>
                <div className="p-4 rounded-xl bg-gray-800/60 border border-gray-700">
                  <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Last Risk Level</p>
                  <p className={`font-bold text-sm ${lastRiskLevel !== null && lastRiskLevel >= 80 ? 'text-red-400' : lastRiskLevel !== null && lastRiskLevel >= 60 ? 'text-orange-400' : 'text-gray-400'}`}>
                    {lastRiskLevel !== null ? `${lastRiskLevel}/100` : 'N/A'}
                  </p>
                </div>
              </div>

              {/* Connection Actions */}
              {!webSerialSupported ? (
                <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-start gap-3">
                  <svg className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <p className="text-yellow-400 font-semibold text-sm">WebSerial Not Supported</p>
                    <p className="text-yellow-300/70 text-xs mt-1">
                      Please use Google Chrome or Microsoft Edge browser to use the hardware connection feature.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-3">
                  {!picoConnected ? (
                    <button
                      onClick={handleConnect}
                      disabled={isConnecting}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 text-white font-semibold text-sm hover:bg-emerald-400 transition-all disabled:opacity-50"
                    >
                      {isConnecting ? (
                        <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Connecting...</>
                      ) : (
                        <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg> Connect Infrastructure Kit</>
                      )}
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={handleDisconnect}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-500/15 border border-red-500/25 text-red-400 font-semibold text-sm hover:bg-red-500/25 transition-all"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Disconnect
                      </button>
                      <button
                        onClick={handleTestTrigger}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-500/15 border border-orange-500/25 text-orange-400 font-semibold text-sm hover:bg-orange-500/25 transition-all"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Test Critical Signal
                      </button>
                      {testSent && (
                        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-semibold">
                          🔴 CRITICAL signal sent!
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {connectError && (
                <div className="mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  ⚠️ {connectError}
                </div>
              )}
            </div>
          </div>

          {/* Pico Behavior Info */}
          <div className="rounded-2xl bg-gray-900/60 border border-gray-800 p-6">
            <h2 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Pico Kit Behavior
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { state: 'SAFE Mode', color: 'emerald', desc: 'Default state — Green LED ON, monitoring incoming signals from the system' },
                { state: 'CRITICAL Received', color: 'red', desc: 'Green LED OFF → Red LED flickers → Buzzer siren → 8888 on display' },
                { state: 'Trigger Logic', color: 'orange', desc: 'Signal sent ONLY when IRI ≥ 80. One signal per detection. Auto-reset after 10s.' },
                { state: 'Connection', color: 'blue', desc: 'WebSerial at 115200 baud. Disconnect handled gracefully with state preserved.' },
              ].map((item) => (
                <div key={item.state} className={`p-4 rounded-xl bg-${item.color}-500/8 border border-${item.color}-500/15`}>
                  <p className={`font-bold text-sm text-${item.color}-400 mb-1`}>{item.state}</p>
                  <p className="text-gray-400 text-xs leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* API Configuration */}
          <div className="rounded-2xl bg-gray-900/60 border border-gray-800 p-6">
            <h2 className="text-white font-bold text-lg mb-2 flex items-center gap-2">
              <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              API Configuration
            </h2>
            <p className="text-gray-500 text-sm mb-5">Configure your Telegram bot token to receive high-risk infrastructure alerts automatically.</p>

            <div className="space-y-5">
              {/* Backend notice */}
              <div className="p-4 rounded-xl bg-blue-500/8 border border-blue-500/20 flex items-start gap-3">
                <svg className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-blue-300 text-sm font-semibold">AI Backend Connected</p>
                  <p className="text-blue-400/70 text-xs mt-0.5 leading-relaxed">
                    Image analysis is handled by your local backend at{' '}
                    <code className="bg-blue-500/15 px-1 rounded font-mono text-blue-300">http://localhost:5000/analyze</code>.
                    No API key is required on the frontend.
                  </p>
                </div>
              </div>

              {/* Telegram */}
              <div className="p-4 rounded-xl bg-gray-800/40 border border-gray-700 space-y-4">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248-1.97 9.29c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.931z" />
                  </svg>
                  <p className="text-gray-300 font-semibold text-sm">Telegram Bot Alerts</p>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Bot Token
                    <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" className="ml-2 text-blue-400 hover:text-blue-300">Get from @BotFather →</a>
                  </label>
                  <input
                    type="password"
                    value={tgToken}
                    onChange={(e) => setTgToken(e.target.value)}
                    placeholder="123456789:ABCDefGHIjklMNOpqrSTUvwxYZ"
                    className="w-full bg-gray-900/60 border border-gray-700 rounded-xl px-4 py-2.5 text-gray-200 text-sm font-mono placeholder-gray-600 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Chat ID
                    <a href="https://t.me/userinfobot" target="_blank" rel="noreferrer" className="ml-2 text-blue-400 hover:text-blue-300">Find your Chat ID →</a>
                  </label>
                  <input
                    type="text"
                    value={tgChatId}
                    onChange={(e) => setTgChatId(e.target.value)}
                    placeholder="-100123456789 or @yourchannel"
                    className="w-full bg-gray-900/60 border border-gray-700 rounded-xl px-4 py-2.5 text-gray-200 text-sm font-mono placeholder-gray-600 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 transition-all"
                  />
                </div>
              </div>

              {/* Save Button */}
              <button
                onClick={handleSaveConfig}
                className={`w-full py-3 rounded-xl font-semibold text-sm transition-all duration-300 flex items-center justify-center gap-2 ${
                  configSaved
                    ? 'bg-emerald-500/15 border border-emerald-500/25 text-emerald-400'
                    : 'bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:shadow-lg hover:shadow-violet-500/25 hover:-translate-y-0.5'
                }`}
              >
                {configSaved ? (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Configuration Saved!
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                    </svg>
                    Save Configuration
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Alert Thresholds Info */}
          <div className="rounded-2xl bg-gray-900/60 border border-gray-800 p-6">
            <h2 className="text-white font-bold text-lg mb-4">Alert Thresholds</h2>
            <div className="space-y-3">
              {[
                { range: 'IRI 80–100', label: 'CRITICAL', desc: 'Triggers Pico hardware alert + Telegram notification', color: 'red', action: '🔴 Pico siren + 📡 Telegram' },
                { range: 'IRI 60–79', label: 'HIGH', desc: 'Logged on dashboard, no hardware trigger', color: 'orange', action: '📊 Dashboard only' },
                { range: 'IRI 40–59', label: 'MODERATE', desc: 'Visible on map with yellow marker', color: 'yellow', action: '🗺️ Map marker' },
                { range: 'IRI 0–39', label: 'LOW', desc: 'Green marker, standard monitoring', color: 'emerald', action: '✅ Standard log' },
              ].map((t) => (
                <div key={t.range} className={`flex items-center gap-4 p-4 rounded-xl bg-${t.color}-500/6 border border-${t.color}-500/15`}>
                  <div className={`flex-shrink-0 text-center w-20 py-1.5 rounded-lg bg-${t.color}-500/15`}>
                    <p className={`text-${t.color}-400 font-black text-xs`}>{t.label}</p>
                    <p className="text-gray-500 text-xs mt-0.5">{t.range}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-300 text-sm">{t.desc}</p>
                  </div>
                  <div className={`flex-shrink-0 text-${t.color}-400 text-xs font-medium text-right`}>
                    {t.action}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}