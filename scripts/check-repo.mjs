// 公開してはいけないものがリポジトリに入っていないかの検査。 node scripts/check-repo.mjs [--staged]
//   --staged : コミット前の pre-commit フックから呼ぶ（git のステージ済みファイルだけを見る）
//   省略     : git 追跡中の全ファイルを見る（CI で実行）
// 見るもの：秘密情報（トークン・秘密鍵）、端末のパスやユーザー名、メールアドレス、プライベートIP、
//          公開文書の「未完了」項目（SECURITY.md / docs/threat-model.md / CLAUDE.md は完了したことだけを書く）、
//          .private-terms（git 管理外。絶対に公開しない語を1行1つで書く）に載っている語。
// Node 標準ライブラリのみ。違反があれば exit 1。
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const staged = process.argv.includes('--staged');
const git = (...a) => execFileSync('git', a, { cwd: root, encoding: 'utf8' });

const files = (staged ? git('diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z') : git('ls-files', '-z'))
  .split('\0').filter(Boolean);
const content = (f) => (staged ? execFileSync('git', ['show', `:${f}`], { cwd: root }) : fs.readFileSync(path.join(root, f)));
const isText = (buf) => !buf.subarray(0, 8000).includes(0);

// 1) 秘密情報
const SECRETS = [
  [/\bgh[pousr]_[A-Za-z0-9]{20,}\b/, 'GitHub トークン'],
  [/\bgithub_pat_[A-Za-z0-9_]{20,}\b/, 'GitHub fine-grained トークン'],
  [/\bAKIA[0-9A-Z]{16}\b/, 'AWS アクセスキー'],
  [/-----BEGIN (?:RSA |OPENSSH |EC |DSA |PGP )?PRIVATE KEY-----/, '秘密鍵'],
  [/\bxox[baprs]-[A-Za-z0-9-]{10,}\b/, 'Slack トークン'],
  [/\bsk-[A-Za-z0-9]{20,}\b/, 'API キー（sk-）'],
  [/\bAIza[0-9A-Za-z_-]{30,}\b/, 'Google API キー'],
  [/\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\b/, 'JWT'],
];
// 2) 端末・個人の情報
const PERSONAL = [
  [/[A-Za-z]:\\Users\\[^\\\s"'`]+/, 'Windows のユーザーパス'],
  [/\/(?:c|mnt\/c)\/Users\/[^/\s"'`]+/, 'Windows のユーザーパス（POSIX 表記）'],
  [/\/home\/[a-z0-9_-]+\//, 'Linux のホームパス'],
  [/\/Users\/[a-z0-9_-]+\//i, 'macOS のホームパス'],
  [/\b(?:10|127)\.\d{1,3}\.\d{1,3}\.\d{1,3}\b|\b192\.168\.\d{1,3}\.\d{1,3}\b|\b172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}\b/, 'プライベートIPアドレス'],
];
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const EMAIL_ALLOW = [/@users\.noreply\.github\.com$/, /^noreply@anthropic\.com$/, /@example\.(?:com|jp)$/];
// 3) 公開文書の未完了項目
const DONE_ONLY_DOCS = new Set(['SECURITY.md', 'docs/threat-model.md', 'CLAUDE.md']);
// 4) 絶対に公開しない語（git 管理外のファイル。無ければ飛ばす）
const privateTermsFile = path.join(root, '.private-terms');
const privateTerms = fs.existsSync(privateTermsFile)
  ? fs.readFileSync(privateTermsFile, 'utf8').split(/\r?\n/).map((s) => s.trim()).filter((s) => s && !s.startsWith('#'))
  : [];

const SKIP = new Set(['LICENSE', 'data/LICENSE', 'THIRD_PARTY_NOTICES.md']);
const errors = [];
for (const f of files) {
  if (SKIP.has(f) || f === 'scripts/check-repo.mjs') continue;
  if (/^\.private-terms$|(^|\/)id_(rsa|ed25519|ecdsa)|\.(pem|key|p12|pfx)$|^\.env/.test(f)) { errors.push(`${f}: このファイルは公開リポジトリに入れない`); continue; }
  let buf;
  try { buf = content(f); } catch { continue; }
  if (!isText(buf)) continue;
  const text = buf.toString('utf8');
  const lines = text.split('\n');
  const report = (i, msg) => errors.push(`${f}:${i + 1}: ${msg}`);
  lines.forEach((line, i) => {
    for (const [re, label] of SECRETS) if (re.test(line)) report(i, `${label}らしき文字列`);
    for (const [re, label] of PERSONAL) if (re.test(line)) report(i, label);
    // 事案データの中のメールアドレスは企業の公式発表に書かれた公開の窓口なので対象外
    if (!f.startsWith('data/incidents/')) for (const m of line.matchAll(EMAIL)) if (!EMAIL_ALLOW.some((a) => a.test(m[0]))) report(i, `メールアドレス ${m[0]}`);
    for (const t of privateTerms) if (line.toLowerCase().includes(t.toLowerCase())) report(i, '非公開の語（.private-terms）');
    if (DONE_ONLY_DOCS.has(f) && /^\s*- \[ \]/.test(line)) report(i, '未完了項目は公開文書に書かない（完了してから書く）');
  });
}

for (const e of errors) console.log('ERROR', e);
console.log(`check-repo: ${files.length} files${staged ? ' (staged)' : ''}, private terms ${privateTerms.length}, errors ${errors.length}`);
process.exit(errors.length ? 1 : 0);
