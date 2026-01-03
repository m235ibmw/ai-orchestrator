import { execSync } from 'child_process';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(
  process.env.HOME || '~',
  '.local',
  'share',
  'raycast-focus',
  'focus.db',
);

// Raycast Focus Stats extension DB path
const FOCUS_STATS_DB_PATH = path.join(
  process.env.HOME || '~',
  'Library',
  'Application Support',
  'com.raycast.macos',
  'extensions',
  'ef4503c9-f6cf-488a-920d-70a54a79b1aa',
  'sessions.db',
);

export interface FocusSession {
  type: 'start' | 'complete' | 'stop' | 'summary';
  timestamp: string;
  goal?: string | undefined;
  plannedDuration?: number | undefined;
  startDate?: string | undefined;
  source?: string | undefined;
  actualDuration?: string | undefined;
  pausesCount?: number | undefined;
  blockEventsCount?: number | undefined;
  snoozeEventsCount?: number | undefined;
}

export interface FocusLogResult {
  date: string;
  sessions: FocusSession[];
}

/**
 * Get Raycast Focus session logs for a specific date
 * @param date - Date in YYYY-MM-DD format
 */
export async function getFocusLogs(date: string): Promise<FocusLogResult> {
  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error('Invalid date format. Use YYYY-MM-DD');
  }

  // Calculate the time range for the given date
  const targetDate = new Date(date);
  const nextDate = new Date(targetDate);
  nextDate.setDate(nextDate.getDate() + 1);

  // Format for log show command
  const startTime = `${date} 00:00:00`;
  const endTime = `${nextDate.toISOString().split('T')[0]} 00:00:00`;

  const command = `/usr/bin/log show --predicate 'subsystem == "com.raycast.macos"' --info --start "${startTime}" --end "${endTime}" 2>&1 | grep -A10 '\\[com.raycast.macos:focus\\]'`;

  let output: string;
  try {
    output = execSync(command, {
      encoding: 'utf-8',
      timeout: 30000,
      shell: '/bin/bash',
    });
  } catch (error: unknown) {
    // grep returns exit code 1 if no matches found
    if (error && typeof error === 'object' && 'status' in error && error.status === 1) {
      return {
        date,
        sessions: [],
      };
    }
    throw error;
  }

  const sessions = parseLogOutput(output);

  return {
    date,
    sessions,
  };
}

/**
 * Convert UTC date string to JST formatted string
 * Input: "2025-12-29 08:54:30 +0000" or "2025-12-29 17:54:30.609295+0900"
 * Output: "2025-12-29 17:54:30"
 */
function toJST(dateStr: string): string {
  if (!dateStr) return '';

  // Handle format: "2025-12-29 08:54:30 +0000"
  const utcMatch = dateStr.match(/^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}) \+0000$/);
  if (utcMatch) {
    const date = new Date(`${utcMatch[1]}T${utcMatch[2]}Z`);
    return formatJST(date);
  }

  // Handle format: "2025-12-29 17:54:30.609295+0900"
  const logMatch = dateStr.match(/^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2})\.\d+([+-]\d{4})$/);
  if (logMatch) {
    const datePart = logMatch[1];
    const timePart = logMatch[2];
    const tz = logMatch[3];
    if (!datePart || !timePart || !tz) return dateStr;
    // Already in JST (+0900), just format nicely
    if (tz === '+0900') {
      return `${datePart} ${timePart}`;
    }
    // Convert from other timezone
    const date = new Date(`${datePart}T${timePart}${tz.slice(0, 3)}:${tz.slice(3)}`);
    return formatJST(date);
  }

  return dateStr;
}

function formatJST(date: Date): string {
  const jst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  const y = jst.getUTCFullYear();
  const m = String(jst.getUTCMonth() + 1).padStart(2, '0');
  const d = String(jst.getUTCDate()).padStart(2, '0');
  const h = String(jst.getUTCHours()).padStart(2, '0');
  const min = String(jst.getUTCMinutes()).padStart(2, '0');
  const s = String(jst.getUTCSeconds()).padStart(2, '0');
  return `${y}-${m}-${d} ${h}:${min}:${s}`;
}

