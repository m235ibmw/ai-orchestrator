import fetch from 'node-fetch';

const OWNER = 'm235ibmw';
const REPO = 'ai-orchestrator';

// 取得したい markdown ファイルのパス（必要なら .env 化）
const WORKFLOW_LIST_PATH = 'workflows/index.md';

/**
 * GitHub の workflow_list.md を取得してテキストで返す
 */
export async function getWorkflowList() {
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${WORKFLOW_LIST_PATH}`;

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'ai-orchestrator-mcp',
      Accept: 'application/vnd.github.v3+json',
    },
  });

  if (!res.ok) {
    console.error('[GitHub API ERROR]', res.status, res.statusText);
    return {
      ok: false,
      error: `GitHub returned ${res.status}`,
    };
  }

  // GitHub は Base64 で返してくるので decode が必要
  const json = (await res.json()) as any;

  const contentBase64 = json.content;
  const decodedText = Buffer.from(contentBase64, 'base64').toString('utf-8');

  return {
    ok: true,
    text: decodedText,
  };
}
