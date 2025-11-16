# Protocol: 世界史概論（sekaishigairon）

世界史概論の課題処理ワークフローを AI オーケストレーションで実行するためのプロトコル。

## Status

- Version: 1.1.0
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

## 🎨 UI PRESENTATION RULES（UI表示ルール）

**Claude Desktop は以下のフォーマットを厳守してユーザーに表示すること：**

1. **絵文字を削除しない** - 🔍 📡 ✓ ▶ などの絵文字は必ず保持する
2. **罫線を削除しない** - `◤` `──────────────────────────────────` などの装飾は必ず保持する
3. **インデントを保持する** - スペースによるインデント構造を崩さない
4. **フォーマットを簡略化しない** - "見やすく"するために勝手に改変しない
5. **STEP表示を統一する** - 必ず `◤ STEP X  タイトル` の形式を使う
6. **エンジニア感を出す** - ターミナル風の洗練されたUIを維持する
7. **Usage Exampleの通りに表示する** - protocol.mdのUsage Exampleセクションの形式を正確に再現する

**重要**: このプロトコルのUIは、ユーザーがワークフローの進行状況を視覚的に把握するために設計されています。フォーマットを変更すると、ユーザーエクスペリエンスが著しく低下します。

**禁止事項**:
- ❌ 絵文字を削除して "Step 0.5: 学生特定" のように簡略化する
- ❌ 罫線を削除して平文にする
- ❌ "見やすく"するために箇条書きに変換する
- ❌ インデントを削除してフラットにする

**正しい例**:
```
◤ STEP 0.5  学生特定プロトコル
──────────────────────────────────
🔍 入力された名前: "くりはら"

🧬 正規化（Hiragana → Romaji）
    → "kurihara" で検索

📡 Google Sheets をスキャン中…

✓ 2名の候補を検出
  1. kurihara yuya (12345A)
  2. kurihara takeshi (12346B)

▶ どちらですか？（番号 or 名前）
```

**誤った例（これは絶対に避ける）**:
```
Step 0.5: 学生特定

入力された名前: "くりはら"
正規化: "kurihara"
Google Sheets を検索中...

候補:
- kurihara yuya (12345A)
- kurihara takeshi (12346B)

どちらですか？
```

---

## Prerequisites

### Required MCP Servers

1. **ai-orchestrator** - Custom MCP server with classroom automation tools
2. **gsheets** - Google Sheets integration for credential management

### Required Data

- Student name (any format: Kanji "栗原", Hiragana "くりはら", or Romaji "kurihara")
  - Claude will automatically convert and search
- Course name (e.g., "世界史概論")
- Lesson number (e.g., 2)
- Google Spreadsheet ID with credentials sheet named "認証情報"
  - Sheet structure: `name | student_id | classroom_username | classroom_password`
  - Name column must be in romaji format (e.g., "kurihara yuya")

### Running Services

- Classroom site: http://localhost:3000 (Next.js app)
- MCP server: Running via ts-node

## Workflow Steps

### Step 0.5: Identify Student by Name with Flexible Search

**Tool**: `gsheets` MCP tool (read-only)

**Action**: Flexible name search with Claude reasoning and user confirmation

**Display Format**: MUST use the format shown in "Example Interaction" below with all emojis and formatting preserved

**Process**:

1. **Check User Input** (accept any format):
   - 漢字: "栗原", "栗原裕也"
   - ひらがな: "くり", "くりはら"
   - ローマ字: "kuri", "kurihara", "kurihara yuya"
   - If no name provided, ask: "お名前を教えていただけますか？（例: 栗原 または kurihara）"

2. **Claude Reasoning - Convert to Search Pattern**:
   - Automatically convert Japanese to romaji using Claude's language understanding
   - Examples:
     - "栗原" → search for "kurihara"
     - "くりはら" → search for "kurihara"
     - "くり" → search for "kuri"
     - "kurihara" → search as-is
   - Use lowercase for matching

3. **Fetch All Credentials from Google Sheets**:
   ```
   Tool: gsheets MCP (gsheets_read_range)
   Spreadsheet ID: 1dkiU9nBKAzpYuJGwcIwBWTcnvHlRxu6MzNf9nzxfuNQ
   Range: 認証情報!A:Z

   Expected Response Format:
   {
     "values": [
       ["name", "student_id", "classroom_username", "classroom_password"],
       ["kurihara yuya", "12345A", "student", "password123"],
       ...
     ]
   }
   ```

4. **Filter Candidates** (Claude performs this):
   - Filter rows where `name` column contains the search pattern (case-insensitive, partial match)
   - Example: "kuri" matches "kurihara yuya", "kurihara takeshi", "kurita masaki"