function parseLogOutput(output: string): FocusSession[] {
  const sessions: FocusSession[] = [];
  const lines = output.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    // Extract timestamp from log line
    const timestampMatch = line.match(/^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d+[+-]\d{4})/);
    const timestamp = toJST(timestampMatch?.[1] ?? '');

    if (line.includes('[com.raycast.macos:focus] Start focus session')) {
      const session: FocusSession = {
        type: 'start',
        timestamp,
      };

      // Look for Goal and Duration in next lines
      for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
        const nextLine = lines[j];
        if (!nextLine) continue;
        const goalMatch = nextLine.match(/^\s*Goal:\s*(.+)$/);
        if (goalMatch?.[1]) {
          session.goal = goalMatch[1];
        }
        const durationMatch = nextLine.match(/^\s*Duration:\s*(\d+)$/);
        if (durationMatch?.[1]) {
          session.plannedDuration = parseInt(durationMatch[1], 10);
        }
      }

      sessions.push(session);
    } else if (line.includes('[com.raycast.macos:focus] Complete focus session')) {
      sessions.push({
        type: 'complete',
        timestamp,
      });
    } else if (line.includes('[com.raycast.macos:focus] Stop focus session')) {
      sessions.push({
        type: 'stop',
        timestamp,
      });
    } else if (line.includes('[com.raycast.macos:focus] Focus session activity summary')) {
      const session: FocusSession = {
        type: 'summary',
        timestamp,
      };

      // Parse summary fields in next lines
      for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
        const nextLine = lines[j];
        if (!nextLine) continue;
        if (nextLine.includes('[com.raycast.macos:')) break;

        const startDateMatch = nextLine.match(/^\s*Start date:\s*(.+)$/);
        if (startDateMatch?.[1]) {
          session.startDate = toJST(startDateMatch[1]);
        }
        const sourceMatch = nextLine.match(/^\s*Source:\s*(.+)$/);
        if (sourceMatch?.[1]) {
          session.source = sourceMatch[1];
        }
        const durationMatch = nextLine.match(/^\s*Duration:\s*(.*)$/);
        if (durationMatch) {
          session.actualDuration = durationMatch[1] || undefined;
        }
        const pausesMatch = nextLine.match(/^\s*Pauses Count:\s*(\d+)$/);
        if (pausesMatch?.[1]) {
          session.pausesCount = parseInt(pausesMatch[1], 10);
        }
        const blockMatch = nextLine.match(/^\s*Block Events Count:\s*(\d+)$/);
        if (blockMatch?.[1]) {
          session.blockEventsCount = parseInt(blockMatch[1], 10);
        }
        const snoozeMatch = nextLine.match(/^\s*Snooze Events Count:\s*(\d+)$/);
        if (snoozeMatch?.[1]) {
          session.snoozeEventsCount = parseInt(snoozeMatch[1], 10);
        }
      }

      sessions.push(session);
    }
  }

  return sessions;
}

// --------------------------
// Database functions
// --------------------------

