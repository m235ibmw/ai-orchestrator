import { google, drive_v3 } from 'googleapis';
import fs from 'fs/promises';
import path from 'path';
import { createServer } from 'http';
import open from 'open';

// Credentials directory
const CREDS_DIR = path.join(process.env.HOME || '', '.gdrive-mcp');
const TOKEN_PATH = path.join(CREDS_DIR, 'token.json');

// Use the same OAuth client as clasp (from ~/.clasprc.json)
const CLASP_RC_PATH = path.join(process.env.HOME || '', '.clasprc.json');

// Scopes needed for Drive API (readonly)
const SCOPES = ['https://www.googleapis.com/auth/drive.readonly'];

interface ClaspToken {
  tokens: {
    default: {
      client_id: string;
      client_secret: string;
      refresh_token: string;
      access_token: string;
    };
  };
}

interface DriveToken {
  access_token: string;
  refresh_token: string;
  scope: string;
  token_type: string;
  expiry_date: number;
}

let driveClient: drive_v3.Drive | null = null;

/**
 * Get OAuth2 client using clasp credentials
 */
async function getOAuth2Client() {
  // Read clasp credentials
  const claspRcContent = await fs.readFile(CLASP_RC_PATH, 'utf-8');
  const claspRc: ClaspToken = JSON.parse(claspRcContent);
  const claspCreds = claspRc.tokens.default;

  const oauth2Client = new google.auth.OAuth2(
    claspCreds.client_id,
    claspCreds.client_secret,
    'http://localhost:3456/callback',
  );

  return { oauth2Client, claspCreds };
}

/**
 * Load saved Drive token if exists
 */
async function loadSavedToken(): Promise<DriveToken | null> {
  try {
    const tokenContent = await fs.readFile(TOKEN_PATH, 'utf-8');
    return JSON.parse(tokenContent);
  } catch {
    return null;
  }
}

/**
 * Save Drive token
 */
async function saveToken(token: DriveToken): Promise<void> {
  await fs.mkdir(CREDS_DIR, { recursive: true });
  await fs.writeFile(TOKEN_PATH, JSON.stringify(token, null, 2));
}

/**
 * Perform OAuth flow to get Drive API token
 */
async function performOAuthFlow(
  oauth2Client: ReturnType<typeof google.auth.OAuth2.prototype.generateAuthUrl> extends infer T
    ? T extends string
      ? any
      : any
    : any,
): Promise<DriveToken> {
  return new Promise((resolve, reject) => {
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'consent',
    });

    console.error('[GDrive] Opening browser for authentication...');
    console.error('[GDrive] Auth URL:', authUrl);

    // Create a simple HTTP server to receive the callback
    const server = createServer(async (req, res) => {
      if (req.url?.startsWith('/callback')) {
        const url = new URL(req.url, 'http://localhost:3456');
        const code = url.searchParams.get('code');

        if (code) {
          try {
            const { tokens } = await oauth2Client.getToken(code);
            oauth2Client.setCredentials(tokens);

            const driveToken: DriveToken = {
              access_token: tokens.access_token || '',
              refresh_token: tokens.refresh_token || '',
              scope: tokens.scope || '',
              token_type: tokens.token_type || 'Bearer',
              expiry_date: tokens.expiry_date || 0,
            };

            await saveToken(driveToken);

            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(
              '<html><body><h1>Authentication successful!</h1><p>You can close this window.</p></body></html>',
            );
            server.close();
            resolve(driveToken);
          } catch (err) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Authentication failed');
            server.close();
            reject(err);
          }
        } else {
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          res.end('No code received');
        }
      }
    });

    server.listen(3456, () => {
      open(authUrl).catch(() => {
        console.error('[GDrive] Could not open browser. Please visit:', authUrl);
      });
    });

    // Timeout after 5 minutes
    setTimeout(() => {
      server.close();
      reject(new Error('Authentication timed out'));
    }, 5 * 60 * 1000);
  });
}

/**
 * Get authenticated Drive client
 */
export async function getDriveClient(): Promise<drive_v3.Drive> {
  if (driveClient) {
    return driveClient;
  }

  const { oauth2Client } = await getOAuth2Client();

  // Try to load saved token
  let token = await loadSavedToken();

  if (token) {
    oauth2Client.setCredentials({
      access_token: token.access_token,
      refresh_token: token.refresh_token,
      expiry_date: token.expiry_date,
    });

    // Check if token needs refresh
    if (token.expiry_date && token.expiry_date < Date.now()) {
      console.error('[GDrive] Token expired, refreshing...');
      const { credentials } = await oauth2Client.refreshAccessToken();
      token = {
        access_token: credentials.access_token || '',
        refresh_token: credentials.refresh_token || token.refresh_token,
        scope: credentials.scope || '',
        token_type: credentials.token_type || 'Bearer',
        expiry_date: credentials.expiry_date || 0,
      };
      await saveToken(token);
      oauth2Client.setCredentials(credentials);
    }
  } else {
    // Need to perform OAuth flow
    console.error('[GDrive] No saved token, performing OAuth flow...');
    token = await performOAuthFlow(oauth2Client);
    oauth2Client.setCredentials({
      access_token: token.access_token,
      refresh_token: token.refresh_token,
      expiry_date: token.expiry_date,
    });
  }

  driveClient = google.drive({ version: 'v3', auth: oauth2Client });
  return driveClient;
}

