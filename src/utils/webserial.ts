// WebSerial API type declarations (not in standard TS lib yet)
declare global {
  interface Navigator {
    serial: {
      requestPort(): Promise<WebSerialPort>;
    };
  }
  interface WebSerialPort {
    open(options: { baudRate: number }): Promise<void>;
    close(): Promise<void>;
    writable: WritableStream<Uint8Array> | null;
    readable: ReadableStream<Uint8Array> | null;
    getInfo(): { usbVendorId?: number; usbProductId?: number };
  }
}

interface SerialConnection {
  port: WebSerialPort;
  writer: WritableStreamDefaultWriter<Uint8Array>;
}

let activeConnection: SerialConnection | null = null;

// ── Two completely separate lock flags ────────────────────────────────────────
// realTriggerInFlight: true only while an AI-analysis write is in progress.
// Resets the moment the write resolves, so the NEXT analysis can always fire.
let realTriggerInFlight = false;

// testTriggerInFlight: used only by the Hardware-page test button.
// Completely isolated — pressing Test never blocks the real AI trigger.
let testTriggerInFlight = false;

// ── Low-level write helper ────────────────────────────────────────────────────
async function writeToPort(text: string): Promise<boolean> {
  if (!activeConnection) return false;
  try {
    const encoder = new TextEncoder();
    await activeConnection.writer.write(encoder.encode(text));
    return true;
  } catch {
    // If write fails the port is gone — clear the connection
    activeConnection = null;
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
export function isWebSerialSupported(): boolean {
  return 'serial' in navigator;
}

export async function connectToPico(): Promise<{
  success: boolean;
  portName: string;
  error?: string;
}> {
  if (!isWebSerialSupported()) {
    return {
      success: false,
      portName: '',
      error: 'WebSerial not supported. Use Chrome or Edge browser.',
    };
  }

  try {
    const port = await navigator.serial.requestPort();
    await port.open({ baudRate: 115200 });

    if (!port.writable) {
      return { success: false, portName: '', error: 'Port not writable' };
    }

    const writer = port.writable.getWriter();
    activeConnection = { port, writer };

    // Reset both locks on every fresh connection
    realTriggerInFlight = false;
    testTriggerInFlight = false;

    const portInfo = port.getInfo();
    const vid = portInfo.usbVendorId?.toString(16).padStart(4, '0') ?? '????';
    const pid = portInfo.usbProductId?.toString(16).padStart(4, '0') ?? '????';
    const portName = `USB Device (VID:${vid} PID:${pid})`;

    return { success: true, portName };
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'NotFoundError') {
      return { success: false, portName: '', error: 'No port selected by user.' };
    }
    return { success: false, portName: '', error: String(err) };
  }
}

export async function disconnectFromPico(): Promise<void> {
  if (activeConnection) {
    try {
      activeConnection.writer.releaseLock();
      await activeConnection.port.close();
    } catch {
      /* ignore disconnect errors */
    }
    activeConnection = null;
    realTriggerInFlight = false;
    testTriggerInFlight = false;
  }
}

// ── REAL AI trigger (CRITICAL only) ───────────────────────────────────────────
// Called automatically by AnalyzePage when IRI >= 80.
// Lock resets immediately after the write resolves so every new
// analysis that comes back critical can fire its own signal.
export async function sendCriticalSignal(): Promise<boolean> {
  if (!activeConnection) return false;
  if (realTriggerInFlight) return false;

  realTriggerInFlight = true;
  const ok = await writeToPort('CRITICAL\n');
  realTriggerInFlight = false;
  return ok;
}

// ── Send IRI Score to Pico ────────────────────────────────────────────────────
// Sends the numeric IRI score to the Pico, which then triggers the appropriate
// mode based on the score value:
//   - score >= 80: CRITICAL mode (siren, red LED blink, display blink)
//   - score 60-79: HIGH mode (display 8888, red LED on, no buzzer)
//   - score 40-59: MODERATE mode (yellow warning)
//   - score < 40:  LOW/SAFE mode (display "SAFE", green LED blink)
export async function sendRiskScore(iri: number): Promise<boolean> {
  if (!activeConnection) return false;
  if (realTriggerInFlight) return false;

  realTriggerInFlight = true;
  const ok = await writeToPort(`${Math.round(iri)}\n`);
  realTriggerInFlight = false;
  return ok;
}

// ── Risk Level Helper ─────────────────────────────────────────────────────────
// Returns the risk level string based on IRI score
export function getRiskLevel(iri: number): 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW' {
  if (iri >= 80) return 'CRITICAL';
  if (iri >= 60) return 'HIGH';
  if (iri >= 40) return 'MODERATE';
  return 'LOW';
}

// ── HARDWARE PAGE test button ─────────────────────────────────────────────────
// Completely separate from the real trigger.
// Pressing Test never sets or reads realTriggerInFlight.
export async function sendTestSignal(): Promise<boolean> {
  if (!activeConnection) return false;
  if (testTriggerInFlight) return false;

  testTriggerInFlight = true;
  const ok = await writeToPort('CRITICAL\n');
  setTimeout(() => { testTriggerInFlight = false; }, 3000);
  return ok;
}

// ── Test signal with specific score ───────────────────────────────────────────
// Allows testing different risk levels from Hardware page
export async function sendTestScore(score: number): Promise<boolean> {
  if (!activeConnection) return false;
  if (testTriggerInFlight) return false;

  testTriggerInFlight = true;
  const ok = await writeToPort(`${Math.round(score)}\n`);
  setTimeout(() => { testTriggerInFlight = false; }, 3000);
  return ok;
}

export function isConnected(): boolean {
  return activeConnection !== null;
}

// Kept for backwards compatibility
export function resetTriggerLock(): void {
  realTriggerInFlight = false;
}