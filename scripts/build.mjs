#!/usr/bin/env node
// src/page.html にデータを流し込み、2つの成果物を書き出す。
//   index.html         … 単体で開ける完全なHTML文書（doctype / lang / charset / viewport 付き）
//   dist/artifact.html … 公開用のフラグメント（配信側が <!doctype>〜<body> を付けるため文書シェルを持たない）
// 大会の進行に合わせて data/tournament.json を書き換えたら、このスクリプトを実行して再公開する。
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const data = JSON.parse(readFileSync(join(root, "data", "tournament.json"), "utf8"));
const src = readFileSync(join(root, "src", "page.html"), "utf8");

const MARKER = "<!--HEAD-END-->";
if (!src.includes(MARKER)) throw new Error(`src/page.html に ${MARKER} がありません`);
if (!src.includes("__DATA__")) throw new Error("src/page.html に __DATA__ プレースホルダがありません");

// JSON 内に </script> があると HTML が壊れるので無害化する。
const payload = JSON.stringify(data, null, 2).replace(/<\//g, "<\\/");
const filled = src.replace("__DATA__", () => payload);

const [head, body] = filled.split(MARKER);

const doc =
  '<!doctype html>\n<html lang="ja">\n<head>\n<meta charset="utf-8">\n' +
  '<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
  head.trim() + "\n</head>\n<body>\n" + body.trim() + "\n</body>\n</html>\n";

writeFileSync(join(root, "index.html"), doc, "utf8");
mkdirSync(join(root, "dist"), { recursive: true });
writeFileSync(join(root, "dist", "artifact.html"), filled.replace(MARKER, "").trim() + "\n", "utf8");

const holes = data.round1?.holes?.length ?? 0;
console.log(
  `書き出し完了: index.html（完全文書）/ dist/artifact.html（公開用フラグメント）\n` +
  `  ${holes} ホール · リーダーボード ${data.leaderboard?.rows?.length ?? 0} 行 · 更新 ${data.meta?.generatedAtLabel ?? data.meta?.generatedAt}`
);