/**
 * List files in a folder or search for files
 */
export async function listFiles(options: {
  folderId?: string;
  query?: string;
  pageSize?: number;
  mimeType?: string;
}): Promise<{
  success: boolean;
  files?: Array<{
    id: string;
    name: string;
    mimeType: string;
    modifiedTime: string;
    size?: string;
  }>;
  error?: string;
}> {
  try {
    const drive = await getDriveClient();

    let q = '';
    const conditions: string[] = [];

    if (options.folderId) {
      conditions.push(`'${options.folderId}' in parents`);
    }

    if (options.query) {
      conditions.push(`name contains '${options.query}'`);
    }

    if (options.mimeType) {
      conditions.push(`mimeType = '${options.mimeType}'`);
    }

    conditions.push('trashed = false');
    q = conditions.join(' and ');

    const response = await drive.files.list({
      q,
      pageSize: options.pageSize || 20,
      fields: 'files(id, name, mimeType, modifiedTime, size)',
    });

    const files = (response.data.files || []).map((file) => {
      const item: {
        id: string;
        name: string;
        mimeType: string;
        modifiedTime: string;
        size?: string;
      } = {
        id: file.id || '',
        name: file.name || '',
        mimeType: file.mimeType || '',
        modifiedTime: file.modifiedTime || '',
      };
      if (file.size) {
        item.size = file.size;
      }
      return item;
    });

    return { success: true, files };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Search for files by name
 */
export async function searchFiles(
  query: string,
  pageSize = 20,
): Promise<{
  success: boolean;
  files?: Array<{
    id: string;
    name: string;
    mimeType: string;
    modifiedTime: string;
    parents?: string[];
  }>;
  error?: string;
}> {
  try {
    const drive = await getDriveClient();

    const response = await drive.files.list({
      q: `name contains '${query}' and trashed = false`,
      pageSize,
      fields: 'files(id, name, mimeType, modifiedTime, parents)',
    });

    const files = (response.data.files || []).map((file) => {
      const item: {
        id: string;
        name: string;
        mimeType: string;
        modifiedTime: string;
        parents?: string[];
      } = {
        id: file.id || '',
        name: file.name || '',
        mimeType: file.mimeType || '',
        modifiedTime: file.modifiedTime || '',
      };
      if (file.parents) {
        item.parents = file.parents;
      }
      return item;
    });

    return { success: true, files };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Read PDF file content from Google Drive
 */
export async function readPdfFile(fileId: string): Promise<{
  success: boolean;
  fileName?: string;
  content?: string;
  error?: string;
}> {
  try {
    const drive = await getDriveClient();

    // Get file metadata
    const fileMetadata = await drive.files.get({
      fileId,
      fields: 'name, mimeType',
    });

    const fileName = fileMetadata.data.name || 'unknown.pdf';
    const mimeType = fileMetadata.data.mimeType;

    if (mimeType !== 'application/pdf') {
      return {
        success: false,
        error: `File is not a PDF. MIME type: ${mimeType}`,
      };
    }

    // Download the file content
    const response = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'arraybuffer' },
    );

    const buffer = Buffer.from(response.data as ArrayBuffer);

    // Use pdf.js-extract to extract text (ESM compatible)
    const { PDFExtract } = await import('pdf.js-extract');
    const pdfExtract = new PDFExtract();
    const pdfData = await pdfExtract.extractBuffer(buffer);

    // Combine all text from all pages
    const text = pdfData.pages
      .map((page) => page.content.map((item) => item.str).join(' '))
      .join('\n\n');

    return {
      success: true,
      fileName,
      content: text,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Read any file from Google Drive (with format conversion for Google Workspace files)
 */
export async function readFile(fileId: string): Promise<{
  success: boolean;
  fileName?: string;
  mimeType?: string;
  content?: string;
  error?: string;
}> {
  try {
    const drive = await getDriveClient();

    // Get file metadata
    const fileMetadata = await drive.files.get({
      fileId,
      fields: 'name, mimeType',
    });

    const fileName = fileMetadata.data.name || 'unknown';
    const mimeType = fileMetadata.data.mimeType || '';

    let content: string;

    // Handle Google Workspace files
    if (mimeType === 'application/vnd.google-apps.document') {
      // Export Google Doc as plain text
      const response = await drive.files.export({
        fileId,
        mimeType: 'text/plain',
      });
      content = response.data as string;
    } else if (mimeType === 'application/vnd.google-apps.spreadsheet') {
      // Export Google Sheet as CSV
      const response = await drive.files.export({
        fileId,
        mimeType: 'text/csv',
      });
      content = response.data as string;
    } else if (mimeType === 'application/pdf') {
      // Handle PDF
      const result = await readPdfFile(fileId);
      if (!result.success) {
        return result;
      }
      return { success: true, fileName, mimeType, content: result.content || '' };
    } else {
      // Download as-is for other file types
      const response = await drive.files.get(
        { fileId, alt: 'media' },
        { responseType: 'text' },
      );
      content = response.data as string;
    }

    return { success: true, fileName, mimeType, content };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
