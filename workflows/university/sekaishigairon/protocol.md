# Protocol: 世界史概論（sekaishigairon）

世界史概論の課題処理ワークフローを AI オーケストレーションで実行するためのプロトコル。

## Status

- Version: 1.0.0
- Purpose: Claude Desktop がこの手順を読み、MCP tools を呼び出しながら自動課題処理を実行する
- Last Updated: 2025-11-15

## 🚨 CRITICAL EXECUTION RULES（厳守事項）

**Claude Desktop は以下のルールを必ず守ること：**

1. **自動リトライをしない** - ツール実行が失敗した場合、勝手にリトライせずユーザーに報告
2. **自動修復をしない** - エラーが発生しても推測で修正せず、ユーザーに確認
3. **ワークフロー外の判断をしない** - このプロトコルに記載されていない処理は実行しない
4. **"推測による修正"を行わない** - 不確実な情報で処理を進めない
5. **必ず protocol.md の指示のみを実行** - 独自の判断や最適化を加えない
6. **不明な点は質問する（推論しない）** - 曖昧な指示があればユーザーに確認
7. **API 結果・MCP 結果が null / empty / undefined の場合は即 Exit** - 空の結果で処理を続行しない

**目的：トークン節約と誤動作防止**

---

## Prerequisites

### Required MCP Servers

1. **ai-orchestrator** - Custom MCP server with classroom automation tools
2. **gsheets** - Google Sheets integration for credential management
3. **sequential-thinking** (optional) - Enhanced reasoning capabilities

### Required Data

- Student ID (e.g., "12345A")
- Course name (e.g., "世界史概論")
- Lesson number (e.g., 2)
- Google Spreadsheet ID with credentials sheet named "認証情報"

### Running Services

- Classroom site: http://localhost:3000 (Next.js app)
- MCP server: Running via ts-node

## Workflow Steps

### Step 0: Check Prerequisites & Use Demo Data

**IMPORTANT**: For demo/testing purposes, use the following hardcoded credentials instead of Google Sheets:

```json
{
  "name": "kurihara yuya",
  "student_id": "12345A",
  "classroom_username": "student",
  "classroom_password": "password123"
}
```

**Form URL for 世界史概論 第 2 回**:

```
https://docs.google.com/forms/d/e/1FAIpQLSfIZgtHH8FJudeMNlW1oyzmI8LKqHiZD9jkP-UYSeTIGdVtww/viewform
```

**Skip to Step 2 directly** using above credentials.

---

### Step 1: Retrieve Student Credentials (OPTIONAL - for production)

**Tool**: `gsheets` MCP tool

**Action**: Retrieve student credentials from Google Sheets by student_id

**Input**:

- Spreadsheet ID
- Sheet name: "認証情報"
- Query: student_id column matches the target student ID

**Output**:

```json
{
  "name": "kurihara yuya",
  "student_id": "12345A",
  "classroom_username": "student",
  "classroom_password": "password123"
}
```

**Error Handling**:

- If student not found, abort workflow and notify user
- If sheet not accessible, check service account permissions
- **If gsheets tool not configured, use demo data from Step 0**

---

### Step 2: Login to LMS and Retrieve Course Material with PDF Text

**CRITICAL**: You MUST call the MCP tool `get-lesson-pdf-url` with these exact parameters:

```json
{
  "course_name": "世界史概論",
  "lesson_number": 2,
  "username": "student",
  "password": "password123",
  "base_url": "http://localhost:3000"
}
```

**Expected Response** (extract `pdf_text` from this):

```json
{
  "success": true,
  "pdf_url": "http://localhost:3000/api/pdf/course-1234567890-lesson-2.pdf",
  "pdf_text": "World History: Greek and Roman Era\n\nAncient Greece...",
  "lesson_title": "第2回: ギリシャ・ローマ時代",
  "course_name": "世界史概論"
}
```

**MANDATORY NEXT ACTION**:
Immediately after receiving the response, extract the `pdf_text` value and proceed to Step 3.
DO NOT skip Step 3. The MCP server has already extracted the PDF text content for you.

---

### Step 3: Verify and Use PDF Text Content (MANDATORY)

**CRITICAL**: You MUST verify that the `pdf_text` field from Step 2 contains valid content.

