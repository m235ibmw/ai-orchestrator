import fetch from 'node-fetch';

const OWNER = 'm235ibmw';
const REPO = 'ai-orchestrator';
const BRANCH = 'main';

interface GitHubFileResult {
  success: boolean;
  content?: string;
  file_path?: string;
  error?: string;
  download_url?: string;
}

/**
 * GitHubの特定ブランチから指定されたファイルパスの内容を取得
 *
 * @param filePath - リポジトリルートからの相対パス (e.g., "workflows/university/sekaishigairon/protocol.md")
 * @param branch - ブランチ名 (デフォルト: "main")
 * @returns ファイルの内容
 */
export async function getFileFromGitHub(
  filePath: string,
  branch: string = BRANCH
): Promise<GitHubFileResult> {
  try {
    // GitHub API endpoint for file contents
    const apiUrl = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${filePath}?ref=${branch}`;

    const res = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'ai-orchestrator-mcp',
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!res.ok) {
      return {
        success: false,
        error: `GitHub API error: ${res.status} ${res.statusText}. File path: ${filePath}`,
      };
    }

    const data = await res.json() as any;

    // GitHub API returns base64 encoded content
    if (data.encoding === 'base64' && data.content) {
      const decodedContent = Buffer.from(data.content, 'base64').toString('utf-8');

      return {
        success: true,
        content: decodedContent,
        file_path: filePath,
        download_url: data.download_url,
      };
    }

    // If it's too large, GitHub might not include content
    if (data.download_url) {
      const downloadRes = await fetch(data.download_url);

      if (!downloadRes.ok) {
        return {
          success: false,
          error: `Failed to download from ${data.download_url}: ${downloadRes.status}`,
        };
      }

      const content = await downloadRes.text();

      return {
        success: true,
        content,
        file_path: filePath,
        download_url: data.download_url,
      };
    }

    return {
      success: false,
      error: 'Could not retrieve file content from GitHub API response',
    };
  } catch (error) {
    return {
      success: false,
      error: `Exception occurred: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
