#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const target = process.argv[2];
if (!target) throw new Error("Usage: node scripts/inject_perform_ai_web_shell.mjs <exported-index.html>");

const path = resolve(target);
const original = await readFile(path, "utf8");
const base = (process.env.EXPO_PUBLIC_PERFORM_BASE_PATH || "/app").replace(/\/+$/, "");
if (!/^\/[A-Za-z0-9/_-]*$/.test(base)) throw new Error("Invalid deployment path.");
if (original.includes("data-perform-ai-shell")) throw new Error("PERFORM AI web shell was already injected.");
if (!original.includes("</head>") || !original.includes("</body>")) throw new Error("Exported HTML does not contain expected document markers.");

const head = `\n  <meta data-perform-ai-shell="meta" name="theme-color" content="#050811">\n  <meta name="description" content="Private rehearsal tools for speeches, presentations, and scripts.">\n  <link rel="manifest" href="/app/manifest.webmanifest">\n  <link rel="apple-touch-icon" href="/app/assets/icon-192.png">\n`;
const script = `\n  <script data-perform-ai-shell="service-worker">if('serviceWorker' in navigator&&location.protocol==='https:'){window.addEventListener('load',function(){navigator.serviceWorker.register('/app/service-worker.js',{scope:'/app/'}).catch(function(){})})}</script>\n`;
const output = original.replace("</head>", `${head.replaceAll('/app/', base + '/') }</head>`).replace("</body>", `${script.replaceAll('/app/', base + '/') }</body>`);
await writeFile(path, output, "utf8");
console.log(`Injected PERFORM AI PWA shell into ${path}`);
