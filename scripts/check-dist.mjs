// ビルド出力の自己検査。 node scripts/check-dist.mjs dist
// 脅威モデル T2・T6 の前提（外部リソースなし、inline script なし、CSP あり、外部リンクに noopener noreferrer）が
// 出力HTMLで守られているかを機械的に確認する。違反があれば exit 1。
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const dir = process.argv[2] || 'dist';
const errors = [];
// 規定の CSP（scripts/build.mjs の CSP と同じ文字列。片方を変えたら両方を変える）
const CSP = "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; manifest-src 'self'; base-uri 'none'; object-src 'none'; form-action 'none'; require-trusted-types-for 'script'; trusted-types 'none'; upgrade-insecure-requests";
const sriCache = {};
const sriOf = (file) => (sriCache[file] ||= 'sha384-' + crypto.createHash('sha384').update(fs.readFileSync(path.join(dir, file))).digest('base64'));
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
const files = walk(dir);
const htmlFiles = files.filter((f) => f.endsWith('.html'));

for (const f of htmlFiles) {
  const html = fs.readFileSync(f, 'utf8');
  const rel = path.relative(dir, f);
  // CSP meta が head の先頭付近にある
  if (!/<meta http-equiv="Content-Security-Policy"/.test(html)) errors.push(`${rel}: CSP meta が無い`);
  if (!/<meta name="referrer" content="no-referrer">/.test(html)) errors.push(`${rel}: referrer meta が無い`);
  // CSP の内容が build.mjs と完全に一致する（弱められていない）
  if (!html.includes(`<meta http-equiv="Content-Security-Policy" content="${CSP}">`)) errors.push(`${rel}: CSP の内容が規定と違う`);
  // inline script（src 無しの <script>）は data block 以外禁止。属性値の中の > でタグの切れ目を誤らないよう、引用符つきの属性値をひとまとまりで読む
  const ATTRS = String.raw`((?:[^>"']|"[^"]*"|'[^']*')*)`;
  for (const m of html.matchAll(new RegExp(String.raw`<script\b${ATTRS}>`, 'gi'))) {
    const attrs = m[1];
    const isData = /\btype\s*=\s*"application\/json"/i.test(attrs);
    const hasSrc = /\bsrc\s*=/i.test(attrs);
    if (!isData && !hasSrc) errors.push(`${rel}: inline script がある (${attrs.trim()})`);
    if (hasSrc && /\bsrc\s*=\s*["']?(https?:)?\/\//i.test(attrs)) errors.push(`${rel}: 外部スクリプト (${attrs.trim()})`);
    if (hasSrc && !/\bintegrity\s*=\s*"sha384-/.test(attrs)) errors.push(`${rel}: integrity の無いスクリプト (${attrs.trim()})`);
  }
  // 埋め込みデータは JSON として読める（エスケープの誤りでアプリが白紙にならない）
  for (const m of html.matchAll(/<script id="data" type="application\/json">([\s\S]*?)<\/script>/g)) {
    try { JSON.parse(m[1]); } catch (e) { errors.push(`${rel}: 埋め込み JSON が読めない（${e.message}）`); }
  }
  // 外部のスタイル・画像・フォント・音声・動画・iframe
  for (const m of html.matchAll(new RegExp(String.raw`<(link|img|iframe|embed|object|source|video|audio|track|image|use)\b${ATTRS}>`, 'gi'))) {
    const tag = m[0];
    if (/^<link\b[^>]*rel="canonical"/.test(tag)) continue; // canonical は読み込みではない
    if (/\b(href|src|srcset|poster|xlink:href)\s*=\s*["']?(https?:)?\/\//i.test(tag)) errors.push(`${rel}: 外部リソース ${tag.slice(0, 80)}`);
    if (/^<(iframe|embed|object)/.test(tag)) errors.push(`${rel}: 埋め込み要素 ${tag.slice(0, 60)}`);
  }
  if (/<style\b/.test(html)) errors.push(`${rel}: inline <style> がある（style-src 'self' で遮断される）`);
  if (/<[a-z][^>]*\s+on[a-z]+\s*=/i.test(html)) errors.push(`${rel}: inline イベントハンドラがある`);
  if (/<[a-z][^>]*\s+style\s*=/i.test(html)) errors.push(`${rel}: style 属性がある（CSPで遮断される）`);
  // 外部リンクは rel="noopener noreferrer"（プロトコル相対 // も外部）
  for (const m of html.matchAll(/<a\b[^>]*href\s*=\s*["']?(?:https?:)?\/\/[^"'\s>]*["']?[^>]*>/gi)) {
    if (!/rel="noopener noreferrer"/.test(m[0])) errors.push(`${rel}: 外部リンクに rel が無い ${m[0].slice(0, 80)}`);
  }
  if (/\b(href|src)\s*=\s*["']\/\//i.test(html)) errors.push(`${rel}: プロトコル相対 URL がある`);
  if (/javascript:/i.test(html)) errors.push(`${rel}: javascript: URL がある`);
  // 転送・埋め込み・フォームの経路が無い
  if (/<meta\b[^>]*http-equiv="refresh"/i.test(html)) errors.push(`${rel}: meta refresh がある`);
  if (/\bsrcdoc=/.test(html)) errors.push(`${rel}: srcdoc がある`);
  if (/\b(href|src)="data:/.test(html)) errors.push(`${rel}: data: URL がある`);
  if (/<form\b/.test(html)) errors.push(`${rel}: form がある（form-action 'none'）`);
  if (/\bhref="http:\/\//.test(html)) errors.push(`${rel}: http: のリンクがある`);
  // Subresource Integrity：app.css / app.js の integrity が実ファイルと一致する
  for (const m of html.matchAll(/<(link|script)\b[^>]*\b(?:href|src)="[^"]*\b(app\.(?:css|js))"[^>]*>/g)) {
    const tag = m[0], file = m[2];
    const im = tag.match(/\bintegrity="([^"]+)"/);
    if (!im) { errors.push(`${rel}: ${file} に integrity が無い`); continue; }
    if (im[1] !== sriOf(file)) errors.push(`${rel}: ${file} の integrity が実ファイルと一致しない`);
  }
  // アイコンは同一文書のスプライトだけを参照する（外部SVGは CSP とブラウザ差で遮断されうる）
  for (const m of html.matchAll(/<use\b[^>]*>/g)) {
    if (!/\bhref="#i-[a-z0-9-]+"/.test(m[0])) errors.push(`${rel}: <use> が同一文書の #i-… 以外を参照 ${m[0].slice(0, 80)}`);
  }
  if (/<svg\b/.test(html) && !/<svg class="sprite"/.test(html)) errors.push(`${rel}: アイコンのスプライトが無い`);
  // 絵文字をアイコン代わりに使わない（OS で見え方が変わり、読み上げが二重になる）
  // （★☆などの記号は商品名に使われるため対象外。絵文字ブロックと記号絵文字だけを見る）
  if (/[\u{1F000}-\u{1FAFF}\u{2700}-\u{27BF}\u{2614}\u{2615}\u{26A0}-\u{26FF}]/u.test(html)) errors.push(`${rel}: 絵文字が含まれる`);
}
// JS に危険なシンクが無い
for (const f of files.filter((x) => x.endsWith('.js'))) {
  const js = fs.readFileSync(f, 'utf8');
  const rel = path.relative(dir, f);
  for (const sink of ['innerHTML', 'outerHTML', 'document.write', 'insertAdjacentHTML', 'eval(', 'new Function', 'setHTMLUnsafe', 'createContextualFragment', 'DOMParser', 'srcdoc', 'location.href =', 'location.assign(', 'location.replace(']) {
    if (js.includes(sink)) errors.push(`${rel}: 危険なシンク ${sink}`);
  }
  if (/\bset(?:Timeout|Interval)\(\s*['"`]/.test(js)) errors.push(`${rel}: 文字列引数の setTimeout/setInterval`);
  if (/\bfetch\(\s*['"`]https?:/.test(js)) errors.push(`${rel}: 外部への fetch`);
}
// security.txt（RFC 9116）がある
{
  const st = path.join(dir, '.well-known', 'security.txt');
  if (!fs.existsSync(st)) errors.push('.well-known/security.txt が無い');
  else { const t = fs.readFileSync(st, 'utf8'); if (!/^Contact: https:\/\//m.test(t) || !/^Expires: \d{4}-/m.test(t)) errors.push('security.txt に Contact/Expires が無い'); }
}
// Service Worker を置いていない（T5）
if (files.some((f) => /(^|[\\/])(sw|service-worker)\.js$/.test(f))) errors.push('Service Worker ファイルがある（フェーズ1では置かない）');

for (const e of errors) console.log('ERROR', e);
console.log(`checked ${htmlFiles.length} html / ${files.length} files, errors ${errors.length}`);
process.exit(errors.length ? 1 : 0);
