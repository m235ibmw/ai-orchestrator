import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

// Output directory for transcripts
const OUTPUT_DIR = '/Users/kurikinton/Documents/niko-dev/tmp/yt';

/**
 * Extract video ID from YouTube URL
 */
function extractVideoId(url: string): string | null {
  // Handle various YouTube URL formats
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/, // Just the ID
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
}

/**
 * Parse VTT content and extract plain text
 * Removes timestamps and deduplicates consecutive lines
 */
function parseVttToPlainText(vttContent: string): string {
  const lines = vttContent.split('\n');
  const textLines: string[] = [];
  let previousLine = '';

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines, WEBVTT header, and timestamp lines
    if (
      !trimmed ||
      trimmed === 'WEBVTT' ||
      trimmed.includes('-->') ||
      /^\d{2}:\d{2}/.test(trimmed) ||
      trimmed.startsWith('Kind:') ||
      trimmed.startsWith('Language:')
    ) {
      continue;
    }

    // Remove HTML tags and timestamp tags like <00:00:01.000>
    const cleanedLine = trimmed
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim();

    if (!cleanedLine) continue;

    // Skip if same as previous line (YouTube auto-subs have lots of duplicates)
    if (cleanedLine === previousLine) continue;

    // Check if current line is a continuation/extension of previous
    // YouTube often shows incremental text like: "hello" -> "hello world"
    if (previousLine && cleanedLine.startsWith(previousLine)) {
      // Replace previous with the longer version
      textLines.pop();
    }

    textLines.push(cleanedLine);
    previousLine = cleanedLine;
  }

  // Join lines with space, then clean up extra spaces
  return textLines.join(' ').replace(/\s+/g, ' ').trim();
}

/**
 * Get video title using yt-dlp
 */
async function getVideoTitle(url: string): Promise<string> {
  try {
    const { stdout } = await execAsync(`yt-dlp --get-title "${url}"`, {
      timeout: 30000,
    });
    return stdout.trim();
  } catch {
    return 'Unknown Title';
  }
}

/**
 * Check if yt-dlp is installed
 */
async function checkYtDlp(): Promise<boolean> {
  try {
    await execAsync('yt-dlp --version');
    return true;
  } catch {
    return false;
  }
}

/**
 * Get available subtitle languages for a video
 */
async function getAvailableLanguages(url: string): Promise<string[]> {
  try {
    const { stdout } = await execAsync(`yt-dlp --list-subs "${url}"`, {
      timeout: 30000,
    });

    const languages: string[] = [];
    const lines = stdout.split('\n');

    for (const line of lines) {
      // Parse lines like "ja       vtt, ttml, srv3, srv2, srv1, json3"
      const match = line.match(/^([a-z]{2}(?:-[A-Za-z]+)?)\s+/);
      if (match && match[1]) {
        languages.push(match[1]);
      }
    }

    return languages;
  } catch {
    return [];
  }
}

/**
 * Download YouTube transcript and save as plain text
 */
export async function getYoutubeTranscript(
  url: string,
  lang = 'ja',
): Promise<{
  success: boolean;
  video_id?: string;
  title?: string;
  file_path?: string;
  language?: string;
  error?: string;
  available_languages?: string[];
}> {
  try {
    // Check if yt-dlp is installed
    const ytdlpInstalled = await checkYtDlp();
    if (!ytdlpInstalled) {
      return {
        success: false,
        error:
          'yt-dlp is not installed. Please install it with: brew install yt-dlp',
      };
    }

    // Extract video ID
    const videoId = extractVideoId(url);
    if (!videoId) {
      return {
        success: false,
        error: `Invalid YouTube URL: ${url}`,
      };
    }

    // Ensure output directory exists
    await fs.mkdir(OUTPUT_DIR, { recursive: true });

    // Get video title
    const title = await getVideoTitle(url);

    // Download subtitles (auto-generated or manual)
    const tempDir = path.join(OUTPUT_DIR, '.temp');
    await fs.mkdir(tempDir, { recursive: true });

    const subtitleCmd = `yt-dlp --write-auto-subs --write-subs --sub-langs "${lang}" --skip-download -o "${tempDir}/${videoId}" "${url}"`;

    try {
      await execAsync(subtitleCmd, { timeout: 60000 });
    } catch (error) {
      // Check available languages if download fails
      const availableLangs = await getAvailableLanguages(url);
      if (availableLangs.length > 0) {
        return {
          success: false,
          error: `No subtitles found for language "${lang}"`,
          available_languages: availableLangs,
        };
      }
      return {
        success: false,
        error: `No subtitles available for this video`,
      };
    }

    // Find the downloaded VTT file
    const tempFiles = await fs.readdir(tempDir);
    const vttFile = tempFiles.find(
      (f) => f.startsWith(videoId) && f.endsWith('.vtt'),
    );

    if (!vttFile) {
      // Check available languages
      const availableLangs = await getAvailableLanguages(url);
      if (availableLangs.length > 0) {
        return {
          success: false,
          error: `No subtitles found for language "${lang}"`,
          available_languages: availableLangs,
        };
      }
      return {
        success: false,
        error: `No subtitles found for language "${lang}"`,
      };
    }

    // Read and parse VTT content
    const vttPath = path.join(tempDir, vttFile);
    const vttContent = await fs.readFile(vttPath, 'utf-8');
    const plainText = parseVttToPlainText(vttContent);

    if (!plainText) {
      return {
        success: false,
        error: 'Failed to extract text from subtitles',
      };
    }

    // Save as plain text
    const outputPath = path.join(OUTPUT_DIR, `${videoId}.txt`);
    await fs.writeFile(outputPath, plainText, 'utf-8');

    // Cleanup: remove VTT file and temp directory
    await fs.unlink(vttPath);
    try {
      await fs.rmdir(tempDir);
    } catch {
      // Ignore if not empty
    }

    // Determine actual language from filename
    const langMatch = vttFile.match(/\.([a-z]{2}(?:-[A-Za-z]+)?)\.vtt$/);
    const actualLang = langMatch && langMatch[1] ? langMatch[1] : lang;

    return {
      success: true,
      video_id: videoId,
      title,
      file_path: outputPath,
      language: actualLang,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
