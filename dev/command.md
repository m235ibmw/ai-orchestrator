# Development Commands

## Build & Compile

### MCP Server (TypeScript)
```bash
# Compile TypeScript to JavaScript
cd /Users/kurikinton/Documents/niko-dev/ai-orchestrator/mcp-server
npm exec tsc

# Watch mode (auto-compile on file changes)
cd /Users/kurikinton/Documents/niko-dev/ai-orchestrator/mcp-server
npm exec tsc -- --watch
```

### Classroom Site (Next.js)
```bash
# Build for production
cd /Users/kurikinton/Documents/niko-dev/ai-orchestrator/classroom-site
npm run build

# Development build (with hot reload)
cd /Users/kurikinton/Documents/niko-dev/ai-orchestrator/classroom-site
npm run dev
```

## Server Startup

### Classroom Site (Next.js)
```bash
# Development mode (with hot reload)
cd /Users/kurikinton/Documents/niko-dev/ai-orchestrator/classroom-site
npm run dev

# Production mode
cd /Users/kurikinton/Documents/niko-dev/ai-orchestrator/classroom-site
npm run build
npm start
```

### MCP Server
```bash
# Debug mode (runs index.ts debug function)
cd /Users/kurikinton/Documents/niko-dev/ai-orchestrator/mcp-server
node dist/index.js debug

# MCP mode (stdio transport for Claude Desktop)
cd /Users/kurikinton/Documents/niko-dev/ai-orchestrator/mcp-server
node dist/index.js
```

## Testing

### Google Form Tests
```bash
# Test form question extraction
cd /Users/kurikinton/Documents/niko-dev/ai-orchestrator/mcp-server
node test-google-form.cjs

# Test form submission
cd /Users/kurikinton/Documents/niko-dev/ai-orchestrator/mcp-server
node test-form-submission.cjs

# Debug form details
cd /Users/kurikinton/Documents/niko-dev/ai-orchestrator/mcp-server
node debug-google-form.cjs
node debug-google-form-details.cjs
```

### PDF Extraction Tests
```bash
# Test PDF extraction (simple)
cd /Users/kurikinton/Documents/niko-dev/ai-orchestrator/mcp-server
node test-extraction-simple.cjs
```

### GPT Mock API Tests
```bash
# Test answer validation
cd /Users/kurikinton/Documents/niko-dev/ai-orchestrator/mcp-server
node test-gpt-mock.cjs
```

## Complete Workflow (Compile → Test)

### Test GPT Mock API (Full workflow)
```bash
# 1. Start classroom site (in separate terminal)
cd /Users/kurikinton/Documents/niko-dev/ai-orchestrator/classroom-site
npm run dev

# 2. Compile TypeScript
cd /Users/kurikinton/Documents/niko-dev/ai-orchestrator/mcp-server
npm exec tsc

# 3. Run test
cd /Users/kurikinton/Documents/niko-dev/ai-orchestrator/mcp-server
node test-gpt-mock.cjs
```

### Test Google Form Submission (Full workflow)
```bash
# 1. Compile TypeScript
cd /Users/kurikinton/Documents/niko-dev/ai-orchestrator/mcp-server
npm exec tsc

# 2. Run test
cd /Users/kurikinton/Documents/niko-dev/ai-orchestrator/mcp-server
node test-form-submission.cjs
```

## Common Development Tasks

### After modifying TypeScript files
```bash
cd /Users/kurikinton/Documents/niko-dev/ai-orchestrator/mcp-server
npm exec tsc
```

### After modifying Next.js API routes
```bash
# Next.js has hot reload in dev mode, just wait for it to reload
# If needed, restart dev server:
cd /Users/kurikinton/Documents/niko-dev/ai-orchestrator/classroom-site
npm run dev
```

### Clean build
```bash
# MCP Server
cd /Users/kurikinton/Documents/niko-dev/ai-orchestrator/mcp-server
rm -rf dist
npm exec tsc

# Classroom Site
cd /Users/kurikinton/Documents/niko-dev/ai-orchestrator/classroom-site
rm -rf .next
npm run build
```

## Package Management

### Install dependencies
```bash
# MCP Server
cd /Users/kurikinton/Documents/niko-dev/ai-orchestrator/mcp-server
npm install

# Classroom Site
cd /Users/kurikinton/Documents/niko-dev/ai-orchestrator/classroom-site
npm install
```

### Add new package
```bash
# MCP Server
cd /Users/kurikinton/Documents/niko-dev/ai-orchestrator/mcp-server
npm install <package-name>

# Classroom Site
cd /Users/kurikinton/Documents/niko-dev/ai-orchestrator/classroom-site
npm install <package-name>
```

## Environment Setup

### Required environment variables
```bash
# .env file locations:
# - /Users/kurikinton/Documents/niko-dev/ai-orchestrator/mcp-server/.env
# - /Users/kurikinton/Documents/niko-dev/ai-orchestrator/classroom-site/.env
```

## Troubleshooting

### TypeScript compilation errors
```bash
# Check TypeScript version
cd /Users/kurikinton/Documents/niko-dev/ai-orchestrator/mcp-server
npm exec tsc -- --version

# Verbose compilation
cd /Users/kurikinton/Documents/niko-dev/ai-orchestrator/mcp-server
npm exec tsc -- --verbose
```

### Port already in use (Next.js)
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use different port
cd /Users/kurikinton/Documents/niko-dev/ai-orchestrator/classroom-site
PORT=3001 npm run dev
```

### Clear Puppeteer cache
```bash
# Remove cached browser
rm -rf ~/.cache/puppeteer
```