function getDb(): Database.Database {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const db = new Database(DB_PATH);

  // Create table if not exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS focus_sessions (
      id TEXT PRIMARY KEY,
      goal TEXT,
      planned_duration INTEGER,
      actual_duration TEXT,
      start_time TEXT NOT NULL,
      end_time TEXT,
      source TEXT,
      pauses_count INTEGER DEFAULT 0,
      block_events_count INTEGER DEFAULT 0,
      snooze_events_count INTEGER DEFAULT 0,
      synced_at TEXT NOT NULL
    )
  `);

  return db;
}

export interface SyncResult {
  synced: number;
  skipped: number;
  total: number;
}

/**
 * Sync focus sessions from macOS logs to SQLite database
 * Fetches logs from the last 24 hours and saves new sessions
 */
export async function syncFocusSessions(): Promise<SyncResult> {
  const db = getDb();

  // Get logs from last 24 hours
  const command = `/usr/bin/log show --predicate 'subsystem == "com.raycast.macos"' --info --last 24h 2>&1 | grep -A10 '\\[com.raycast.macos:focus\\]'`;

  let output: string;
  try {
    output = execSync(command, {
      encoding: 'utf-8',
      timeout: 60000,
      shell: '/bin/bash',
    });
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error && error.status === 1) {
      db.close();
      return { synced: 0, skipped: 0, total: 0 };
    }
    throw error;
  }

  const sessions = parseLogOutput(output);

  // Group sessions into complete focus sessions (start + summary pairs)
  const completeSessions = groupSessions(sessions);

  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO focus_sessions (
      id, goal, planned_duration, actual_duration, start_time, end_time,
      source, pauses_count, block_events_count, snooze_events_count, synced_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let synced = 0;
  let skipped = 0;
  const now = new Date().toISOString();

  for (const session of completeSessions) {
    // Use start_time as unique ID
    const id = session.startTime;

    const result = insertStmt.run(
      id,
      session.goal ?? null,
      session.plannedDuration ?? null,
      session.actualDuration ?? null,
      session.startTime,
      session.endTime ?? null,
      session.source ?? null,
      session.pausesCount ?? 0,
      session.blockEventsCount ?? 0,
      session.snoozeEventsCount ?? 0,
      now,
    );

    if (result.changes > 0) {
      synced++;
    } else {
      skipped++;
    }
  }

  db.close();

  return {
    synced,
    skipped,
    total: completeSessions.length,
  };
}

interface CompleteFocusSession {
  goal?: string | undefined;
  plannedDuration?: number | undefined;
  actualDuration?: string | undefined;
  startTime: string;
  endTime?: string | undefined;
  source?: string | undefined;
  pausesCount?: number | undefined;
  blockEventsCount?: number | undefined;
  snoozeEventsCount?: number | undefined;
}

function groupSessions(sessions: FocusSession[]): CompleteFocusSession[] {
  const complete: CompleteFocusSession[] = [];
  const seenStartTimes = new Set<string>();

  for (let i = 0; i < sessions.length; i++) {
    const session = sessions[i];

    // Handle start sessions (original logic)
    if (session?.type === 'start') {
      const result: CompleteFocusSession = {
        goal: session.goal,
        plannedDuration: session.plannedDuration,
        startTime: session.timestamp,
      };
      seenStartTimes.add(session.timestamp);

      // Look for corresponding summary
      for (let j = i + 1; j < sessions.length; j++) {
        const next = sessions[j];
        if (next?.type === 'start') break; // Next session started
        if (next?.type === 'summary') {
          result.endTime = next.timestamp;
          result.actualDuration = next.actualDuration;
          result.source = next.source;
          result.pausesCount = next.pausesCount;
          result.blockEventsCount = next.blockEventsCount;
          result.snoozeEventsCount = next.snoozeEventsCount;
          if (next.startDate) {
            seenStartTimes.add(next.startDate);
          }
          break;
        }
      }

      complete.push(result);
    }

    // Handle summary sessions without corresponding start (new logic)
    if (session?.type === 'summary' && session.startDate) {
      // Skip if we already have this session from a start event
      if (seenStartTimes.has(session.startDate)) {
        continue;
      }

      const result: CompleteFocusSession = {
        startTime: session.startDate,
        endTime: session.timestamp,
        actualDuration: session.actualDuration,
        source: session.source,
        pausesCount: session.pausesCount,
        blockEventsCount: session.blockEventsCount,
        snoozeEventsCount: session.snoozeEventsCount,
      };

      seenStartTimes.add(session.startDate);
      complete.push(result);
    }
  }

  return complete;
}

export interface StoredFocusSession {
  id: string;
  goal: string | null;
  planned_duration: number | null;
  actual_duration: string | null;
  start_time: string;
  end_time: string | null;
  source: string | null;
  pauses_count: number;
  block_events_count: number;
  snooze_events_count: number;
  synced_at: string;
}

/**
 * Get focus sessions from Raycast Focus Stats extension DB
 * Falls back to our own DB if Focus Stats is not available
 */
export async function getFocusHistory(
  startDate: string,
  endDate?: string | undefined,
): Promise<StoredFocusSession[]> {
  const end = endDate || startDate;

  // Try Focus Stats extension DB first (has goal data)
  if (fs.existsSync(FOCUS_STATS_DB_PATH)) {
    try {
      const sessions = getSessionsFromFocusStats(startDate, end);
      if (sessions.length > 0) {
        return sessions;
      }
    } catch {
      // Fall through to our own DB
    }
  }

  // Fallback: sync from logs and use our own DB
  try {
    await syncFocusSessions();
  } catch {
    // Ignore sync errors
  }

  const db = getDb();
  const stmt = db.prepare(`
    SELECT * FROM focus_sessions
    WHERE date(start_time) >= date(?) AND date(start_time) <= date(?)
    ORDER BY start_time DESC
  `);

  const rows = stmt.all(startDate, end) as StoredFocusSession[];
  db.close();

  return rows;
}

interface FocusStatsSession {
  id: number;
  goal: string;
  duration: number; // minutes (not seconds!)
  timestamp: number; // milliseconds unix timestamp
}

/**
 * Read sessions from Raycast Focus Stats extension DB
 */
function getSessionsFromFocusStats(startDate: string, endDate: string): StoredFocusSession[] {
  const db = new Database(FOCUS_STATS_DB_PATH, { readonly: true });

  // Convert dates to timestamp range (milliseconds)
  const startTs = new Date(startDate).setHours(0, 0, 0, 0);
  const endTs = new Date(endDate).setHours(23, 59, 59, 999);

  const stmt = db.prepare(`
    SELECT * FROM sessions
    WHERE timestamp >= ? AND timestamp <= ?
    ORDER BY timestamp DESC
  `);

  const rows = stmt.all(startTs, endTs) as FocusStatsSession[];
  db.close();

  // Convert to StoredFocusSession format
  return rows.map((row) => {
    const startTime = new Date(row.timestamp);
    const durationMinutes = row.duration;
    const endTime = new Date(row.timestamp + durationMinutes * 60 * 1000);

    return {
      id: row.timestamp.toString(),
      goal: row.goal,
      planned_duration: null,
      actual_duration: formatDurationMinutes(durationMinutes),
      start_time: formatJST(startTime),
      end_time: formatJST(endTime),
      source: null,
      pauses_count: 0,
      block_events_count: 0,
      snooze_events_count: 0,
      synced_at: new Date().toISOString(),
    };
  });
}

function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} seconds`;
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes} minutes`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours} hours ${remainingMinutes} minutes`;
}

function formatDurationMinutes(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} minutes`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) {
    return `${hours} hours`;
  }
  return `${hours} hours ${remainingMinutes} minutes`;
}
