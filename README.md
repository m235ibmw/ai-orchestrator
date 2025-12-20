# Life OS - Personal Life Management System with Claude MCP

> **⚠️ This is my personal system, heavily customized for my own life management.**
> 
> 完全に自分専用に最適化されたシステムです。汎用的なテンプレートではなく、自分の人生設計・意思決定スタイル・ワークフローに合わせて構築しています。

---

## 概要

Life OSは、Google Sheets/Docs/Calendar、Notionを統合し、Claudeとの対話を通じて人生の様々な側面を管理するシステムです。日常的な軽量オペレーションから、重要な意思決定時のフルコンテキスト分析まで、状況に応じたモード切り替えで効率と深さを両立します。

## アーキテクチャ

```
┌─────────────────────────────────────────────────────────────┐
│                        Claude MCP                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  gas-runner │  │  workflow   │  │  decision   │         │
│  │   (GAS実行)  │  │   manager   │  │   making    │         │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘         │
│         │                │                │                 │
│  ┌──────┴────────────────┴────────────────┴──────┐         │
│  │              MCP Tool Layer                    │         │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐         │         │
│  │  │ gsheets │ │notionApi│ │  drive  │         │         │
│  │  └─────────┘ └─────────┘ └─────────┘         │         │
│  └───────────────────────────────────────────────┘         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
   │Google Sheets│     │   Notion    │     │Google Drive │
   │  Calendar   │     │  Databases  │     │    Docs     │
   └─────────────┘     └─────────────┘     └─────────────┘
```

## 動作モード

### 1. Daily Operation Mode（デフォルト）

日常的なタスク管理・データ操作用。効率優先で、必要最小限のデータをfetchして処理。

**機能:**
- Index管理（月次/週次バックログ）
- カレンダー操作
- セクター別シート操作
- ワークフロー実行

**トリガー例:**
- 「今週のタスク」「タスク追加」
- 「明日の予定」「予定追加」
- 「wf list」「〇〇のワークフロー」

### 2. Decision Making Mode

重要な意思決定時に起動。効率よりボリューム優先で、必要な情報をフルロード。

**機能:**
- 過去の意思決定ログ参照
- As-Is/To-Be（人生の軸）との照合
- セクター別ゲーム解釈の確認
- 構造化された意思決定プロセス

**トリガー:**
- 「意思決定したい」
- 「〇〇すべき？」
- 「迷ってる」

## MCP Tools構成

### Google Sheets

| 操作 | ツール | 用途 |
|------|--------|------|
| READ | `gsheets:sheets_get_values` | 高速な読み取り |
| WRITE (値のみ) | `gsheets:sheets_update_values` | シンプルな更新 |
| WRITE (スタイル含む) | `gas_run` | 書式設定、シート作成 |

### Notion

- `notionApi:API-post-database-query` - DB検索
- `notionApi:API-get-block-children` - ブロック取得
- `notionApi:API-patch-block-children` - ブロック追加

### Google Drive / Docs

- `ai-orchestrator:drive_search` - ファイル検索
- `ai-orchestrator:drive_read_file` - ファイル読み取り
- `ai-orchestrator:drive_create_file` - ファイル作成
- `ai-orchestrator:gas_run` - GASによるDocs操作

### Google Calendar

- `ai-orchestrator:gas_run` with `CalendarApp`

## Skills

### gas-runner

Google Apps Scriptを直接実行するスキル。Sheets/Docs/Calendarの高度な操作に使用。

```javascript
// 例: シートにヘッダーを追加
var ss = SpreadsheetApp.openById('SPREADSHEET_ID');
var sheet = ss.getSheetByName('SheetName');
var headers = ['Col1', 'Col2', 'Col3'];
sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
sheet.getRange(1, 1, 1, headers.length)
     .setBackground('#1a73e8')
     .setFontColor('#ffffff')
     .setFontWeight('bold');
return 'Done';
```

### workflow-manager

反復タスクをワークフローとして管理・実行。

**コマンド:**
- `wf list` - ワークフロー一覧
- `run X` / `Xのワークフロー` - 実行