5. **Present Candidates to User**:
   - **If 1 match found**: Auto-select and confirm with user
     ```
     「kurihara yuya (12345A)」が見つかりました。この方で進めてよろしいですか？
     ```
   - **If multiple matches**: Present numbered list
     ```
     以下の候補が見つかりました:
     1. kurihara yuya (学籍番号: 12345A)
     2. kurihara takeshi (学籍番号: 12346B)
     3. kurita masaki (学籍番号: 12347C)

     どちらですか？番号または名前を教えてください。
     ```
   - **If no matches**: Ask for retry
     ```
     「くり」では見つかりませんでした。
     フルネームまたは別の表記で教えていただけますか？
     ```

6. **User Confirmation**:
   - Accept: Number (e.g., "1"), full name (e.g., "kurihara yuya"), or confirmation (e.g., "yes", "OK")
   - Process user selection and extract full credentials

**Output** (store for use in subsequent steps):

```json
{
  "name": "kurihara yuya",
  "student_id": "12345A",
  "classroom_username": "student",
  "classroom_password": "password123"
}
```

**Example Interaction**:

```
User: "世界史概論お願い。くりはらです。"

Claude:
◤ STEP 0.5  学生特定プロトコル
──────────────────────────────────
🔍 入力された名前: "くりはら"

🧬 正規化（Hiragana → Romaji）
    → "kurihara" で検索

📡 Google Sheets をスキャン中…

✓ 2名の候補を検出
  1. kurihara yuya (12345A)
  2. kurihara takeshi (12346B)

▶ どちらですか？（番号 or 名前）

User: "1"

Claude:
✓ kurihara yuya (12345A) で進めます。
```

**Error Handling**:

- No matches → Ask for different spelling or full name
- Multiple matches + ambiguous response → Ask again with clear options
- Invalid choice number → "1〜3の番号を選択してください"
- gsheets tool not available → Abort and notify user to configure gsheets MCP

**Security Note**:
- `classroom_password` is never displayed to user
- Only used internally for Step 2 login

---

### Step 1: Credentials Retrieved

**Note**: Credentials are already retrieved in Step 0.5 above.

**Stored Data** (from Step 0.5):

```json
{
  "name": "kurihara yuya",
  "student_id": "12345A",
  "classroom_username": "student",
  "classroom_password": "password123"
}
```

**Action**: Verify all required fields are present before proceeding to Step 2.

**Validation**:
- ✓ `name` is not empty
- ✓ `student_id` is not empty
- ✓ `classroom_username` is not empty
- ✓ `classroom_password` is not empty

**If any field is missing**: Abort workflow and notify user

---

### Step 2: Login to LMS and Retrieve Course Material with PDF Text

**Tool**: `ai-orchestrator` > `get-lesson-pdf-url`

**Action**: Login to classroom site using credentials from Step 0.5 and retrieve PDF with text content

**CRITICAL**: You MUST call the MCP tool `get-lesson-pdf-url` with credentials from Step 0.5:

```json
{
  "course_name": "世界史概論",
  "lesson_number": 2,
  "username": "{{classroom_username from Step 0.5}}",
  "password": "{{classroom_password from Step 0.5}}",
  "base_url": "http://localhost:3000"
}
```

**Example** (using credentials from Step 0.5):
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
Immediately after receiving the response, extract the `pdf_text` value and proceed to Step 2.5.
DO NOT skip Step 2.5. Retrieve lecture notes from Notion before proceeding.

---

### Step 2.5: Retrieve Lecture Notes from Notion

**Tool**: Notion MCP (official remote MCP server)

**Action**: Retrieve lecture notes from Notion database based on lesson number

**Prerequisites**:
- Notion MCP server must be configured in Claude Desktop
- Database must have a property to filter by lesson number (e.g., "第2回", "Lesson 2", or numeric field)

**CRITICAL**: Use the Notion MCP tool to search for lecture notes:

1. **Search Notion Database**:
   ```
   Tool: notion MCP (search_pages or query_database)
   Query: Filter by lesson_number property matching the current lesson
   Example: lesson_number == 2 for "第2回"
   ```

2. **Expected Response**:
   ```json
   {
     "page_id": "abc123...",
     "title": "第2回: ギリシャ・ローマ時代",
     "content": "# 授業ノート\n\n## 古代ギリシャの政治制度\n...",
     "lesson_number": 2
   }
   ```

3. **Extract Content**:
   - Extract the full page content (markdown format)
   - Store as `notion_notes` for use in Step 3

**If Notion retrieval fails**:
- Log the error in execution log
- Continue workflow without Notion notes
- Use only `pdf_text` for answering questions in Step 5

**Output** (store for Step 3):
```json
{
  "notion_notes": "# 授業ノート\n\n## 古代ギリシャの政治制度\n...",
  "notion_available": true
}
```

