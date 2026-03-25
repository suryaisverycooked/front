// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// AI Analysis utility — connects to AI-Agent backend
// Now integrated with MongoDB storage
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { analyzeImage, API_BASE, checkBackendHealth } from "./api";
import type { AIAnalysisResult, InfrastructureType, SeverityLevel } from "../types";

let backendAvailable = true;

// Check backend availability on load
checkBackendHealth()
  .then(({ server }) => {
    backendAvailable = server;
    if (!server) {
      console.warn("⚠️ AI backend is not available");
    }
  })
  .catch(() => {
    backendAvailable = false;
  });

// ─── Backend response shape ───────────────────────────────────────────────────
interface BackendResponse {
  success: boolean;
  caption?: string;
  damageType?: string;
  severity?: string;
  risk?: number;
  infrastructure?: string;
  confidence?: number;
  reportId?: string | null;
  error?: string;
  data?: any; // For nested responses
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normaliseSeverity(raw: string | undefined): SeverityLevel {
  if (!raw) return 'Low';
  const s = raw.trim().toLowerCase();
  if (s === 'critical' || s === 'catastrophic') return 'Critical';
  if (s === 'high' || s === 'severe' || s === 'serious') return 'High';
  if (s === 'moderate' || s === 'medium' || s === 'significant') return 'Moderate';
  return 'Low';
}

function inferInfrastructureType(text: string): InfrastructureType {
  const lower = (text ?? '').toLowerCase();
  if (lower.includes('bridge')) return 'Bridge';
  if (lower.includes('drain') || lower.includes('sewer') || lower.includes('gutter')) return 'Drainage';
  if (
    lower.includes('building') ||
    lower.includes('wall') ||
    lower.includes('facade') ||
    lower.includes('structure')
  )
    return 'Building';
  if (
    lower.includes('sidewalk') ||
    lower.includes('pavement') ||
    lower.includes('footpath') ||
    lower.includes('walkway')
  )
    return 'Sidewalk';
  if (
    lower.includes('road') ||
    lower.includes('street') ||
    lower.includes('highway') ||
    lower.includes('pothole') ||
    lower.includes('asphalt')
  )
    return 'Road';
  return 'Unknown';
}

function buildRecommendations(severity: SeverityLevel, damageType: string): string[] {
  const dt = (damageType ?? '').toLowerCase();

  const base: Record<SeverityLevel, string[]> = {
    Critical: [
      'Immediately restrict public access to the affected area',
      'Dispatch emergency maintenance crew within 24 hours',
      'File incident report with city infrastructure authority',
    ],
    High: [
      'Schedule priority repair within the next 72 hours',
      'Place warning signs and safety barriers around the damage',
      'Conduct a full structural inspection of the surrounding area',
    ],
    Moderate: [
      'Add to the scheduled maintenance queue within 2 weeks',
      'Monitor the site for further deterioration',
      'Document with photographs for ongoing tracking',
    ],
    Low: [
      'Log the issue for routine maintenance cycle',
      'Re-inspect during the next scheduled infrastructure audit',
      'No immediate action required — continue standard monitoring',
    ],
  };

  // Contextual overrides based on damage type
  if (dt.includes('pothole')) {
    return [
      'Apply temporary cold-mix asphalt patch immediately',
      'Schedule full road resurfacing for the affected segment',
      'Inspect surrounding road surface for sub-base failures',
    ];
  }
  if (dt.includes('crack') || dt.includes('fracture')) {
    return [
      'Apply crack sealing compound to prevent water ingress',
      'Monitor crack width progression with displacement sensors',
      'Commission structural engineer review if width exceeds 5mm',
    ];
  }
  if (dt.includes('corrosion') || dt.includes('rust')) {
    return [
      'Remove corroded sections and apply anti-rust treatment',
      'Conduct full corrosion mapping of the structure',
      'Schedule protective coating reapplication',
    ];
  }

  return base[severity];
}

function buildDescription(
  caption: string | undefined,
  damageType: string,
  severity: SeverityLevel,
  risk: number
): string {
  const cap = caption?.trim();
  if (cap && cap.length > 20) {
    return `${cap} Infrastructure Risk Index: ${risk}/100 — ${severity} severity detected.`;
  }
  return `AI analysis identified ${damageType} with ${severity} severity. The computed Infrastructure Risk Index (IRI) is ${risk}/100, indicating ${
    risk >= 80
      ? 'an immediate safety hazard requiring urgent intervention'
      : risk >= 60
      ? 'a significant concern that should be addressed promptly'
      : risk >= 40
      ? 'moderate degradation requiring scheduled maintenance'
      : 'early-stage wear suitable for routine monitoring'
  }.`;
}

// ─── Main Analysis Function ─────────────────────────────────────────────────

export async function analyzeInfrastructureImage(
  imageBase64: string,
  location?: { lat: number; lng: number; address?: string }
): Promise<AIAnalysisResult> {
  try {
    console.log("🧠 Sending image to AI backend...");

    // Check if backend is available first
    if (!backendAvailable) {
      throw new Error(
        `AI backend is not available. Make sure to run: cd AI-AGENT && node server.js`
      );
    }

    // Strip the data-URL prefix if present
    const base64Data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;

    // Use the analyzeImage function from api.ts (it already calls /api/analyze)
    const apiResponse = await analyzeImage(base64Data, location, false);
    const response = (apiResponse as BackendResponse).data || apiResponse;

    // Handle nested data responses
    const data = (response as BackendResponse).data || response as BackendResponse;

    if (!data.success && !data.damageType) {
      throw new Error(data.error ?? 'Backend analysis failed — unknown error');
    }

    console.log("✅ AI Analysis complete:", data);

    // ── Parse fields returned by the backend ──────────────────────────────────
    const severity = normaliseSeverity(data.severity);
    const risk = typeof data.risk === 'number' 
      ? Math.min(100, Math.max(0, Math.round(data.risk))) 
      : 0;
    const damageType = data.damageType?.trim() || 'Surface Deterioration';
    const infraType = data.infrastructure 
      ? (data.infrastructure as InfrastructureType)
      : inferInfrastructureType(`${data.damageType ?? ''} ${data.caption ?? ''}`);
    const description = buildDescription(data.caption, damageType, severity, risk);
    const recommendations = buildRecommendations(severity, damageType);

    // Confidence: use backend value or derive from risk
    const confidence = data.confidence ?? Math.min(0.98, 0.65 + risk / 300);

    return {
      damageType,
      infrastructureType: infraType,
      severity,
      iri: risk,
      description,
      recommendations,
      confidence,
      reportId: data.reportId || null,
    };

  } catch (error: any) {
    console.error("❌ AI Analysis failed:", error.message);

    // Mark backend as unavailable
    if (error.message.includes("Failed to fetch") || error.message.includes("NetworkError")) {
      backendAvailable = false;
    }

    throw error;
  }
}

// Legacy alias for backward compatibility
export async function runAIAnalysis(
  imageBase64: string,
  location?: { lat: number; lng: number; address?: string }
): Promise<AIAnalysisResult> {
  return analyzeInfrastructureImage(imageBase64, location);
}

// ─── Connection Testing ───────────────────────────────────────────────────────

export async function testAIConnection(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/analyze/test`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!res.ok) {
      backendAvailable = false;
      return false;
    }
    
    const data = await res.json();
    backendAvailable = data.success === true;
    return backendAvailable;
  } catch (error) {
    console.warn("⚠️ AI backend test failed:", error);
    backendAvailable = false;
    return false;
  }
}

export function getBackendStatus(): boolean {
  return backendAvailable;
}

export async function recheckBackend(): Promise<boolean> {
  try {
    const health = await checkBackendHealth();
    backendAvailable = health.server;
    return backendAvailable;
  } catch {
    backendAvailable = false;
    return false;
  }
}