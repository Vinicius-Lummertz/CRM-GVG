"use strict";

const { loadConfig, startServer } = require("./server/index");

async function main() {
  const config = loadConfig({ rootDir: __dirname });
  await startServer(config);
}

main().catch((err) => {
  console.error("[startup] erro fatal:", err);
  process.exit(1);
});