**Input**: The `pdf_text` value from Step 2's response

**Action**:

1. Check that `pdf_text` is not empty or null
2. Verify you can see meaningful content about Greek and Roman history
3. Store this text for use in answering questions in Step 5

**What you should see in pdf_text**:

- Content about Ancient Greece (democracy, Athens, Sparta)
- Content about Roman Republic and Roman Empire
- Historical dates and key figures

**Why this works**:
- MCP server downloads PDF from the classroom site
- MCP server uses `pdf-parse` library to extract text from the PDF
- The extracted text is returned directly in the MCP response
- No need for WebFetch or Read tools

**If pdf_text is empty or null**:

- Check that the MCP tool returned `success: true`
- Verify the classroom site is running on localhost:3000
- Check MCP server logs for PDF parsing errors
- **DO NOT proceed to Step 4 without valid PDF text**

---

### Step 4: Retrieve Google Form Questions

**Tool**: `ai-orchestrator` > `get-google-form-questions`

**Action**: Extract questions and answer choices from Google Form using Puppeteer

**Input Parameters**:

```json
{
  "form_url": "https://docs.google.com/forms/d/e/1FAIpQLSfIZgtHH8FJudeMNlW1oyzmI8LKqHiZD9jkP-UYSeTIGdVtww/viewform"
}
```

**Output**:

```json
{
  "success": true,
  "form_title": "世界史概論 第2回 確認テスト - ギリシャ・ローマ時代",
  "questions": [
    {
      "question_number": 1,
      "question_text": "古代ギリシャで発展した政治制度は？",
      "choices": ["民主制", "君主制", "貴族制", "共和制"],
      "question_type": "multiple_choice"
    },
    ...
  ],
  "form_url": "https://docs.google.com/forms/d/e/..."
}
```

**Error Handling**:

- Form not accessible: Check URL and permissions
- Questions not found: Verify form structure

---

### Step 5: Generate Answers (First Pass - Claude)

**Tool**: Claude Desktop reasoning (no external tool)

**Action**: Analyze PDF content and generate answers for each question

**Process**:

1. For each question in the form:
   - Read the question text and choices
   - Reference the PDF text from Step 3
   - Apply reasoning to select the most appropriate answer
   - Ensure answer text EXACTLY matches one of the provided choices

**Output Format**:

```json
[
  {
    "question_number": 1,
    "answer": "民主制"
  },
  {
    "question_number": 2,
    "answer": "執政官（コンスル）"
  },
  ...
]
```

**Quality Checks**:

- All answers must match choices exactly (case-sensitive, character-for-character)
- All questions must be answered
- Reasoning should reference specific parts of the PDF text

---

### Step 6: Validate Answers (Second Pass - GPT Mock API)

**Tool**: Web API call to GPT Mock endpoint (optional calibration step)

**Action**: Send answers to validation API for second opinion

**Endpoint**: `http://localhost:3000/api/gpt-mock`

**Input**:

```json
{
  "questions": [...],  // from Step 4
  "proposed_answers": [...],  // from Step 5
  "reference_material": "PDF content summary"
}
```

**Output**:

```json
{
  "validated_answers": [...],
  "confidence_scores": [...],
  "suggested_changes": [...]
}
```

**Decision Logic**:

- If confidence > 0.8: Use original answer
- If confidence < 0.8 and suggested_change exists: Review and potentially update
- Final decision: Claude makes the call based on both reasoning passes

**Note**: This step demonstrates dual-reasoning architecture but doesn't call real GPT API to avoid costs

---

### Step 7: Record to Notion (Preparation for submission)

**Tool**: `notion` MCP tool (to be configured)

**Action**: Save submission record to Notion database

**Database**: "課題提出記録" (Assignment Submission Records)

**Properties**:

```json
{
  "title": "世界史概論 第2回",
  "student_name": "kurihara yuya",
  "student_id": "12345A",
  "course": "世界史概論",
  "lesson_number": 2,
  "submission_status": "pending_approval",
  "answers": [...],
  "created_at": "2025-11-15T10:00:00Z"
}
```

**Note**: This step requires Notion MCP configuration (pending)

---

### Step 8: Human-in-the-Loop Approval (HITL)

**Tool**: User interaction via Claude Desktop chat

