import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { execSync } from 'child_process';
// import { getWorkflowList } from './tools/github/getWorkflowList.js';
// import { getLessonPdfUrl } from './tools/browser.js';
// import {
//   getGoogleFormQuestions,
//   submitGoogleForm,
// } from './tools/googleForm.js';
import {
  listFiles as driveListFiles,
  searchFiles as driveSearchFiles,
  readPdfFile as driveReadPdf,
  readFile as driveReadFile,
  createFolder as driveCreateFolder,
  createFoldersBatch as driveCreateFoldersBatch,
  moveFile as driveMoveFile,
  deleteFile as driveDeleteFile,
  createFile as driveCreateFile,
} from './tools/gdrive.js';
import { getYoutubeTranscript } from './tools/youtube.js';
import { sendNotification } from './tools/notify.js';
import {
  submitExpenseForm,
  getFormOptions,
  CATEGORIES,
  PAYMENT_METHODS,
  type ExpenseEntry,
} from './tools/expenseForm.js';

// Clasp GAS runner directory
const CLASP_RUNNER_DIR = `${process.env.HOME}/clasp-gas-runner`;

// GAS Web App URL
const GAS_WEB_APP_URL =
  'https://script.google.com/macros/s/AKfycbzOhx_Ycze5QTN8-1h8UGjJUMHflIkTzIgnTKUyWJNCuo61rpE6tutJ9KszPRfDboK0Cg/exec';

