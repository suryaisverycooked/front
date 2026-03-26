// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Central API client — connects frontend to AI-Agent backend
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const API_BASE = import.meta.env.VITE_API_URL || "https://six0-og6j.onrender.com";

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  pagination?: {
    total: number;
    page: number;
    pages: number;
  };
}

// Generic fetch wrapper with error handling
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const url = `${API_BASE}${endpoint}`;

    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }

    return data;
  } catch (error: any) {
    console.error(`❌ API Error [${endpoint}]:`, error.message);

    // Check if backend is unreachable
    if (error.message.includes("Failed to fetch") || error.message.includes("NetworkError")) {
      console.warn("⚠️ Backend unreachable — is AI-Agent running on port 5000?");
    }

    throw error;
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// REPORT APIs
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function fetchReports(filters?: {
  status?: string;
  severity?: string;
  damageType?: string;
  limit?: number;
  page?: number;
}) {
  const params = new URLSearchParams();
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) params.set(key, String(value));
    });
  }

  const query = params.toString() ? `?${params.toString()}` : "";
  return apiFetch(`/api/reports${query}`);
}

export async function fetchReport(id: string) {
  return apiFetch(`/api/reports/${id}`);
}

export async function createReport(report: any) {
  return apiFetch("/api/reports", {
    method: "POST",
    body: JSON.stringify(report),
  });
}

export async function updateReport(id: string, updates: any) {
  return apiFetch(`/api/reports/${id}`, {
    method: "PUT",
    body: JSON.stringify(updates),
  });
}

export async function deleteReport(id: string) {
  return apiFetch(`/api/reports/${id}`, {
    method: "DELETE",
  });
}

export async function deleteAllReports() {
  return apiFetch("/api/reports", {
    method: "DELETE",
  });
}

export async function fetchDashboardStats() {
  return apiFetch("/api/reports/stats/dashboard");
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// AI ANALYSIS API
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function analyzeImage(
  imageBase64: string,
  location?: { lat: number; lng: number; address?: string },
  saveReport = true
) {
  return apiFetch("/api/analyze", {
    method: "POST",
    body: JSON.stringify({
      image: imageBase64,
      location,
      saveReport,
    }),
  });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HEALTH CHECK
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function checkBackendHealth(): Promise<{
  server: boolean;
  database: boolean;
}> {
  try {
    const res = await apiFetch<any>("/api/health");
    return {
      server: true,
      database: res.data?.database === "connected" || (res as any).database === "connected",
    };
  } catch {
    return { server: false, database: false };
  }
}

export { API_BASE };