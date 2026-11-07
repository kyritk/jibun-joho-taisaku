// ビルド出力の自己検査。 node scripts/check-dist.mjs dist
// 脅威モデル T2・T6 の前提（外部リソースなし、inline script なし、CSP あり、外部リンクに noopener noreferrer）が
// 出力HTMLで守られているかを機械的に確認する。違反があれば exit 1。
import fs from 'node:fs';
import path from 'node:path';

const dir = process.argv[2] || 'dist';
const errors = [];
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
const files = walk(dir);
const htmlFiles = files.filter((f) => f.endsWith('.html'));

for (const f of htmlFiles) {
  const html = fs.readFileSync(f, 'utf8');
  const rel = path.relative(dir, f);
  // CSP meta が head の先頭付近にある
  if (!/<meta http-equiv="Content-Security-Policy"/.test(html)) errors.push(`${rel}: CSP meta が無い`);
  if (!/<meta name="referrer" content="no-referrer">/.test(html)) errors.push(`${rel}: referrer meta が無い`);
  // inline script（src 無しの <script>）は data block 以外禁止
  for (const m of html.matchAll(/<script\b([^>]*)>/g)) {
    const attrs = m[1];
    const isData = /type="application\/json"/.test(attrs);
    const hasSrc = /\bsrc="/.test(attrs);
    if (!isData && !hasSrc) errors.push(`${rel}: inline script がある (${attrs.trim()})`);
    if (hasSrc && /src="(https?:)?\/\//.test(attrs)) errors.push(`${rel}: 外部スクリプト (${attrs.trim()})`);
  }
  // 外部のスタイル・画像・フォント・iframe
  for (const m of html.matchAll(/<(link|img|iframe|embed|object|source)\b[^>]*>/g)) {
    const tag = m[0];
    if (/^<link\b[^>]*rel="canonical"/.test(tag)) continue; // canonical は読み込みではない
    if (/(href|src)="(https?:)?\/\//.test(tag)) errors.push(`${rel}: 外部リソース ${tag.slice(0, 80)}`);
    if (/^<(iframe|embed|object)/.test(tag)) errors.push(`${rel}: 埋め込み要素 ${tag.slice(0, 60)}`);
  }
  if (/<style\b/.test(html)) errors.push(`${rel}: inline <style> がある（style-src 'self' で遮断される）`);
  if (/\bon[a-z]+="/.test(html)) errors.push(`${rel}: inline イベントハンドラがある`);
  if (/\bstyle="/.test(html)) errors.push(`${rel}: style 属性がある（CSPで遮断される）`);
  // 外部リンクは rel="noopener noreferrer"
  for (const m of html.matchAll(/<a\b[^>]*href="https?:\/\/[^"]*"[^>]*>/g)) {
    if (!/rel="noopener noreferrer"/.test(m[0])) errors.push(`${rel}: 外部リンクに rel が無い ${m[0].slice(0, 80)}`);
  }
  if (/javascript:/i.test(html)) errors.push(`${rel}: javascript: URL がある`);
}
// JS に危険なシンクが無い
for (const f of files.filter((x) => x.endsWith('.js'))) {
  const js = fs.readFileSync(f, 'utf8');
  const rel = path.relative(dir, f);
  for (const sink of ['innerHTML', 'outerHTML', 'document.write', 'insertAdjacentHTML', 'eval(', 'new Function', 'setHTMLUnsafe']) {
    if (js.includes(sink)) errors.push(`${rel}: 危険なシンク ${sink}`);
  }
  if (/\bfetch\(\s*['"`]https?:/.test(js)) errors.push(`${rel}: 外部への fetch`);
}
// Service Worker を置いていない（T5）
if (files.some((f) => /(^|[\\/])(sw|service-worker)\.js$/.test(f))) errors.push('Service Worker ファイルがある（フェーズ1では置かない）');

for (const e of errors) console.log('ERROR', e);
console.log(`checked ${htmlFiles.length} html / ${files.length} files, errors ${errors.length}`);
process.exit(errors.length ? 1 : 0);