**ワークフロー構造:**
- Markdownで記述
- `## Step N:` 形式
- アクター（User/Claude）を明記

### decision-making

重要な意思決定を支援。

**プロセス:**
1. 論点の明確化
2. 関連データのfetch（Data Lake、As-Is/To-Be、ゲーム解釈）
3. 選択肢の構造化（Pros/Cons、期待値）
4. 意思決定の軸との照合
5. 結論と記録

### pdf-generator

日本語対応PDFを生成。reportlab + IPAゴシックフォント使用。

## データ構造

### Index Sheet（バックログ管理）

月次/週次シートで管理:
- `2025-12` - 月次シート
- `2025-W49` - 週次シート

**カラム:** category, project, name, scope, status, memo

**status:** todo / done / stash

### 統合Data Lake

プロジェクト横断のナレッジベース。

**操作:**
```javascript
// メタデータ取得（Content除く）
gas_call_function({ fn: "query", args: [spreadsheetId, projectFilter, typeFilter] })

// Content取得
gas_call_function({ fn: "getContent", args: [spreadsheetId, ids] })

// 行追加
gas_call_function({ fn: "addRow", args: [spreadsheetId, project, type, title, content, isKillerCase] })
```

### ほしい物リスト

購入検討・設備投資管理。

**構造:**
- Summaryシート: プロジェクト一覧
- 個別シート: アイテム詳細 + 設計思想

**カラム:** ID, カテゴリ, アイテム名, 予算, Scope, Status, 購入日, URL, メモ

**Status:** 検討中 / 確定 / 購入済 / 所有済

## デザインスタンダード

### シートスタイル

```
Header: Dark navy (#1a1a2e) + white text + bold
Rows: Alternating banding (LIGHT_GREY)
Border: Light gray (#d0d0d0)
```

### 条件付き書式

**Status:**
| 値 | 背景 | 文字 |
|----|------|------|
| 確定 | #d4edda | #155724 |
| 検討中 | #fff3cd | #856404 |
| 所有済 | #cce5ff | #004085 |
| 購入済 | #e2d9f3 | #563d7c |

**Scope:**
| 値 | 背景 | 文字 |
|----|------|------|
| Phase1 | #d1ecf1 | #0c5460 |
| Phase2 | #e9ecef | #495057 |

## セットアップ

### 1. MCP Server設定

必要なMCPサーバー:
- Google Sheets MCP
- Notion MCP (local @notionhq/notion-mcp-server)
- Google Drive / ai-orchestrator MCP
- GAS Runner MCP

### 2. Google Sheets準備

以下のシートを作成し、IDをシステムプロンプトに設定:
- 統合Data Lake
- Indexシート
- Workflowシート
- セクター別シート（必要に応じて）

### 3. Notion準備

以下のDBを作成し、IDをシステムプロンプトに設定:
- As-Is（人生ストーリー分析）
- To-Be（人生で重要なこと）
- timeblock DB
- タスクBL DB

### 4. Skills配置

`/mnt/skills/user/` 以下に各スキルフォルダを配置:
```
/mnt/skills/user/
├── gas-runner/
│   └── SKILL.md
├── workflow-manager/
│   └── SKILL.md
├── decision-making/
│   └── SKILL.md
└── pdf-generator/
    ├── SKILL.md
    ├── scripts/
    └── references/
```

### 5. System Prompt設定

Custom Instructionsに以下を含める:
- 各種シート/DBのID
- 動作モードの定義
- MCPツール選択ルール
- デザインスタンダード

## 設計思想

### 暗黙的実行

日常オペレーションでは確認を最小限に。コンテキストから意図を推論し、即座に実行。

### モードによるコンテキスト制御

- Daily: 効率優先、必要最小限のfetch
- Decision: ボリューム優先、フルコンテキストでカチコミ

### 一貫性のある意思決定

過去の意思決定ログ、As-Is/To-Be、ゲーム解釈を参照し、人生の軸に沿った判断を支援。

## License

MIT
