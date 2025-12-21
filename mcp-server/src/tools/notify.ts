import { execSync } from 'child_process';

// 起動時にNotificationCenterをリセット
execSync('killall NotificationCenter 2>/dev/null || true', {
  encoding: 'utf-8',
  timeout: 2000,
});

/**
 * Send a macOS desktop notification via terminal-notifier
 */
export function sendNotification(
  title: string,
  message: string,
): {
  success: boolean;
  title?: string;
  message?: string;
  error?: string;
} {
  try {
    execSync(
      `/opt/homebrew/bin/terminal-notifier -title "${title.replace(/"/g, '\\"')}" -message "${message.replace(/"/g, '\\"')}" -sound default`,
      { encoding: 'utf-8', timeout: 5000 },
    );

    return {
      success: true,
      title,
      message,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to send notification: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
