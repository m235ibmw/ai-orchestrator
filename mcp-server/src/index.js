import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { getWorkflowList } from './tools/github/getWorkflowList.js';
import { getLessonPdfUrl, closeBrowser } from './tools/browser.js';
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
}
else {
    main().catch((err) => {
        console.error('MCP server failed:', err);
    });
}
// --------------------------
// MCP SERVER
// --------------------------
const server = new McpServer({
    name: 'ai-orchestrator',
    version: '0.0.1',
}, {
    capabilities: {
        tools: {},
        resources: {
            list: async () => ({ resources: [] }),
            get: async () => {
                throw new Error('No resources');
            },
        },
    },
});
server.registerTool('hello', { description: 'Returns おはこんばんわ' }, async () => ({
    content: [
        {
            type: 'text',
            text: 'おはこんばんわ',
        },
    ],
}));
server.registerTool('get-workflow-list', {
    description: 'Retrieve workflow protocol files (workflows/**/protocol.md) from GitHub repo.',
}, async () => {
    const list = await getWorkflowList();
    return {
        content: [{ type: 'text', text: JSON.stringify(list, null, 2) }],
    };
});
server.registerTool('get-lesson-pdf-url', {
    description: 'Get PDF URL for a specific course lesson by navigating the classroom website using Puppeteer. Downloads the PDF and saves it to a temporary file, then returns the file path for Claude to read.',
    inputSchema: {
        course_name: z.string().describe('Name of the course (e.g., "世界史概論", "日本史")'),
        lesson_number: z.number().describe('Lesson number (e.g., 1, 2, 3)'),
        username: z.string().describe('Login username for the classroom site'),
        password: z.string().describe('Login password for the classroom site'),
        base_url: z.string().optional().describe('Base URL of the classroom site (default: http://localhost:3000)'),
    },
}, async (params) => {
    const { course_name, lesson_number, username, password, base_url } = params;
    if (!course_name || !lesson_number || !username || !password) {
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        success: false,
                        error: 'Missing required parameters: course_name, lesson_number, username, password',
                    }),
                },
            ],
        };
    }
    const result = await getLessonPdfUrl(course_name, lesson_number, { username, password }, base_url);
    return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
});
async function main() {
    console.error('MCP server started (debug log)');
    const transport = new StdioServerTransport();
    await server.connect(transport);
}
main().catch((err) => {
    console.error('MCP server failed:', err);
});
//# sourceMappingURL=index.js.map