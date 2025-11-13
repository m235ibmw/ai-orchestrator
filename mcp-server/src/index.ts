import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
// import { getWorkflowList } from './tools/github/getWorkflowList.ts';
import { getWorkflowList } from './tools/github/getWorkflowList.js';

// --------------------------
// SIMPLE DEBUG MODE
// --------------------------
async function debugMode() {
  console.log('=== DEBUG MODE: running manual test ===');

  // ★★★ ここに今試したい関数を書くだけ ★★★
  const result = await getWorkflowList();

  console.log('DEBUG RESULT:\n', JSON.stringify(result, null, 2));
  process.exit(0);
}

// debug のみなら debugMode を実行して終了
// ---- Debug Mode ----
if (process.argv[2] === 'debug') {
  debugMode();
} else {
  main().catch((err) => {
    console.error('MCP server failed:', err);
  });
}

// --------------------------
// MCP SERVER
// --------------------------
const server = new McpServer(
  {
    name: 'ai-orchestrator',
    version: '0.0.1',
  },
  {
    capabilities: {
      tools: {},
      resources: {
        list: async () => ({ resources: [] }),
        get: async () => {
          throw new Error('No resources');
        },
      },
    },
  },
);

server.registerTool(
  'hello',
  { description: 'Returns おはこんばんわ' },
  async () => ({
    content: [
      {
        type: 'text',
        text: 'おはこんばんわ',
      },
    ],
  }),
);

server.registerTool(
  'get-workflow-list',
  {
    description:
      'Retrieve workflow protocol files (workflows/**/protocol.md) from GitHub repo.',
  },
  async () => {
    const list = await getWorkflowList();
    return {
      content: [{ type: 'text', text: JSON.stringify(list, null, 2) }],
    };
  },
);

async function main() {
  console.error('MCP server started (debug log)');
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error('MCP server failed:', err);
});
