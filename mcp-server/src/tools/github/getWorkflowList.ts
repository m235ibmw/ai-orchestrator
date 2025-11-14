import fetch from 'node-fetch';

const OWNER = 'm235ibmw';
const REPO = 'ai-orchestrator';

/**
 * GitHub の workflows ディレクトリから Markdown ファイル一覧を取得
 */
export async function getWorkflowList() {
  const apiUrl = `https://api.github.com/repos/${OWNER}/${REPO}/contents/workflows`;

  const res = await fetch(apiUrl, {
    headers: {
      'User-Agent': 'ai-orchestrator-mcp',
      Accept: 'application/vnd.github.v3+json',
    },
  });

  if (!res.ok) {
    return {
      error: true,
      message: `GitHub API error: ${res.status} ${res.statusText}`,
    };
  }

  const data = await res.json() as any;

  // フォルダ以下も欲しいので、子ディレクトリを掘る
  const workflows: any[] = [];

  for (const item of data) {
    if (item.type === 'file' && item.name.endsWith('.md')) {
      workflows.push({
        name: item.name,
        path: item.path,
        type: 'file',
        download_url: item.download_url,
      });
    }

    if (item.type === 'dir') {
      const childUrl = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${item.path}`;
      const childRes = await fetch(childUrl, {
        headers: { 'User-Agent': 'ai-orchestrator-mcp' },
      });

      if (childRes.ok) {
        const childData: any = await childRes.json();
        for (const c of childData) {
          if (c.type === 'file' && c.name.endsWith('.md')) {
            workflows.push({
              name: c.name,
              path: c.path,
              type: 'file',
              download_url: c.download_url,
            });
          }
        }
      }
    }
  }

  return {
    ok: true,
    count: workflows.length,
    files: workflows,
  };
}
