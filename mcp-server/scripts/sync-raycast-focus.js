#!/usr/bin/env node

/**
 * Sync Raycast Focus sessions from macOS logs to SQLite database
 * Run periodically via LaunchAgent to persist focus data
 */

import { syncFocusSessions } from '../dist/tools/raycastFocus.js';

async function main() {
  console.log(`[${new Date().toISOString()}] Starting Raycast Focus sync...`);

  try {
    const result = await syncFocusSessions();
    console.log(
      `[${new Date().toISOString()}] Sync complete: ${result.synced} synced, ${result.skipped} skipped, ${result.total} total`,
    );
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Sync failed:`, error);
    process.exit(1);
  }
}

main();
