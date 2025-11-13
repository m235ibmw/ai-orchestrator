#!/usr/bin/env node
import { Command } from "commander";
import { configSync } from "../src/commands/configSync.ts";

const program = new Command();

program.name("claud").description("CLI for syncing Claude Desktop configs");

program
  .command("config")
  .description("Manage Claude config")
  .command("sync")
  .description("Sync Claude Desktop config from template")
  .action(configSync);

program.parse();
