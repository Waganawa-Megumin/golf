#!/usr/bin/env node
/*
 * ライブスコアAPIの取り込み口（プローブ／生ダンプ）。
 *
 * 現状、この実行環境の egress ポリシーが api.sportradar.com / lpga-api.azurewebsites.net を
 * 403 で拒否しているため、レスポンスの実物を一度も観測できていません。
 * したがって「フィールドのマッピング」は意図的に書いていません。推測でマッピングを書くと、
 * 動いていないのに動いているように見えるコードができてしまうためです。
 *
 * 使い方:
 *   GOLF_API_KEY=xxxx node scripts/fetch-live.mjs <URL>
 *   node scripts/fetch-live.mjs "https://api.sportradar.com/golf/trial/v3/en/lpga/2026/tournaments/schedule.json?api_key=$GOLF_API_KEY"
 *
 * レスポンスは data/raw/ に生のまま保存し、トップレベルの構造だけを表示します。
 * 実物が1件でも取れたら、その構造を見てから map-live.mjs（データ変換）を書き起こす、という順序です。
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const url = process.argv[2];

if (!url) {
  console.error("使い方: node scripts/fetch-live.mjs <URL>");
  console.error("環境変数 GOLF_API_KEY を URL 内の $GOLF_API_KEY で参照できます。");
  process.exit(2);
}

const target = url.replace(/\$GOLF_API_KEY/g, process.env.GOLF_API_KEY ?? "");

// Node 組み込み fetch は HTTPS_PROXY を自動では読まない（>=22.21 は NODE_USE_ENV_PROXY=1 で読む）。
if (!process.env.NODE_USE_ENV_PROXY && process.env.HTTPS_PROXY) {
  console.error("ヒント: NODE_USE_ENV_PROXY=1 を付けて実行してください（プロキシ経由になります）。");
}

let res;
try {
  res = await fetch(target, { headers: { accept: "application/json" } });
} catch (err) {
  console.error("接続に失敗しました:", err.message);
  console.error("egress ポリシーで拒否されている場合は、環境のネットワーク設定で対象ホストを許可する必要があります。");
  console.error("状態確認: curl -sS \"$HTTPS_PROXY/__agentproxy/status\"");
  process.exit(1);
}

const body = await res.text();
console.log(`HTTP ${res.status} ${res.statusText} · ${body.length} bytes · ${res.headers.get("content-type") ?? "?"}`);

if (!res.ok) {
  console.error(body.slice(0, 800));
  process.exit(1);
}

mkdirSync(join(root, "data", "raw"), { recursive: true });
const slug = new URL(target).pathname.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const out = join(root, "data", "raw", `${stamp}-${slug}.json`);
writeFileSync(out, body, "utf8");
console.log("保存:", out);

try {
  const json = JSON.parse(body);
  const describe = (v, depth = 0) => {
    if (Array.isArray(v)) return `array(${v.length})` + (v.length && depth < 2 ? ` of ${describe(v[0], depth + 1)}` : "");
    if (v && typeof v === "object") return `{ ${Object.keys(v).slice(0, 14).join(", ")}${Object.keys(v).length > 14 ? ", …" : ""} }`;
    return typeof v;
  };
  console.log("\n--- レスポンス構造 ---");
  for (const [k, v] of Object.entries(json)) console.log(`${k}: ${describe(v)}`);
} catch {
  console.log("（JSON としてパースできませんでした。生ファイルを直接確認してください）");
}
