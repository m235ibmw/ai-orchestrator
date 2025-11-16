# AI Orchestrator

AIオーケストレーションで大学課題や業務ワークフローを自動化するためのPoCリポジトリ。Claude Desktop + MCP を使用して、LMSログイン・PDF取得・Google Form回答までを完全自動化します。

## 📋 目次

- [システム概要](#システム概要)
- [アーキテクチャ](#アーキテクチャ)
- [主要コンポーネント](#主要コンポーネント)
- [MCP ツール](#mcp-ツール)
- [Mock API の役割](#mock-api-の役割)
- [セットアップ](#セットアップ)
- [使い方](#使い方)

---

## システム概要

このシステムは、大学の課題処理を自動化するための統合ワークフローです。

**実現する機能:**
1. 学生名の曖昧検索（Google Sheets から認証情報を取得）
2. LMS（Learning Management System）への自動ログイン
3. 授業資料（PDF）の取得とテキスト抽出
4. Notion から授業ノートの取得（オプション）
5. Google Form 問題の自動取得
6. Claude による問題解答の生成
7. Mock API での回答検証
8. Human-in-the-Loop（HITL）による最終確認
9. Google Form への自動提出

**対象ワークフロー:**
- 世界史概論（`workflows/university/sekaishigairon/protocol.md`）

---

## アーキテクチャ

```
┌─────────────────────────────────────────────────────────────┐
│                     Claude Desktop                          │
│  (ユーザーインターフェース & AI推論エンジン)                 │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  │ MCP Protocol (stdio)
                  │
        ┌─────────┴──────────┬──────────────┬─────────────┐
        │                    │              │             │
        ▼                    ▼              ▼             ▼
┌───────────────┐  ┌──────────────┐  ┌──────────┐  ┌──────────┐
│  ai-orchestr  │  │   gsheets    │  │  notion  │  │sequential│
│  MCP Server   │  │  MCP Server  │  │   MCP    │  │ thinking │
└───────┬───────┘  └──────┬───────┘  └────┬─────┘  └──────────┘
        │                 │                │
        │                 │                │
        ▼                 ▼                ▼
┌───────────────┐  ┌──────────────┐  ┌──────────┐
│  Puppeteer    │  │Google Sheets │  │  Notion  │
│  (Browser     │  │     API      │  │   API    │
│  Automation)  │  │              │  │          │
└───────┬───────┘  └──────────────┘  └──────────┘
        │
        ├─────────────┬──────────────┐
        ▼             ▼              ▼
┌───────────┐  ┌──────────┐  ┌──────────┐
│ Classroom │  │  Google  │  │ pdf-parse│
│   Site    │  │   Form   │  │ Library  │
│(Next.js)  │  │          │  │          │
└───────────┘  └──────────┘  └──────────┘
        │
        ▼
┌───────────────┐
│  GPT Mock API │
│ (Next.js API) │
└───────────────┘
```

---

## 主要コンポーネント

### 1. **Classroom Site** (`classroom-site/`)

**役割**: 大学のLMS（Learning Management System）をシミュレートするデモサイト

**技術スタック**:
- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS
- pdf-lib (PDF生成)

**主要機能**:
- `/login` - 認証システム（複数アカウント対応）
- `/home` - コース一覧
- `/classroom/[id]` - 各コースの授業資料（PDF）一覧
- `/api/pdf/[filename]` - PDF配信エンドポイント
- `/api/gpt-mock` - 回答検証用Mock API（後述）
- `/api/auth/login` - ログイン認証API

**認証データ**:
```json
// classroom-site/data/courses.json
{
  "credentials": [
    { "username": "student", "password": "password123" },
    { "username": "tanapiyo", "password": "tanaka0520" }
  ]
}
```

**起動方法**:
```bash
cd classroom-site
npm run dev  # http://localhost:3000
```

---

### 2. **MCP Server** (`mcp-server/`)

**役割**: Claude Desktop から呼び出せる自作MCPツール集

**技術スタック**:
- TypeScript
- `@modelcontextprotocol/sdk` (公式SDK)
- Puppeteer (ブラウザ自動化)
- pdf-parse (PDFテキスト抽出)

**登録ツール一覧**:

| ツール名 | 説明 |
|---------|------|
| `hello` | デバッグ用の疎通確認ツール |
| `get-workflow-list` | GitHubからワークフロー一覧を取得 |
| `get-protocol` | ワークフロープロトコル（protocol.md）を取得 |
| `get-lesson-pdf-url` | LMSにログインしてPDFをダウンロード＆テキスト抽出 |
| `get-google-form-questions` | Google Formから問題と選択肢を取得 |
| `submit-google-form` | Google Formに回答を提出 |
| `validate-answers-gpt-mock` | Mock APIで回答を検証 |

**起動方法**:
```bash
cd mcp-server
npm run build  # TypeScriptコンパイル
npm run dev    # 開発モード（nodemon + ts-node）
```

**Claude Desktop 設定**:
```json
// ~/Library/Application Support/Claude/claude_desktop_config.json
{
  "mcpServers": {
    "ai-orchestrator": {
      "command": "node",
      "args": ["/path/to/ai-orchestrator/mcp-server/dist/index.js"],
      "cwd": "/path/to/ai-orchestrator/mcp-server"
    }
  }
}
```

---

### 3. **外部 MCP サーバー**

#### **gsheets MCP** (公式)
```json
"gsheets": {
  "command": "npx",
  "args": ["-y", "mcp-gsheets"],
  "env": {
    "GOOGLE_PRIVATE_KEY": "-----BEGIN PRIVATE KEY-----\n...",
    "GOOGLE_CLIENT_EMAIL": "service-account@project.iam.gserviceaccount.com"
  }
}
```

**用途**: Google Sheets から学生の認証情報を読み取り（`gsheets_read_range`）

**シート構造**:
```
認証情報!A:Z
| name           | student_id | classroom_username | classroom_password |
|----------------|------------|--------------------|--------------------|
| kurihara yuya  | 12345A     | student            | password123        |
| tanaka tarou   | 2241w242   | tanapiyo           | tanaka0520         |
```

#### **notion MCP** (公式リモートMCP)
```json
"notion": {
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-notion"]
}
```

**用途**: Notionデータベースから授業ノートを取得（`query_database`, `search_pages`）

**前提条件**:
- Notion Integration を作成
- データベースに `lesson_number` プロパティを追加
- Integration にデータベースへのアクセス権を付与

---

## MCP ツール

### ツールの使い分け

| フェーズ | ツール | MCP Server | 目的 |
|---------|--------|-----------|------|
| Step 1 | `gsheets_read_range` | gsheets (公式) | 学生認証情報の取得 |
| Step 2 | `get-lesson-pdf-url` | ai-orchestrator (自作) | LMSログイン＆PDF取得 |
| Step 3 | `query_database` | notion (公式) | 授業ノート取得 |
| Step 5 | `get-google-form-questions` | ai-orchestrator (自作) | Google Form 問題取得 |
| Step 7 | `validate-answers-gpt-mock` | ai-orchestrator (自作) | Mock APIで回答検証 |
| Step 9 | `submit-google-form` | ai-orchestrator (自作) | Google Form 提出 |

### 重要なツール詳細

#### `get-lesson-pdf-url`

**機能**: Puppeteerで教室サイトにログインし、PDFをダウンロードしてテキスト抽出

**内部処理フロー**:
```typescript
// mcp-server/src/tools/browser.ts
export async function getLessonPdfUrl(
  courseName: string,
  lessonNumber: number,
  credentials: { username: string; password: string },
  baseUrl = 'http://localhost:3000'
) {
  const browser = await puppeteer.launch({ headless: true });

  // 1. ログインページへアクセス
  await page.goto(`${baseUrl}/login`);
  await page.type('input[type="text"]', credentials.username);
  await page.type('input[type="password"]', credentials.password);
  await page.click('button[type="submit"]');

  // 2. コースページへ遷移
  await page.goto(`${baseUrl}/classroom/${courseId}`);

  // 3. PDF URLを取得してダウンロード
  const pdfUrl = await page.evaluate(...);
  const pdfBuffer = await fetch(pdfUrl).then(r => r.arrayBuffer());

  // 4. pdf-parse でテキスト抽出
  const pdfData = await pdfParse(Buffer.from(pdfBuffer));

  return {
    success: true,
    pdf_url: pdfUrl,
    pdf_text: pdfData.text,  // ← これがポイント！
    lesson_title: "第2回: ギリシャ・ローマ時代",
    course_name: courseName
  };
}
```

**重要**: `pdf_text` フィールドに抽出されたテキストが含まれており、Claude はこれを直接参照できます。

---

## Mock API の役割

### `/api/gpt-mock` エンドポイント

**場所**: `classroom-site/app/api/gpt-mock/route.ts`

**役割**: 将来的にGPT-4 APIで行う回答検証を、現在はシンプルなロジックでシミュレート

**検証内容**:
1. 回答が選択肢に含まれているか（完全一致）
2. すべての問題に回答があるか
3. 回答の形式が正しいか

**レスポンス例**:
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
    }
  ],
  "confidence_scores": [0.95, 0.95, 0.95, 0.95, 0.95],
  "suggested_changes": [],
  "overall_confidence": 0.95,
  "timestamp": "2025-11-16T..."
}
```

**将来の拡張**:
```typescript
// 将来的にはこうなる予定
const gptResponse = await openai.chat.completions.create({
  model: "gpt-4",
  messages: [
    {
      role: "system",
      content: "あなたは歴史の専門家です。PDFの内容を参照して回答を検証してください。"
    },
    {
      role: "user",
      content: `PDF: ${reference_material}\n\n問題: ${questions}\n\n回答: ${proposed_answers}`
    }
  ]
});
```

### なぜ Mock を使うのか？

1. **コスト削減**: GPT-4 API は従量課金なので、開発中はMockで代用
2. **レスポンス速度**: Mockは即座に応答するため、開発効率が上がる
3. **オフライン開発**: インターネット接続不要でテスト可能
4. **デバッグ容易性**: ロジックが単純なので、何が起きているか把握しやすい

---

## セットアップ

### 1. リポジトリクローン

```bash
git clone https://github.com/yourusername/ai-orchestrator.git
cd ai-orchestrator
```

### 2. 環境変数設定

```bash
cp .env.example .env
```

```bash
# .env
PROJECT_ROOT=/Users/yourusername/path/to/ai-orchestrator
GOOGLE_SPREADSHEET_ID=your-spreadsheet-id
GOOGLE_CREDENTIALS_FILE=/path/to/google-credentials.json
CLASSROOM_BASE_URL=http://localhost:3000
GOOGLE_FORM_URL=https://docs.google.com/forms/d/e/your-form-id/viewform
```

### 3. 各コンポーネントのセットアップ

```bash
# Classroom Site
cd classroom-site
npm install
npm run dev  # http://localhost:3000

# MCP Server
cd ../mcp-server
npm install
npm run build
```

### 4. Claude Desktop 設定

`~/Library/Application Support/Claude/claude_desktop_config.json` を編集:

```json
{
  "mcpServers": {
    "ai-orchestrator": {
      "command": "node",
      "args": ["/absolute/path/to/ai-orchestrator/mcp-server/dist/index.js"],
      "cwd": "/absolute/path/to/ai-orchestrator/mcp-server"
    },
    "gsheets": {
      "command": "npx",
      "args": ["-y", "mcp-gsheets"],
      "env": {
        "GOOGLE_PRIVATE_KEY": "...",
        "GOOGLE_CLIENT_EMAIL": "..."
      }
    }
  }
}
```

### 5. Google Sheets 準備

スプレッドシート（ID: `1dkiU9nBKAzpYuJGwcIwBWTcnvHlRxu6MzNf9nzxfuNQ`）に以下のシートを作成:

**シート名: `認証情報`**
```
| name           | student_id | classroom_username | classroom_password |
|----------------|------------|--------------------|--------------------|
| kurihara yuya  | 12345A     | student            | password123        |
| tanaka tarou   | 2241w242   | tanapiyo           | tanaka0520         |
```

---

## 使い方

### Claude Desktop での実行例

```
User: 世界史概論の第2回の課題お願い。くりはらです。

Claude:
◤ STEP 1  学生特定プロトコル
──────────────────────────────────
🔍 入力された名前: "くりはら"

🧬 正規化（Hiragana → Romaji）
    → "kurihara" で検索

📡 Google Sheets をスキャン中…

✓ 候補を発見:
  1. kurihara yuya (12345A)
  2. kurihara takeshi (12346B)

▶ どちらですか？（番号 or 名前）

User: 1

Claude:
✓ kurihara yuya (12345A) を選択しました

◤ STEP 2  LMS ログイン & PDF取得
──────────────────────────────────
🔐 Classroom Site へログイン中…
📚 コース: 世界史概論
📚 レッスン: 第2回

🛰 教材PDF URL を探索…
📄 PDF ダウンロード中…
🔎 PDF パース中（pdf-parse）

✓ PDFテキスト抽出完了（1,245文字）

◤ STEP 3  Notion 授業ノート取得
──────────────────────────────────
🔗 Notion API 接続中…
🔍 検索条件: lesson_number == 2
📚 データベースクエリ実行中…

✓ ページ検出: "第2回: ギリシャ・ローマ時代"
📝 ノート取得完了（850文字）

... (以下、Step 4-9 が続く)
```

---

## ディレクトリ構造

```
ai-orchestrator/
│
├── classroom-site/              # LMSデモサイト (Next.js)
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/login/     # 認証API
│   │   │   ├── gpt-mock/       # Mock検証API
│   │   │   └── pdf/            # PDF配信API
│   │   ├── login/              # ログインページ
│   │   ├── home/               # コース一覧
│   │   └── classroom/[id]/     # コース詳細
│   ├── data/
│   │   └── courses.json        # コースデータ＆認証情報
│   ├── lib/
│   │   └── courses.ts          # データアクセス層
│   ├── public/
│   │   └── pdfs/               # 授業資料PDF
│   └── scripts/
│       └── generate-pdfs.ts    # PDF生成スクリプト
│
├── mcp-server/                  # 自作MCP Server
│   ├── src/
│   │   ├── index.ts            # MCPツール登録
│   │   └── tools/
│   │       ├── browser.ts      # Puppeteer（LMSログイン＆PDF取得）
│   │       └── googleForm.ts   # Google Form操作
│   └── dist/                   # ビルド成果物
│
├── workflows/                   # ワークフロープロトコル
│   └── university/
│       └── sekaishigairon/
│           └── protocol.md     # 世界史概論の実行手順書
│
├── config/
│   ├── claude_config.template.json  # Claude Desktop設定テンプレート
│   └── google-credentials.json      # Google API認証情報
│
├── .env                        # 環境変数
└── README.md                   # このファイル
```

---

## 開発者向け情報

### デバッグモード

```bash
# MCP Server をデバッグモードで実行
cd mcp-server
npm run build
node dist/index.js debug
```

### PDF生成

```bash
cd classroom-site
npx tsx scripts/generate-pdfs.ts
```

### テスト用 Google Form

現在使用中のフォーム:
```
https://docs.google.com/forms/d/e/1FAIpQLSfIZgtHH8FJudeMNlW1oyzmI8LKqHiZD9jkP-UYSeTIGdVtww/viewform
```

---

## ライセンス

ISC

---

## 今後の拡張予定

- [ ] GPT-4 API による実際の回答検証
- [ ] 複数ワークフローのサポート（日本史、数学など）
- [ ] GitHub Actions による自動実行
- [ ] Slack/Discord への結果通知
- [ ] エラーハンドリングの改善
