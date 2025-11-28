import fs from "fs";
import path from "path";
import dotenv from "dotenv";

export function configSync() {
  const root = process.cwd();

  const envPath = path.join(root, ".env");
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }

  if (!process.env.PROJECT_ROOT) {
    console.error("❌ PROJECT_ROOT is not set in .env");
    process.exit(1);
  }

  const templatePath = path.join(root, "config/claude_config.template.json");

  const targetPath =
    process.env.CLAUDE_CONFIG_PATH ||
    `${process.env.HOME}/Library/Application Support/Claude/claude_desktop_config.json`;

  if (fs.existsSync(targetPath)) {
    const backupPath = `${targetPath}.backup-${Date.now()}`;
    fs.copyFileSync(targetPath, backupPath);
    console.log(`🔄 Backup created: ${backupPath}`);
  }

  let content = fs.readFileSync(templatePath, "utf-8");

  // Replace all {{ENV_VAR}} patterns with corresponding environment variables
  content = content.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
    const value = process.env[varName];
    if (!value) {
      console.warn(`⚠️  Warning: ${varName} is not set in environment`);
      return match; // Keep placeholder if not found
    }
    // Escape newlines and other special chars for JSON string values
    return value
      .replace(/\\/g, "\\\\")
      .replace(/\n/g, "\\n")
      .replace(/\r/g, "\\r")
      .replace(/\t/g, "\\t");
  });

  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, content, "utf-8");

  console.log(`✅ Synced Claude config → ${targetPath}`);
}
