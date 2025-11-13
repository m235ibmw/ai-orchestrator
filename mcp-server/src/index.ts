import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

// ---- MCP Server ----
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

// ---- Register a simple tool ----
server.registerTool(
  'hello',
  {
    description: 'Returns おはこんばんわ',
  },
  async () => {
    return {
      content: [
        {
          type: 'text',
          text: 'おはこんばんわ',
        },
      ],
    };
  },
);

// ---- Main ----
async function main() {
  console.error('MCP server started (debug log)');
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error('MCP server failed:', err);
});
