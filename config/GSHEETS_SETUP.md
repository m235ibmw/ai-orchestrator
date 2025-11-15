# Google Sheets MCP Setup Guide

## Overview

This project uses `mcp-gsheets` to retrieve student credentials from Google Sheets. The credentials are stored in a sheet named "認証情報" (Credentials).

## Prerequisites

1. Google Cloud Project with Google Sheets API enabled
2. Service Account with access to the credentials spreadsheet
3. Google Spreadsheet with credentials data

## Setup Steps

### 1. Create Google Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable Google Sheets API:
   - Go to "APIs & Services" > "Library"
   - Search for "Google Sheets API"
   - Click "Enable"
4. Create Service Account:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "Service Account"
   - Fill in the details and create
5. Create Key:
   - Click on the created service account
   - Go to "Keys" tab
   - Click "Add Key" > "Create new key"
   - Select JSON format
   - Download the JSON file

### 2. Configure Credentials

1. Save the downloaded JSON file as:
   ```
   /Users/kurikinton/Documents/niko-dev/ai-orchestrator/config/google-credentials.json
   ```

2. **IMPORTANT**: Add to `.gitignore`:
   ```
   config/google-credentials.json
   ```

### 3. Create Google Spreadsheet

1. Create a new Google Spreadsheet or use existing one
2. Run the Google Apps Script from `classroom-site/google-apps-script/createCredentialsSheet.js`
3. This will create a sheet named "認証情報" with the following structure:

   | name | student_id | classroom_username | classroom_password |
   |------|-----------|-------------------|-------------------|
   | kurihara yuya | 12345A | student | password123 |

### 4. Share Spreadsheet with Service Account

1. Open the Google Spreadsheet
2. Click "Share" button
3. Add the service account email (found in `google-credentials.json` under `client_email`)
4. Grant "Editor" permission
5. Click "Send"

### 5. Get Spreadsheet ID

From the spreadsheet URL:
```
https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit
```

Copy the `SPREADSHEET_ID` part.

### 6. Update Claude Desktop Config

Replace `{{PROJECT_ROOT}}` in `claude_config.template.json` with your actual project path and copy to Claude Desktop config location:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

Example:
```json
{
  "mcpServers": {
    "gsheets": {
      "command": "npx",
      "args": ["-y", "mcp-gsheets"],
      "env": {
        "GOOGLE_CREDENTIALS_FILE": "/Users/kurikinton/Documents/niko-dev/ai-orchestrator/config/google-credentials.json"
      }
    }
  }
}
```

## Usage in Claude Desktop

Once configured, you can use the following tools:

### Read Credentials by Student ID

```
Use the gsheets tool to read row where column "student_id" equals "12345A"
from sheet "認証情報" in spreadsheet ID: YOUR_SPREADSHEET_ID
```

This will return:
```json
{
  "name": "kurihara yuya",
  "student_id": "12345A",
  "classroom_username": "student",
  "classroom_password": "password123"
}
```

### List All Credentials

```
Use the gsheets tool to read all rows from sheet "認証情報"
in spreadsheet ID: YOUR_SPREADSHEET_ID
```

## Integration with Workflow

The AI orchestrator workflow will:
1. Retrieve student credentials using `gsheets` tool
2. Use `classroom_username` and `classroom_password` to login to LMS
3. Use `name` and `student_id` to submit Google Forms

## Troubleshooting

### Error: "Permission denied"
- Verify service account email is added to spreadsheet with Editor permission
- Check `google-credentials.json` path in config

### Error: "Spreadsheet not found"
- Verify spreadsheet ID is correct
- Ensure service account has access to the spreadsheet

### Error: "API not enabled"
- Go to Google Cloud Console
- Enable Google Sheets API for your project

## Security Notes

- **NEVER commit `google-credentials.json` to git**
- Keep service account credentials secure
- Regularly rotate service account keys
- Use read-only permissions when possible (Editor needed for form submission tracking)