// --------------------------
// SIMPLE DEBUG MODE
// --------------------------
async function debugMode() {
  console.log('=== DEBUG MODE: running manual test ===');

  // ★★★ ここに今試したい関数を書くだけ ★★★
  const result = await driveSearchFiles('test');

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

// server.registerTool(
//   'hello',
//   { description: 'Returns おはこんばんわ' },
//   async () => ({
//     content: [
//       {
//         type: 'text',
//         text: 'おはこんばんわ',
//       },
//     ],
//   }),
// );

// server.registerTool(
//   'get-workflow-list',
//   {
//     description:
//       'Retrieve workflow protocol files (workflows/**/protocol.md) from GitHub repo.',
//   },
//   async () => {
//     const list = await getWorkflowList();
//     return {
//       content: [{ type: 'text', text: JSON.stringify(list, null, 2) }],
//     };
//   },
// );

// server.registerTool(
//   'get-protocol',
//   {
//     description:
//       'Get the workflow protocol for 世界史概論 (sekaishigairon) from local file. Returns the complete protocol markdown content with all workflow steps, credentials, and form URLs.',
//     inputSchema: {
//       workflow_name: z
//         .string()
//         .optional()
//         .describe('Workflow name (default: "sekaishigairon")'),
//     },
//   },
//   async (params: any) => {
//     const workflowName = params.workflow_name || 'sekaishigairon';
//     const fs = await import('fs/promises');
//     const path = await import('path');

//     // Hardcode the project root path to ensure it works from Claude Desktop
//     // The MCP server is configured to run from /Users/kurikinton/Documents/niko-dev/ai-orchestrator/mcp-server
//     const projectRoot = '/Users/kurikinton/Documents/niko-dev/ai-orchestrator';
//     const protocolPath = path.join(
//       projectRoot,
//       'workflows',
//       'university',
//       workflowName,
//       'protocol.md',
//     );

//     try {
//       const content = await fs.readFile(protocolPath, 'utf-8');
//       return {
//         content: [
//           {
//             type: 'text',
//             text: JSON.stringify(
//               {
//                 success: true,
//                 workflow: workflowName,
//                 protocol_path: protocolPath,
//                 content: content,
//               },
//               null,
//               2,
//             ),
//           },
//         ],
//       };
//     } catch (error) {
//       return {
//         content: [
//           {
//             type: 'text',
//             text: JSON.stringify(
//               {
//                 success: false,
//                 workflow: workflowName,
//                 error: `Failed to read protocol file: ${error instanceof Error ? error.message : String(error)}`,
//                 attempted_path: protocolPath,
//               },
//               null,
//               2,
//             ),
//           },
//         ],
//       };
//     }
//   },
// );

// server.registerTool(
//   'get-lesson-pdf-url',
//   {
//     description:
//       'Get PDF content for a specific course lesson by navigating the classroom website using Puppeteer. Downloads the PDF, extracts text using pdf-parse library, and returns both the localhost URL and extracted text content. The pdf_text field contains the full text content of the PDF.',
//     inputSchema: {
//       course_name: z
//         .string()
//         .describe('Name of the course (e.g., "世界史概論", "日本史")'),
//       lesson_number: z.number().describe('Lesson number (e.g., 1, 2, 3)'),
//       username: z.string().describe('Login username for the classroom site'),
//       password: z.string().describe('Login password for the classroom site'),
//       base_url: z
//         .string()
//         .optional()
//         .describe(
//           'Base URL of the classroom site (default: http://localhost:3000)',
//         ),
//     },
//   },
//   async (params: any) => {
//     console.error(
//       '[MCP] get-lesson-pdf-url called with params:',
//       JSON.stringify(params),
//     );
//     const { course_name, lesson_number, username, password, base_url } = params;

//     if (!course_name || !lesson_number || !username || !password) {
//       console.error('[MCP] Missing required parameters');
//       return {
//         content: [
//           {
//             type: 'text',
//             text: JSON.stringify({
//               success: false,
//               error:
//                 'Missing required parameters: course_name, lesson_number, username, password',
//             }),
//           },
//         ],
//       };
//     }

//     console.error('[MCP] Calling getLessonPdfUrl...');
//     const result = await getLessonPdfUrl(
//       course_name,
//       lesson_number,
//       { username, password },
//       base_url,
//     );

//     console.error('[MCP] getLessonPdfUrl result:', JSON.stringify(result));
//     return {
//       content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
//     };
//   },
// );

// server.registerTool(
//   'get-google-form-questions',
//   {
//     description:
//       'Retrieve questions and choices from a Google Form URL using Puppeteer. Returns all questions with their choices for answering.',
//     inputSchema: {
//       form_url: z
//         .string()
//         .url()
//         .describe(
//           'Google Form URL (e.g., https://docs.google.com/forms/d/e/...)',
//         ),
//     },
//   },
//   async (params: any) => {
//     const result = await getGoogleFormQuestions(params.form_url);
//     return {
//       content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
//     };
//   },
// );

// server.registerTool(
//   'submit-google-form',
//   {
//     description:
//       'Submit answers to a Google Form using Puppeteer. Provide student info (name, student_id) and question answers.',
//     inputSchema: {
//       form_url: z.string().url().describe('Google Form URL'),
//       name: z.string().describe('Student name (e.g., "kurihara yuya")'),
//       student_id: z.string().describe('Student ID (e.g., "12345A")'),
//       answers: z
//         .array(
//           z.object({
//             question_number: z.number().describe('Question number (1-indexed)'),
//             answer: z
//               .string()
//               .describe('Answer text matching one of the choices'),
//           }),
//         )
//         .describe('Array of answers to submit'),
//     },
//   },
//   async (params: any) => {
//     const studentInfo = {
//       name: params.name,
//       student_id: params.student_id,
//     };
//     const result = await submitGoogleForm(
//       params.form_url,
//       studentInfo,
//       params.answers,
//     );
//     return {
//       content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
//     };
//   },
// );

// server.registerTool(
//   'validate-answers-gpt-mock',
//   {
//     description:
//       'Validate quiz answers using GPT Mock API. Sends questions and proposed answers to validation endpoint. Returns confidence scores and suggested changes. IMPORTANT: Do NOT include reference_material to keep request size small.',
//     inputSchema: {
//       questions: z
//         .array(
//           z.object({
//             question_number: z.number(),
//             question_text: z.string(),
//             choices: z.array(z.string()),
//             question_type: z.enum(['multiple_choice', 'checkbox', 'text']),
//           }),
//         )
//         .describe('Questions from the form'),
//       proposed_answers: z
//         .array(
//           z.object({
//             question_number: z.number(),
//             answer: z.string(),
//           }),
//         )
//         .describe('Proposed answers to validate'),
//       api_url: z
//         .string()
//         .optional()
//         .describe(
//           'GPT Mock API URL (default: http://localhost:3000/api/gpt-mock)',
//         ),
//     },
//   },
//   async (params: any) => {
//     const apiUrl = params.api_url || 'http://localhost:3000/api/gpt-mock';

//     try {
//       const fetchModule = await import('node-fetch');
//       const fetch = fetchModule.default;

//       const response = await fetch(apiUrl, {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({
//           questions: params.questions,
//           proposed_answers: params.proposed_answers,
//           // reference_material is intentionally omitted to reduce request size
//         }),
//       });

//       if (!response.ok) {
//         return {
//           content: [
//             {
//               type: 'text',
//               text: JSON.stringify({
//                 success: false,
//                 error: `HTTP ${response.status}: ${response.statusText}`,
//               }),
//             },
//           ],
//         };
//       }

//       const result: any = await response.json();
//       return {
//         content: [
//           {
//             type: 'text',
//             text: JSON.stringify(
//               {
//                 success: true,
//                 ...result,
//               },
//               null,
//               2,
//             ),
//           },
//         ],
//       };
//     } catch (error) {
//       return {
//         content: [
//           {
//             type: 'text',
//             text: JSON.stringify({
//               success: false,
//               error: `Failed to validate answers: ${error instanceof Error ? error.message : String(error)}`,
//             }),
//           },
//         ],
//       };
//     }
//   },
// );

// --------------------------
// CLASP GAS RUNNER TOOLS
// --------------------------

// --------------------------
// GOOGLE DRIVE TOOLS
// --------------------------

server.registerTool(
  'drive_search',
  {
    description:
      'Search for files in Google Drive by name. Returns file IDs, names, MIME types, and parent folder IDs.',
    inputSchema: {
      query: z.string().describe('Search query (file name or partial name)'),
      page_size: z
        .number()
        .optional()
        .describe('Number of results to return (default: 20)'),
    },
  },
  async (params: any) => {
    const result = await driveSearchFiles(params.query, params.page_size);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  },
);

server.registerTool(
  'drive_list_files',
  {
    description:
      'List files in a Google Drive folder. Provide folder ID to list contents.',
    inputSchema: {
      folder_id: z.string().optional().describe('Folder ID to list files from'),
      query: z.string().optional().describe('Filter by name (optional)'),
      mime_type: z
        .string()
        .optional()
        .describe('Filter by MIME type (e.g., "application/pdf")'),
      page_size: z
        .number()
        .optional()
        .describe('Number of results to return (default: 20)'),
    },
  },
  async (params: any) => {
    const result = await driveListFiles({
      folderId: params.folder_id,
      query: params.query,
      mimeType: params.mime_type,
      pageSize: params.page_size,
    });
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  },
);

server.registerTool(
  'drive_read_pdf',
  {
    description:
      'Read and extract text content from a PDF file in Google Drive. Provide the file ID.',
    inputSchema: {
      file_id: z.string().describe('Google Drive file ID of the PDF'),
    },
  },
  async (params: any) => {
    const result = await driveReadPdf(params.file_id);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  },
);

server.registerTool(
  'drive_read_file',
  {
    description:
      'Read content from a file in Google Drive. Supports PDF (text extraction), Google Docs (as plain text), Google Sheets (as CSV), and other text files.',
    inputSchema: {
      file_id: z.string().describe('Google Drive file ID'),
    },
  },
  async (params: any) => {
    const result = await driveReadFile(params.file_id);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  },
);

server.registerTool(
  'drive_create_folder',
  {
    description:
      'Create a new folder in Google Drive. Returns the folder ID, name, and web URL.',
    inputSchema: {
      folder_name: z.string().describe('Name of the folder to create'),
      parent_folder_id: z
        .string()
        .optional()
        .describe('Parent folder ID (optional, defaults to root)'),
    },
  },
  async (params: any) => {
    const result = await driveCreateFolder(
      params.folder_name,
      params.parent_folder_id,
    );
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  },
);

server.registerTool(
  'drive_create_folders_batch',
  {
    description:
      'Create multiple folders in batch within the same parent folder.',
    inputSchema: {
      folder_names: z
        .array(z.string())
        .describe('Array of folder names to create'),
      parent_folder_id: z
        .string()
        .optional()
        .describe('Parent folder ID (optional, defaults to root)'),
    },
  },
  async (params: any) => {
    const result = await driveCreateFoldersBatch(
      params.folder_names,
      params.parent_folder_id,
    );
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  },
);

server.registerTool(
  'drive_move_file',
  {
    description:
      'Move a file or folder to a different parent folder in Google Drive.',
    inputSchema: {
      file_id: z.string().describe('ID of the file or folder to move'),
      new_parent_id: z.string().describe('ID of the destination folder'),
    },
  },
  async (params: any) => {
    const result = await driveMoveFile(params.file_id, params.new_parent_id);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  },
);

server.registerTool(
  'drive_delete_file',
  {
    description:
      'Delete a file or folder. By default moves to trash; set permanent=true to permanently delete.',
    inputSchema: {
      file_id: z.string().describe('ID of the file or folder to delete'),
      permanent: z
        .boolean()
        .optional()
        .describe('If true, permanently delete; if false (default), move to trash'),
    },
  },
  async (params: any) => {
    const result = await driveDeleteFile(params.file_id, params.permanent);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  },
);

server.registerTool(
  'drive_create_file',
  {
    description:
      'Create a new file in Google Drive. Supports plain text, JSON, CSV, and other text-based files. Can also create Google Docs/Sheets/Slides.',
    inputSchema: {
      file_name: z.string().describe('Name of the file to create (e.g., "notes.txt", "data.json")'),
      content: z.string().describe('Content of the file'),
      mime_type: z
        .string()
        .optional()
        .describe(
          'MIME type of the file. Default: "text/plain". Use "application/vnd.google-apps.document" for Google Doc, "application/vnd.google-apps.spreadsheet" for Google Sheet',
        ),
      parent_folder_id: z
        .string()
        .optional()
        .describe('ID of the parent folder. If not specified, creates in root'),
    },
  },
  async (params: any) => {
    const result = await driveCreateFile(
      params.file_name,
      params.content,
      params.mime_type || 'text/plain',
      params.parent_folder_id,
    );
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  },
);

// --------------------------
// YOUTUBE TOOLS
// --------------------------

server.registerTool(
  'youtube_transcript',
  {
    description:
      'Download YouTube video transcript/subtitles and save as plain text file. Removes timestamps and deduplicates text. Uses yt-dlp (must be installed).',
    inputSchema: {
      url: z.string().describe('YouTube URL (regular or shortened format)'),
      lang: z
        .string()
        .optional()
        .describe('Subtitle language code (default: "ja")'),
    },
  },
  async (params: any) => {
    const result = await getYoutubeTranscript(params.url, params.lang);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  },
);

// --------------------------
// NOTIFICATION TOOLS
// --------------------------

server.registerTool(
  'notify',
  {
    description:
      'Send a desktop notification via ntfy.sh. Useful for alerting the user when long-running tasks complete.',
    inputSchema: {
      title: z.string().describe('Notification title'),
      message: z.string().describe('Notification message body'),
    },
  },
  async (params: { title: string; message: string }) => {
    const result = await sendNotification(params.title, params.message);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  },
);

// --------------------------
// EXPENSE FORM TOOLS
// --------------------------

server.registerTool(
  'expense_submit',
  {
    description: `Submit an expense entry to the household budget Google Form.

【カテゴリ】${CATEGORIES.join(' | ')}

【決済手段】${PAYMENT_METHODS.join(' | ')}

Date formats: YYYY-MM-DD, MM/DD, M月D日, "today"`,
    inputSchema: {
      date: z
        .string()
        .describe('Date of expense (YYYY-MM-DD, MM/DD, or "today")'),
      category: z
        .enum(CATEGORIES)
        .describe('Category of expense'),
      item: z
        .string()
        .describe('Item description (e.g., "弁当, パン, 水", "荷揚げ1回", "ローン引落")'),
      amount: z
        .number()
        .describe('Total amount in yen (e.g., 750)'),
      payment_method: z
        .enum(PAYMENT_METHODS)
        .describe('Payment method used'),
      memo: z
        .string()
        .optional()
        .describe('Optional memo (e.g., "コンビニ", "11/26稼働分", "11/30入金予定")'),
    },
  },
  async (params: {
    date: string;
    category: (typeof CATEGORIES)[number];
    item: string;
    amount: number;
    payment_method: (typeof PAYMENT_METHODS)[number];
    memo?: string | undefined;
  }) => {
    const entry: ExpenseEntry = {
      date: params.date,
      category: params.category,
      item: params.item,
      amount: params.amount,
      paymentMethod: params.payment_method,
      ...(params.memo !== undefined && { memo: params.memo }),
    };
    const result = await submitExpenseForm(entry);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  },
);

server.registerTool(
  'expense_get_options',
  {
    description:
      'Get the list of valid categories and payment methods for the expense form. Use this to show the user available options.',
  },
  async () => {
    const options = getFormOptions();
    return {
      content: [{ type: 'text', text: JSON.stringify(options, null, 2) }],
    };
  },
);

// --------------------------
// CLASP GAS RUNNER TOOLS
// --------------------------

server.registerTool(
  'gas_create_project',
  {
    description:
      'Create a new Google Apps Script project bound to a Google Spreadsheet using clasp. The project will be stored in ~/clasp-gas-runner/ directory.',
    inputSchema: {
      title: z.string().describe('Title for the GAS project'),
      spreadsheetId: z
        .string()
        .describe('Google Spreadsheet ID to bind the project to'),
    },
  },
  async (params: { title: string; spreadsheetId: string }) => {
    const fs = await import('fs/promises');
    const path = await import('path');

    try {
      // Ensure the runner directory exists
      await fs.mkdir(CLASP_RUNNER_DIR, { recursive: true });

      // Check if a project already exists
      const claspJsonPath = path.join(CLASP_RUNNER_DIR, '.clasp.json');
      try {
        await fs.access(claspJsonPath);
        // Project exists, return info
        const existingConfig = await fs.readFile(claspJsonPath, 'utf-8');
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  message: 'Project already exists in runner directory',
                  existing_config: JSON.parse(existingConfig),
                  directory: CLASP_RUNNER_DIR,
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch {
        // No existing project, create new one
      }

      // Create the GAS project bound to the spreadsheet
      const createCmd = `clasp create --type sheets --title "${params.title}" --parentId "${params.spreadsheetId}"`;
      console.error(`[MCP] Running: ${createCmd}`);

      const output = execSync(createCmd, {
        cwd: CLASP_RUNNER_DIR,
        encoding: 'utf-8',
        timeout: 30000,
      });

      // Read the created .clasp.json to confirm
      const config = await fs.readFile(claspJsonPath, 'utf-8');

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: true,
                message: 'GAS project created successfully',
                output: output.trim(),
                config: JSON.parse(config),
                directory: CLASP_RUNNER_DIR,
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
                error: `Failed to create GAS project: ${error instanceof Error ? error.message : String(error)}`,
                directory: CLASP_RUNNER_DIR,
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
  'gas_run',
  {
    description:
      'Execute Google Apps Script code via Web App. IMPORTANT: Do NOT wrap code in a function - write executable statements directly. Use "return" at the end to return a value. Supports SpreadsheetApp, DocumentApp, DriveApp, etc.',
    inputSchema: {
      code: z
        .string()
        .describe(
          'Google Apps Script code to execute directly (NOT wrapped in a function). Use "return" to return a value. Example: const doc = DocumentApp.create("My Doc"); return { id: doc.getId(), url: doc.getUrl() };',
        ),
    },
  },
  async (params: { code: string }) => {
    try {
      const fetchModule = await import('node-fetch');
      const fetch = fetchModule.default;

      // URL encode the code and send via GET
      const encodedCode = encodeURIComponent(params.code);
      const url = `${GAS_WEB_APP_URL}?code=${encodedCode}`;

      console.error(`[MCP] Calling GAS Web App with code length: ${params.code.length}`);

      const response = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
      });

      if (!response.ok) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: false,
                  error: `HTTP ${response.status}: ${response.statusText}`,
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      const result = await response.json();
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: false,
                error: `Failed to run GAS code: ${errorMessage}`,
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
  'gas_call_function',
  {
    description:
      'Call a predefined GAS function by name. Use this for operations that fail with gas_run (like DataValidation). Available functions: setDropdownValidation(spreadsheetId, sheetName, range, values), query(spreadsheetId, project[], type[]) - get metadata without Content column, getContent(spreadsheetId, ids[]) - get Content by IDs, addRow(spreadsheetId, project, type, title, content, killerCase) - add new row with auto ID/Date',
    inputSchema: {
      fn: z.string().describe('Function name to call (e.g., "setDropdownValidation")'),
      args: z
        .array(z.any())
        .describe(
          'Arguments to pass to the function as an array. Example for setDropdownValidation: ["spreadsheetId", "sheetName", "B2:B1000", ["option1", "option2"]]',
        ),
    },
  },
  async (params: { fn: string; args: unknown[] }) => {
    try {
      const fetchModule = await import('node-fetch');
      const fetch = fetchModule.default;

      const encodedArgs = encodeURIComponent(JSON.stringify(params.args));
      const url = `${GAS_WEB_APP_URL}?fn=${params.fn}&args=${encodedArgs}`;

      console.error(`[MCP] Calling GAS function: ${params.fn}`);

      const response = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
      });

      if (!response.ok) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: false,
                  error: `HTTP ${response.status}: ${response.statusText}`,
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      const result = await response.json();
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: false,
                error: `Failed to call GAS function: ${errorMessage}`,
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
