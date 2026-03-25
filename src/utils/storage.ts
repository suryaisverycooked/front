// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Storage utility — NOW uses MongoDB via API
// Falls back to localStorage if backend is down
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import type { Report } from "../types";
import {
  fetchReports,
  createReport as apiCreateReport,
  deleteReport as apiDeleteReport,
  deleteAllReports as apiDeleteAllReports,
  updateReport as apiUpdateReport,
  checkBackendHealth,
} from "./api";

const REPORTS_KEY = 'invisible_infra_reports';
const HF_TOKEN_KEY = 'invisible_infra_hf_token';
const TG_TOKEN_KEY = 'invisible_infra_tg_token';
const TG_CHAT_KEY = 'invisible_infra_tg_chat';

let useDatabase = true; // Will be set based on backend availability

// Check if backend is available on startup
checkBackendHealth()
  .then(({ server, database }) => {
    useDatabase = server && database;
    if (useDatabase) {
      console.log("✅ Connected to database — reports will persist");
      // Migrate any localStorage reports to database
      migrateLocalStorageToDB();
    } else {
      console.warn("⚠️ Backend/DB unavailable — using localStorage fallback");
    }
  })
  .catch(() => {
    useDatabase = false;
    console.warn("⚠️ Backend unreachable — using localStorage fallback");
  });

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GET REPORTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export function getReports(): Report[] {
  // Synchronous fallback (localStorage)
  try {
    const raw = localStorage.getItem(REPORTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// Async version that tries DB first
export async function getReportsAsync(): Promise<Report[]> {
  if (useDatabase) {
    try {
      const response = await fetchReports({ limit: 500 });
      const reports: Report[] = (response.data as Report[]) || [];

      // Also cache in localStorage as backup
      localStorage.setItem(REPORTS_KEY, JSON.stringify(reports));

      return reports;
    } catch (error) {
      console.warn("⚠️ DB fetch failed, using localStorage");
    }
  }

  return getReports();
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SAVE REPORT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export function saveReport(report: Report): void {
  // Always save to localStorage (backup)
  const reports = getReports();
  reports.unshift(report);
  // Keep max 50 reports in localStorage
  const trimmed = reports.slice(0, 50);
  localStorage.setItem(REPORTS_KEY, JSON.stringify(trimmed));

  // Also save to database (async, fire-and-forget)
  if (useDatabase) {
    apiCreateReport(report).catch((err) => {
      console.warn("⚠️ DB save failed:", err.message);
    });
  }
}

// Async version
export async function saveReportAsync(report: Report): Promise<void> {
  // Save to localStorage backup
  const reports = getReports();
  reports.unshift(report);
  const trimmed = reports.slice(0, 50);
  localStorage.setItem(REPORTS_KEY, JSON.stringify(trimmed));

  // Save to database
  if (useDatabase) {
    try {
      await apiCreateReport(report);
      console.log("✅ Report saved to database");
    } catch (err: any) {
      console.warn("⚠️ DB save failed:", err.message);
    }
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// UPDATE REPORT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export function updateReport(id: string, updates: Partial<Report>): void {
  // Update localStorage
  const reports = getReports();
  const idx = reports.findIndex(r => r.id === id);
  if (idx !== -1) {
    reports[idx] = { ...reports[idx], ...updates };
    localStorage.setItem(REPORTS_KEY, JSON.stringify(reports));
  }

  // Update database (fire-and-forget)
  if (useDatabase) {
    apiUpdateReport(id, updates).catch((err) => {
      console.warn("⚠️ DB update failed:", err.message);
    });
  }
}

// Async version
export async function updateReportAsync(id: string, updates: Partial<Report>): Promise<void> {
  // Update localStorage
  const reports = getReports();
  const idx = reports.findIndex(r => r.id === id);
  if (idx !== -1) {
    reports[idx] = { ...reports[idx], ...updates };
    localStorage.setItem(REPORTS_KEY, JSON.stringify(reports));
  }

  // Update database
  if (useDatabase) {
    try {
      await apiUpdateReport(id, updates);
    } catch (err: any) {
      console.warn("⚠️ DB update failed:", err.message);
    }
  }
}

// Legacy function for backward compatibility
export async function updateReportStatus(
  id: string,
  status: Report["status"]
): Promise<void> {
  return updateReportAsync(id, { status });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DELETE REPORT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export function deleteReport(id: string): void {
  const reports = getReports().filter(r => r.id !== id);
  localStorage.setItem(REPORTS_KEY, JSON.stringify(reports));

  if (useDatabase) {
    apiDeleteReport(id).catch((err) => {
      console.warn("⚠️ DB delete failed:", err.message);
    });
  }
}

// Legacy alias
export const removeReport = deleteReport;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CLEAR ALL REPORTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export function clearReports(): void {
  localStorage.removeItem(REPORTS_KEY);

  if (useDatabase) {
    apiDeleteAllReports().catch((err) => {
      console.warn("⚠️ DB clear failed:", err.message);
    });
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOKEN & CONFIG MANAGEMENT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export function saveHFToken(token: string): void {
  localStorage.setItem(HF_TOKEN_KEY, token);
}

export function getHFToken(): string {
  return localStorage.getItem(HF_TOKEN_KEY) || '';
}

export function saveTelegramConfig(token: string, chatId: string): void {
  localStorage.setItem(TG_TOKEN_KEY, token);
  localStorage.setItem(TG_CHAT_KEY, chatId);
}

export function getTelegramConfig(): { botToken: string; chatId: string } {
  return {
    botToken: localStorage.getItem(TG_TOKEN_KEY) || '',
    chatId: localStorage.getItem(TG_CHAT_KEY) || '',
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// UTILITY
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export function generateId(): string {
  return `rpt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MIGRATE localStorage → MongoDB (one-time)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function migrateLocalStorageToDB() {
  try {
    const localReports = getReports();
    if (localReports.length === 0) return;

    console.log(`📦 Migrating ${localReports.length} reports from localStorage to DB...`);

    for (const report of localReports) {
      try {
        await apiCreateReport(report);
      } catch {
        // Skip duplicates or errors
      }
    }

    console.log("✅ Migration complete!");
  } catch (err) {
    console.warn("⚠️ Migration failed:", err);
  }
}