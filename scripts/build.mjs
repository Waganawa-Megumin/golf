#!/usr/bin/env node
// data/tournament.json を index.html の <script id="dataset"> に流し込む。
// 大会の進行に合わせて JSON を書き換えたら、このスクリプトを実行して再公開する。
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dataPath = join(root, "data", "tournament.json");
const htmlPath = join(root, "index.html");

const data = JSON.parse(readFileSync(dataPath, "utf8"));
const html = readFileSync(htmlPath, "utf8");

const open = '<script type="application/json" id="dataset">';
const start = html.indexOf(open);
if (start === -1) throw new Error("dataset スクリプトタグが index.html に見つかりません");
const from = start + open.length;
const end = html.indexOf("</" + "script>", from);
if (end === -1) throw new Error("dataset スクリプトタグが閉じられていません");

// JSON 内に </script> があると HTML が壊れるので無害化する。
const payload = JSON.stringify(data, null, 2).replace(/<\//g, "<\\/");
writeFileSync(htmlPath, html.slice(0, from) + "\n" + payload + "\n" + html.slice(end), "utf8");

const holes = data.round1?.holes?.length ?? 0;
console.log(`index.html を更新しました（${holes} ホール / リーダーボード ${data.leaderboard?.rows?.length ?? 0} 行 / 更新時刻 ${data.meta?.generatedAt}）`);