---

### Step 3: Verify and Combine PDF Text and Notion Notes (MANDATORY)

**CRITICAL**: You MUST verify that both `pdf_text` (from Step 2) and `notion_notes` (from Step 2.5) contain valid content.

**Input**:
- The `pdf_text` value from Step 2's response
- The `notion_notes` value from Step 2.5's response (if available)

**Action**:

1. Check that `pdf_text` is not empty or null
2. Verify you can see meaningful content about Greek and Roman history
3. Check if `notion_notes` is available and not empty
4. Combine both sources for comprehensive reference material
5. Store combined content for use in answering questions in Step 5

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

**Tool**: MCP tool `validate-answers-gpt-mock` (optional calibration step)

**Action**: Send questions and answers to validation API for second opinion

**Endpoint**: `http://localhost:3000/api/gpt-mock`

**Input** (lightweight - no reference material):

```json
{
  "questions": [...],  // from Step 4
  "proposed_answers": [...]  // from Step 5
}
```

**Note**: Do NOT include `reference_material` field. Only send questions and proposed answers to minimize request size.

**Expected Output**:

```json
{
  "message": "問題ありません。全ての回答が適切です。",
  "all_valid": true,
  "validated_answers": [
    {
      "question_number": 1,
      "answer": "民主制",
      "confidence": 0.95,
      "reasoning": "回答は選択肢と一致しています"
    },
    ...
  ],
  "confidence_scores": [0.95, 0.95, 0.95, 0.95, 0.95],
  "suggested_changes": [],
  "overall_confidence": 0.95,
  "timestamp": "2025-11-15T07:53:54.668Z"
}
```

**Decision Logic**:

- If `all_valid: true` and `message` says "問題ありません": Proceed to submission
- If `suggested_changes` is not empty: Review suggested changes and potentially update answers
- If `all_valid: false`: Review each answer's confidence and reasoning

**Use Case**:
This step validates that:
1. All answers match the provided choices exactly
2. No formatting or character encoding issues exist
3. Question numbers align correctly

**Note**: This is a mock validation endpoint. In production, this would call GPT-4 API for semantic validation against the reference material.

---

### Step 7: Human-in-the-Loop Approval (HITL)

**Tool**: User interaction via Claude Desktop chat

**Action**: Present final answers to user for review and approval

**Display Format**:

```
◤ STEP 7  HUMAN CHECKPOINT
──────────────────────────────────
以下が最終回答案です。

問1: 古代ギリシャで発展した政治制度は？
回答: 民主制
根拠: PDFに「アテネでは紀元前5世紀に民主制が発展...」と記載

問2: ローマ共和制の最高執政官の名称は？
回答: 執政官（コンスル）
根拠: PDFに「共和制ローマの最高執政官はコンスルと呼ばれ...」と記載

問3: パックス・ロマーナとは何を意味するか？
回答: ローマによる平和

問4: ローマ帝国が東西に分割されたのは西暦何年か？
回答: 395年

問5: 古代ローマを代表する建築物は？
回答: コロッセオ

▶ この回答を提出しますか？
   yes / no
```

**User Response**:

- "yes" → Proceed to Step 8
- "no" → User provides corrections, update answers, return to this step

---

### Step 8: Submit to Google Form

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
- Network timeout: Notify user

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

- GPT Mock API down → Skip validation step, use first-pass answers

## Success Criteria

1. All questions answered with valid choices
2. Answers demonstrate understanding of PDF content
3. Form submission successful
4. User approval obtained (HITL)

## Usage Example

**User Request (Example 1 - Hiragana)**:

```
世界史概論の第2回の課題お願い。くりはらです。
```

**Claude Desktop Response**:

```
承知しました。世界史概論 第2回の課題処理を開始します。

◤ STEP 0.5  学生特定プロトコル
──────────────────────────────────
🔍 入力された名前: "くりはら"

🧬 正規化（Hiragana → Romaji）
    → "kurihara" で検索

📡 Google Sheets をスキャン中…

✓ 2名の候補を検出
  1. kurihara yuya (12345A)
  2. kurihara takeshi (12346B)

▶ どちらですか？（番号 or 名前）
```

**User**: `1`

**Claude**:

