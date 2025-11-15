import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { getWorkflowList } from './tools/github/getWorkflowList.js';
import { getLessonPdfUrl } from './tools/browser.js';
import {
  getGoogleFormQuestions,
  submitGoogleForm,
} from './tools/googleForm.js';

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

server.registerTool(
  'get-protocol',
  {
    description:
      'Get the workflow protocol for 世界史概論 (sekaishigairon) from local file. Returns the complete protocol markdown content with all workflow steps, credentials, and form URLs.',
    inputSchema: {
      workflow_name: z
        .string()
        .optional()
        .describe('Workflow name (default: "sekaishigairon")'),
    },
  },
  async (params: any) => {
    const workflowName = params.workflow_name || 'sekaishigairon';
    const fs = await import('fs/promises');
    const path = await import('path');

    // Hardcode the project root path to ensure it works from Claude Desktop
    // The MCP server is configured to run from /Users/kurikinton/Documents/niko-dev/ai-orchestrator/mcp-server
    const projectRoot = '/Users/kurikinton/Documents/niko-dev/ai-orchestrator';
    const protocolPath = path.join(
      projectRoot,
      'workflows',
      'university',
      workflowName,
      'protocol.md',
    );

    try {
      const content = await fs.readFile(protocolPath, 'utf-8');
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: true,
                workflow: workflowName,
                protocol_path: protocolPath,
                content: content,
              },
              null,
              2,
            ),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: false,
                workflow: workflowName,
                error: `Failed to read protocol file: ${error instanceof Error ? error.message : String(error)}`,
                attempted_path: protocolPath,
              },
              null,
              2,
            ),
          },
        ],
      };
    }
  },
);

server.registerTool(
  'get-lesson-pdf-url',
  {
    description:
      'Get PDF content for a specific course lesson by navigating the classroom website using Puppeteer. Downloads the PDF, extracts text using pdf-parse library, and returns both the localhost URL and extracted text content. The pdf_text field contains the full text content of the PDF.',
    inputSchema: {
      course_name: z
        .string()
        .describe('Name of the course (e.g., "世界史概論", "日本史")'),
      lesson_number: z.number().describe('Lesson number (e.g., 1, 2, 3)'),
      username: z.string().describe('Login username for the classroom site'),
      password: z.string().describe('Login password for the classroom site'),
      base_url: z
        .string()
        .optional()
        .describe(
          'Base URL of the classroom site (default: http://localhost:3000)',
        ),
    },
  },
  async (params: any) => {
    console.error(
      '[MCP] get-lesson-pdf-url called with params:',
      JSON.stringify(params),
    );
    const { course_name, lesson_number, username, password, base_url } = params;

    if (!course_name || !lesson_number || !username || !password) {
      console.error('[MCP] Missing required parameters');
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error:
                'Missing required parameters: course_name, lesson_number, username, password',
            }),
          },
        ],
      };
    }

    console.error('[MCP] Calling getLessonPdfUrl...');
    const result = await getLessonPdfUrl(
      course_name,
      lesson_number,
      { username, password },
      base_url,
    );

    console.error('[MCP] getLessonPdfUrl result:', JSON.stringify(result));
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  },
);

server.registerTool(
  'get-google-form-questions',
  {
    description:
      'Retrieve questions and choices from a Google Form URL using Puppeteer. Returns all questions with their choices for answering.',
    inputSchema: {
      form_url: z
        .string()
        .url()
        .describe(
          'Google Form URL (e.g., https://docs.google.com/forms/d/e/...)',
        ),
    },
  },
  async (params: any) => {
    const result = await getGoogleFormQuestions(params.form_url);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  },
);

server.registerTool(
  'submit-google-form',
  {
    description:
      'Submit answers to a Google Form using Puppeteer. Provide student info (name, student_id) and question answers.',
    inputSchema: {
      form_url: z.string().url().describe('Google Form URL'),
      name: z.string().describe('Student name (e.g., "kurihara yuya")'),
      student_id: z.string().describe('Student ID (e.g., "12345A")'),
      answers: z
        .array(
          z.object({
            question_number: z.number().describe('Question number (1-indexed)'),
            answer: z
              .string()
              .describe('Answer text matching one of the choices'),
          }),
        )
        .describe('Array of answers to submit'),
    },
  },
  async (params: any) => {
    const studentInfo = {
      name: params.name,
      student_id: params.student_id,
    };
    const result = await submitGoogleForm(
      params.form_url,
      studentInfo,
      params.answers,
    );
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  },
);

server.registerTool(
  'validate-answers-gpt-mock',
  {
    description:
      'Validate quiz answers using GPT Mock API. Sends questions, proposed answers, and reference material to validation endpoint. Returns confidence scores and suggested changes.',
    inputSchema: {
      questions: z
        .array(
          z.object({
            question_number: z.number(),
            question_text: z.string(),
            choices: z.array(z.string()),
            question_type: z.enum(['multiple_choice', 'checkbox', 'text']),
          }),
        )
        .describe('Questions from the form'),
      proposed_answers: z
        .array(
          z.object({
            question_number: z.number(),
            answer: z.string(),
          }),
        )
        .describe('Proposed answers to validate'),
      reference_material: z
        .string()
        .describe('Reference material (PDF text content) for validation'),
      api_url: z
        .string()
        .optional()
        .describe(
          'GPT Mock API URL (default: http://localhost:3000/api/gpt-mock)',
        ),
    },
  },
  async (params: any) => {
    const apiUrl = params.api_url || 'http://localhost:3000/api/gpt-mock';

    try {
      const fetchModule = await import('node-fetch');
      const fetch = fetchModule.default;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          questions: params.questions,
          proposed_answers: params.proposed_answers,
          reference_material: params.reference_material,
        }),
      });

      if (!response.ok) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: `HTTP ${response.status}: ${response.statusText}`,
              }),
            },
          ],
        };
      }

      const result: any = await response.json();
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: true,
                ...result,
              },
              null,
              2,
            ),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: `Failed to validate answers: ${error instanceof Error ? error.message : String(error)}`,
            }),
          },
        ],
      };
    }
  },
);

async function main() {
  console.error('MCP server started (debug log)');
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

// debug のみなら debugMode を実行して終了
if (process.argv[2] === 'debug') {
  debugMode();
} else {
  main().catch((err) => {
    console.error('MCP server failed:', err);
  });
}