**Action**: Present final answers to user for review and approval

**Display Format**:

```
=== 世界史概論 第2回 回答確認 ===

問1: 古代ギリシャで発展した政治制度は？
回答: 民主制
根拠: PDFのp.3に「アテネでは紀元前5世紀に民主制が発展...」と記載

問2: ローマ共和制の最高執政官の名称は？
回答: 執政官（コンスル）
根拠: PDFのp.7に「共和制ローマの最高執政官はコンスルと呼ばれ...」と記載

...

上記の回答で送信してよろしいですか？ (yes/no)
```

**User Response**:

- "yes" → Proceed to Step 9
- "no" → User provides corrections, update answers, return to this step
- "skip" → Save to Notion as draft but don't submit

---

### Step 9: Submit to Google Form

**Tool**: `ai-orchestrator` > `submit-google-form`

**Action**: Submit approved answers to Google Form using Puppeteer

**Input Parameters**:

```json
{
  "form_url": "https://docs.google.com/forms/d/e/1FAIpQLSfIZgtHH8FJudeMNlW1oyzmI8LKqHiZD9jkP-UYSeTIGdVtww/viewform",
  "name": "kurihara yuya",  // from Step 1
  "student_id": "12345A",  // from Step 1
  "answers": [
    {
      "question_number": 1,
      "answer": "民主制"
    },
    ...
  ]
}
```

**Output**:

```json
{
  "success": true,
  "message": "回答を記録しました。ご協力ありがとうございました。"
}
```

**Error Handling**:

- Submission failure: Retry once
- Answer mismatch error: Verify answer text matches choices exactly
- Network timeout: Notify user, save draft to Notion

---

### Step 10: Update Notion Record

**Tool**: `notion` MCP tool

**Action**: Update submission record to mark as completed

**Update**:

```json
{
  "submission_status": "submitted",
  "submitted_at": "2025-11-15T10:30:00Z",
  "submission_result": "success",
  "form_response_message": "回答を記録しました。ご協力ありがとうございました。"
}
```

---

## Error Handling Strategy

### Critical Errors (Abort Workflow)

- Credentials not found in Google Sheets
- Classroom site unreachable
- Form URL invalid or inaccessible

### Recoverable Errors (Retry)

- PDF download timeout → Retry once
- Form submission network error → Retry once
- API rate limits → Wait and retry

### Non-blocking Errors (Log and Continue)

- Notion API unavailable → Log locally and continue
- GPT Mock API down → Skip validation step, use first-pass answers

## Success Criteria

1. All questions answered with valid choices
2. Answers demonstrate understanding of PDF content
3. Form submission successful
4. Notion record created (if available)
5. User approval obtained (HITL)

## Usage Example

**User Request**:

```
世界史概論の第2回の課題お願い。学籍番号は12345A。
```

**Claude Desktop Response**:

```
承知しました。世界史概論 第2回の課題処理を開始します。

[Step 1] Google Sheetsから認証情報を取得中...
✓ 取得完了: kurihara yuya (12345A)

[Step 2] 教室サイトにログインしてPDFを取得中...
✓ PDF取得完了: /tmp/世界史概論-lesson-2.pdf

[Step 3] PDFを読み込み中...
✓ 内容確認完了: ギリシャ・ローマ時代について15ページの教材

[Step 4] Google Formの問題を取得中...
✓ 5問の確認テストを検出

[Step 5] PDFを参照して回答を生成中...
✓ 全5問の回答を作成

[Step 6] 回答を検証中...
✓ 信頼度スコア: 平均0.92

以下の回答内容を確認してください:
[回答一覧を表示]

送信してよろしいですか？
```

## Maintenance Notes

- PDF parsing may fail if classroom site changes structure
- Form selectors (CSS classes) may change if Google updates Forms UI
- Credentials sheet structure must remain: name | student_id | classroom_username | classroom_password
- MCP server must be running before starting workflow

## Version History

### 1.0.0 (2025-11-15)

- Initial production version
- Implemented Google Sheets credential retrieval
- Added Puppeteer-based PDF download
- Added Google Form extraction and submission
- Added GPT Mock API validation step
- Defined HITL approval process
- Updated to use pdf-parse for text extraction within MCP server