```
✓ kurihara yuya (12345A) で進めます。

◤ STEP 2  教室システムへログイン
──────────────────────────────────
🔐 認証中…（student）

🌍 アクセス: http://localhost:3000/home

✓ 認証成功

📁 対象科目: 世界史概論
📚 レッスン: 第2回

🛰 教材PDF URL を探索…
📄 PDF ダウンロード中…
🔎 PDF パース中（pdf-parse）

✓ PDFテキスト抽出完了（1,245文字）

◤ STEP 2.5  Notion 授業ノート取得
──────────────────────────────────
🔗 Notion API 接続中…

🔍 検索条件: lesson_number == 2
📚 データベースクエリ実行中…

✓ ページ検出: "第2回: ギリシャ・ローマ時代"
📝 ノート取得完了（850文字）

◤ STEP 3  教材解析フェーズ
──────────────────────────────────
🧪 内容検証中…

[PDF教材]
- ギリシャ民主制 → 検出
- ローマ共和制 → 検出
- パックス・ロマーナ → 検出

[Notionノート]
- 授業メモ → 検出
- 重要ポイント → 検出

✓ 教材として有効と判断（PDF + Notion）

◤ STEP 4  Google Form 読み取り
──────────────────────────────────
🔗 フォームURL解析中…

🛰 Puppeteer: DOMツリー読み取り
📝 設問抽出… 5問検出

✓ 設問データ構築完了

◤ STEP 5  AI推論（一次回答生成）
──────────────────────────────────
🧠 教材 × 設問 をマッチング中…

  問1 → 民主制
  問2 → 執政官（コンスル）
  問3 → ローマによる平和
  問4 → 395年
  問5 → コロッセオ

✓ 一次回答が完成しました

◤ STEP 6  回答校正フェーズ
──────────────────────────────────
📡 GPT Mock API に送信…

💬 返答:
   → 全回答が妥当
   → 整合性スコア: 0.95

✓ 校正完了（変更なし）

◤ STEP 7  HUMAN CHECKPOINT
──────────────────────────────────
以下が最終回答案です。

問1: 古代ギリシャで発展した政治制度は？
回答: 民主制

問2: ローマ共和制の最高執政官の名称は？
回答: 執政官（コンスル）

問3: パックス・ロマーナとは何を意味するか？
回答: ローマによる平和

問4: ローマ帝国が東西に分割されたのは西暦何年か？
回答: 395年

問5: 古代ローマを代表する建築物は？
回答: コロッセオ

▶ この回答を提出しますか？
   yes / no
```

**User**: `yes`

**Claude**:

```
◤ STEP 8  自動提出フェーズ
──────────────────────────────────
📝 Google Form へ入力中…
📨 送信中…

✓ 提出成功
💬 「回答を記録しました。ご協力ありがとうございました。」

──────────────────────────────────
✅ ワークフロー完了
```

---

**User Request (Example 2 - Kanji, no name)**:

```
世界史概論の課題お願い
```

**Claude Desktop Response**:

```
承知しました。

◤ STEP 0.5  学生特定プロトコル
──────────────────────────────────
⚠ 名前が未入力です

▶ お名前を教えていただけますか？
   （例: 栗原 または kurihara）
```

**User**: `栗原`

**Claude**:

```
◤ STEP 0.5  学生特定プロトコル
──────────────────────────────────
🔍 入力された名前: "栗原"

🧬 正規化（Kanji → Romaji）
    → "kurihara" で検索

📡 Google Sheets をスキャン中…

✓ 1名の候補を検出
  • kurihara yuya (12345A)

▶ この方で進めてよろしいですか？
   yes / no
```

**User**: `yes`

**Claude**:

```
✓ kurihara yuya (12345A) で課題処理を開始します。

[Step 2へ進む...]
```

## Maintenance Notes

- PDF parsing may fail if classroom site changes structure
- Form selectors (CSS classes) may change if Google updates Forms UI
- Credentials sheet structure must remain: name | student_id | classroom_username | classroom_password
- MCP server must be running before starting workflow

## Version History

### 1.2.0 (2025-11-16)

- **NEW**: Notion lecture notes integration (Step 2.5)
  - Retrieve lecture notes from Notion database via official MCP
  - Filter by lesson number automatically
  - Combine PDF and Notion content for comprehensive reference
  - Graceful fallback if Notion unavailable
- Updated execution log to show Notion retrieval step
- Updated Step 3 to verify and combine both PDF and Notion content

### 1.1.0 (2025-11-15)

- **NEW**: Flexible name search with Claude reasoning (Step 0.5)
  - Accept Japanese (Kanji/Hiragana) and Romaji input
  - Automatic romaji conversion by Claude
  - Partial match search with user confirmation
  - Multi-candidate selection flow
- Updated credential retrieval to use gsheets MCP read-only access
- Removed hardcoded demo credentials (now production-ready)
- Enhanced user interaction flow with detailed examples

### 1.0.0 (2025-11-15)

- Initial production version
- Implemented Google Sheets credential retrieval
- Added Puppeteer-based PDF download
- Added Google Form extraction and submission
- Added GPT Mock API validation step
- Defined HITL approval process
- Updated to use pdf-parse for text extraction within MCP server
