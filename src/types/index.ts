export type SeverityLevel = 'Low' | 'Moderate' | 'High' | 'Critical';
export type InfrastructureType = 'Road' | 'Bridge' | 'Drainage' | 'Building' | 'Sidewalk' | 'Unknown';
export type ReportStatus = 'Pending' | 'Under Review' | 'In Progress' | 'Resolved';

export interface AIAnalysisResult {
  damageType: string;
  infrastructureType: InfrastructureType;
  severity: SeverityLevel;
  iri: number; // Infrastructure Risk Index 0-100
  description: string;
  recommendations: string[];
  confidence: number;
  reportId?: string | null; // added for backend response
}

export interface Report {
  id: string;
  timestamp: number;
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  description: string;
  imageUrl: string;
  imageBase64?: string;
  analysis: AIAnalysisResult | null;
  status: ReportStatus;
  submittedBy: string;
}

export interface HardwareStatus {
  connected: boolean;
  port: string | null;
  lastTriggerTime: number | null;
  lastRiskLevel: number | null;
}

export interface TelegramConfig {
  botToken: string;
  chatId: string;
}

export type NavSection = 'home' | 'analyze' | 'report' | 'dashboard' | 'hardware';