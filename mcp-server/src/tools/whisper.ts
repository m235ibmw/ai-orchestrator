import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { getDriveClient, listFiles } from './gdrive.js';

// Directories for tmp files and transcripts
const MCP_SERVER_DIR = path.resolve(import.meta.dirname, '../..');
const TMP_DIR = path.join(MCP_SERVER_DIR, 'tmp');
const TRANSCRIPTS_DIR = path.join(MCP_SERVER_DIR, 'transcripts');

/**
 * Extract folder ID from Google Drive folder URL
 */
function extractFolderId(url: string): string | null {
  const match = url.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  return match?.[1] ?? null;
}

/**
 * Download a file from Google Drive as binary
 */
async function downloadFile(
  fileId: string,
  destPath: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const drive = await getDriveClient();

    const response = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'arraybuffer' }
    );

    const buffer = Buffer.from(response.data as ArrayBuffer);
    fs.writeFileSync(destPath, buffer);

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Get folder name from Google Drive
 */
async function getFolderName(folderId: string): Promise<string> {
  try {
    const drive = await getDriveClient();
    const response = await drive.files.get({
      fileId: folderId,
      fields: 'name',
    });
    return response.data.name || folderId;
  } catch {
    return folderId;
  }
}

// Supported audio extensions
const AUDIO_EXTENSIONS = ['.mp3', '.m4a', '.wav', '.webm', '.mp4', '.mpeg', '.mpga', '.oga', '.ogg'];

/**
 * Run Whisper transcription on an audio file
 */
function transcribeWithWhisper(
  audioPath: string,
  outputDir: string
): { success: boolean; outputPath?: string; error?: string } {
  try {
    // Ensure output directory exists
    fs.mkdirSync(outputDir, { recursive: true });

    // Run whisper command (use full path as MCP server may not have PATH set)
    const whisperPath = '/Users/kurikinton/.local/bin/whisper';
    const cmd = `${whisperPath} "${audioPath}" --model medium --language Japanese --output_format txt --output_dir "${outputDir}"`;
    execSync(cmd, { stdio: 'pipe' });

    // Whisper outputs file with same name but .txt extension
    const ext = path.extname(audioPath);
    const baseName = path.basename(audioPath, ext);
    const outputPath = path.join(outputDir, `${baseName}.txt`);

    if (fs.existsSync(outputPath)) {
      return { success: true, outputPath };
    } else {
      return { success: false, error: 'Whisper output file not found' };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Transcribe all audio files in a Google Drive folder
 */
export async function transcribeDriveFolder(folderUrl: string): Promise<{
  success: boolean;
  folderName?: string;
  results?: Array<{
    fileName: string;
    transcriptPath?: string;
    error?: string;
  }>;
  error?: string;
}> {
  try {
    // Extract folder ID from URL
    const folderId = extractFolderId(folderUrl);
    if (!folderId) {
      return { success: false, error: 'Invalid folder URL' };
    }

    // Get folder name
    const folderName = await getFolderName(folderId);

    // Create directories
    const tmpFolderDir = path.join(TMP_DIR, folderName);
    const transcriptsFolderDir = path.join(TRANSCRIPTS_DIR, folderName);
    fs.mkdirSync(tmpFolderDir, { recursive: true });
    fs.mkdirSync(transcriptsFolderDir, { recursive: true });

    // List all files in the folder
    const listResult = await listFiles({ folderId });

    if (!listResult.success || !listResult.files) {
      return { success: false, error: listResult.error || 'Failed to list files' };
    }

    // Filter audio files by extension
    const audioFiles = listResult.files.filter((file) => {
      const ext = path.extname(file.name).toLowerCase();
      return AUDIO_EXTENSIONS.includes(ext);
    });

    if (audioFiles.length === 0) {
      return { success: false, error: 'No audio files found in folder (mp3, m4a, wav, etc.)' };
    }

    const results: Array<{
      fileName: string;
      transcriptPath?: string;
      error?: string;
    }> = [];

    // Process each audio file
    for (const file of audioFiles) {
      const audioPath = path.join(tmpFolderDir, file.name);

      // Download audio file
      const downloadResult = await downloadFile(file.id, audioPath);
      if (!downloadResult.success) {
        results.push({
          fileName: file.name,
          error: `Download failed: ${downloadResult.error}`,
        });
        continue;
      }

      // Transcribe with Whisper
      const transcribeResult = transcribeWithWhisper(audioPath, transcriptsFolderDir);
      if (!transcribeResult.success) {
        results.push({
          fileName: file.name,
          error: `Transcription failed: ${transcribeResult.error}`,
        });
        continue;
      }

      if (transcribeResult.outputPath) {
        results.push({
          fileName: file.name,
          transcriptPath: transcribeResult.outputPath,
        });

        // Delete audio file after successful transcription
        try {
          fs.unlinkSync(audioPath);
        } catch {
          // Ignore deletion errors
        }
      }
    }

    return {
      success: true,
      folderName,
      results,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// Output directory for local transcription
const LOCAL_OUTPUT_DIR = '/Users/kurikinton/Documents/niko-dev/cache-files';

/**
 * Transcribe a local audio file with Whisper
 */
export async function transcribeLocalAudio(
  audioPath: string,
  outputFileName?: string
): Promise<{
  success: boolean;
  outputPath?: string;
  error?: string;
}> {
  try {
    // Check if input file exists
    if (!fs.existsSync(audioPath)) {
      return { success: false, error: `File not found: ${audioPath}` };
    }

    // Ensure output directory exists
    fs.mkdirSync(LOCAL_OUTPUT_DIR, { recursive: true });

    // Determine output file name
    const ext = path.extname(audioPath);
    const baseName = outputFileName || path.basename(audioPath, ext);

    // Run whisper command (use full path as MCP server may not have PATH set)
    const whisperPath = '/Users/kurikinton/.local/bin/whisper';
    const cmd = `${whisperPath} "${audioPath}" --model medium --language Japanese --output_format txt --output_dir "${LOCAL_OUTPUT_DIR}"`;
    execSync(cmd, { stdio: 'pipe' });

    // Whisper outputs file with original base name
    const originalBaseName = path.basename(audioPath, ext);
    const whisperOutputPath = path.join(LOCAL_OUTPUT_DIR, `${originalBaseName}.txt`);
    const finalOutputPath = path.join(LOCAL_OUTPUT_DIR, `${baseName}.txt`);

    // If custom name specified and different from original, rename
    if (outputFileName && whisperOutputPath !== finalOutputPath) {
      if (fs.existsSync(whisperOutputPath)) {
        fs.renameSync(whisperOutputPath, finalOutputPath);
      }
    }

    if (fs.existsSync(finalOutputPath)) {
      return { success: true, outputPath: finalOutputPath };
    } else if (fs.existsSync(whisperOutputPath)) {
      return { success: true, outputPath: whisperOutputPath };
    } else {
      return { success: false, error: 'Whisper output file not found' };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
