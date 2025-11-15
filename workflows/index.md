# Workflow Index

This is the central index for all AI orchestration workflows. When a user mentions "workflow", Claude should check this file first to find the appropriate protocol.

## Important

- **Each workflow has a detailed protocol file** - Always navigate to the protocol file for complete instructions
- **Do NOT rely on descriptions below** - Descriptions are summaries only. The protocol file is the source of truth
- **Protocol files contain the actual steps** - Follow the protocol.md for each workflow, not the description here

---

## Available Workflows

### 1. World History (世界史概論) - University Assignment Automation

**Path**: [university/sekaishigairon/protocol.md](university/sekaishigairon/protocol.md)

**What it does**: Automates university assignment submissions for World History course

**When to use**: When user requests help with "世界史概論" assignments

**Action**: Open and follow the protocol file at `workflows/university/sekaishigairon/protocol.md`

**Key features**:
- Flexible student name search (Japanese/Romaji)
- Automatic credential retrieval from Google Sheets
- PDF material extraction with text parsing
- Google Form question retrieval
- AI-powered answer generation
- Answer validation
- Human-in-the-loop approval
- Automated form submission

**Version**: 1.1.0

---

## Usage Instructions for Claude

1. **When user mentions a workflow**:
   - Check this index file first
   - Identify the matching workflow
   - Navigate to the protocol.md file

2. **Read the complete protocol**:
   - Use the `get-protocol` MCP tool OR read the file directly
   - Follow ALL steps in the protocol sequentially
   - Do NOT improvise or skip steps

3. **Execute workflow**:
   - Follow the protocol's CRITICAL EXECUTION RULES
   - Use only the MCP tools specified in the protocol
   - Ask user for confirmation when required (HITL steps)

---

## Adding New Workflows

To add a new workflow:

1. Create a new directory under `workflows/`
2. Create a `protocol.md` file with detailed steps
3. Add an entry to this index.md file
4. Include: path, title, description, version

**Protocol file structure**:
- Status (version, purpose, last updated)
- Prerequisites (MCP servers, data, services)
- Critical Execution Rules
- Workflow Steps (numbered, with tools and expected outputs)
- Error Handling Strategy
- Success Criteria
- Usage Examples
- Maintenance Notes
- Version History
