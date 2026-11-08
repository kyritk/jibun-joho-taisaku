// 本番ビルド。 node scripts/build.mjs [--out dist] [--include-drafts] [--site-url https://.../]
// Node 標準ライブラリのみ。ネットワークは使わない。出力はすべて相対パスで、どのサブパスでも動く。
// セキュリティ方針は docs/threat-model.md、画面設計は docs/ux-research.md。出力の自己検査は scripts/check-dist.mjs。
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : def; };
const includeDrafts = args.includes('--include-drafts');
const outDir = path.resolve(root, opt('--out', 'dist'));
const SITE_URL = opt('--site-url', 'https://kyritk.github.io/jibun-joho-taisaku/');
const SITE_NAME = 'じぶんの情報対策';
const TAGLINE = 'サービスの情報漏洩と、やること確認。';
const REPO_URL = 'https://github.com/kyritk/jibun-joho-taisaku';

const read = (p) => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
// Subresource Integrity：app.css / app.js の内容ハッシュを HTML に埋め、配信経路での改ざんをブラウザに検出させる（T2）
const APP_CSS = fs.readFileSync(path.join(root, 'src/app.css'));
const APP_JS = fs.readFileSync(path.join(root, 'src/app.js'));
const sri = (buf) => 'sha384-' + crypto.createHash('sha384').update(buf).digest('base64');
const SRI = { css: sri(APP_CSS), js: sri(APP_JS) };
const readDir = (dir, approved) => {
  const full = path.join(root, 'data', 'incidents', dir);
  if (!fs.existsSync(full)) return [];
  return fs.readdirSync(full).filter((f) => f.endsWith('.json'))
    .map((f) => ({ ...JSON.parse(fs.readFileSync(path.join(full, f), 'utf8')), _approved: approved }));
};
const cards = read('data/cards.json');
const services = read('data/services.json');
const domains = read('data/official-domains.json');
const allowedHosts = new Set(domains.hosts.map((h) => h.host));
const incidents = [...readDir('approved', true), ...(includeDrafts ? readDir('drafts', false) : [])]
  .sort((a, b) => (a.last_updated < b.last_updated ? 1 : -1));
const today = new Date().toISOString().slice(0, 10);

// ---------- 安全なHTML生成（すべての動的値はここを通す）
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const safeUrl = (u, where) => {
  const parsed = new URL(u); // 不正なら例外でビルド失敗
  if (parsed.protocol !== 'https:') throw new Error(`${where}: https 以外のURL ${u}`);
  if (!allowedHosts.has(parsed.hostname)) throw new Error(`${where}: 許可リストに無いホスト ${parsed.hostname}`);
  return esc(parsed.href);
};
const ext = (u, label, where) => `<a href="${safeUrl(u, where)}" target="_blank" rel="noopener noreferrer">${esc(label || u)}</a>`;
const fmtDate = (d) => { const [y, m, dd] = d.split('-'); return `${y}年${Number(m)}月${Number(dd)}日`; };
const fmtMd = (d) => { const [, m, dd] = d.split('-'); return `${Number(m)}月${Number(dd)}日`; };

const STATUS_LABEL = { suspected: '漏洩のおそれ', confirmed: '漏洩を確認', individually_notified: '漏洩を確認', denied: '漏洩なしと公表' };
const STATUS_SUB = { suspected: '漏洩のおそれがあると公表', confirmed: '漏洩を確認したと公表', individually_notified: '漏洩を確認し、対象の人に会社から連絡しています', denied: 'その後「漏洩はなかった」と公表されました' };
const INFO_LABEL = {
  credentials: 'ID・パスワード', password: 'パスワード', credit_card: 'クレジットカード番号', credit_card_partial: 'カード番号の一部（下4桁など）',
  email: 'メールアドレス', phone: '電話番号', address: '住所', name: '氏名', birthdate: '生年月日', id_document_image: '本人確認書類の画像',
  bank_account: '銀行口座', my_number: 'マイナンバー', financial_assets: '資産の情報', family_composition: '家族構成', medical: '病歴・診療の情報',
  purchase_history: '購入・利用履歴', other: 'その他',
};
// ---------- アイコン（assets/icons/*.svg → HTML内スプライト）。docs/ux-visual-research.md 6章
// 素材ファイルは「信頼できない入力」として扱い、<path> の d と fill-rule だけを取り出す。それ以外の要素・属性・スクリプトは捨てる。
// 同一文書の <use href="#i-…"> はネットワーク取得が無いので、CSP default-src 'none' のままで動く。
const ICON_ID = /^[a-z0-9-]+$/;
const PATH_D = /^[MmLlHhVvCcSsQqTtAaZz0-9 .,\-]+$/;
function loadIcons() {
  const dir = path.join(root, 'assets', 'icons');
  const out = new Map();
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.svg')).sort()) {
    const id = f.slice(0, -4);
    if (!ICON_ID.test(id)) throw new Error(`assets/icons/${f}: ファイル名は英小文字・数字・ハイフンのみ`);
    const src = fs.readFileSync(path.join(dir, f), 'utf8');
    const vb = src.match(/viewBox="([^"]+)"/);
    if (!vb || vb[1].trim() !== '0 0 24 24') throw new Error(`assets/icons/${f}: viewBox は 0 0 24 24 に揃える`);
    const paths = [];
    for (const m of src.matchAll(/<path\b([^>]*?)\/?>/g)) {
      const d = m[1].match(/\bd="([^"]*)"/);
      if (!d || !PATH_D.test(d[1])) throw new Error(`assets/icons/${f}: path の d に想定外の文字`);
      const fr = m[1].match(/\bfill-rule="(evenodd|nonzero)"/);
      paths.push(`<path${fr ? ` fill-rule="${fr[1]}"` : ''} d="${d[1].trim()}"></path>`);
    }
    if (!paths.length) throw new Error(`assets/icons/${f}: <path> が無い（path 以外の図形は使わない）`);
    out.set(id, paths.join(''));
  }
  return out;
}
const ICONS = loadIcons();
const SPRITE = `<svg class="sprite" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">${[...ICONS].map(([id, p]) => `<symbol id="i-${id}" viewBox="0 0 24 24">${p}</symbol>`).join('')}</svg>`;
const icon = (name, cls = '') => {
  if (!ICONS.has(name)) throw new Error(`unknown icon "${name}"（assets/icons/${name}.svg が無い）`);
  return `<svg class="icon${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><use href="#i-${name}"></use></svg>`;
};
const catByKey = Object.fromEntries(services.categories.map((c) => [c.key, c]));
const svcById = Object.fromEntries(services.services.map((s) => [s.id, s]));
const avatarHtml = (svc, size = '') => {
  const cat = svc && catByKey[svc.category];
  return `<span class="av${size ? ' ' + size : ''}${cat ? ' c-' + esc(cat.key) : ''}" aria-hidden="true">${icon(cat ? cat.icon : 'layout-grid')}</span>`;
};

// ---------- ページの共通枠
const CSP = [
  "default-src 'none'", "script-src 'self'", "style-src 'self'", "img-src 'self'", "connect-src 'self'", "manifest-src 'self'",
  "base-uri 'none'", "object-src 'none'", "form-action 'none'", "require-trusted-types-for 'script'", "trusted-types 'none'",
  'upgrade-insecure-requests',
].join('; ');

function page({ rel, title, description, body, canonical, withApp = false, dataJson = null, current = '' }) {
  const fullTitle = title ? `${title}｜${SITE_NAME}` : SITE_NAME;
  // タブは工程順（ホーム → 1 サービス → 2 いまの状況 → 3 やること）。設定は右上の歯車（文字なし、aria-label）
  // 2〜4番目は工程（矢印形のタブ。左上に番号の丸、済んだ工程は app.js が✓に変える）
  const nav = [['', 'ホーム', 'home', 0], ['services', 'サービス', 'layout-grid', 1], ['status', 'いまの状況', 'table', 2], ['todo', 'やること', 'list-check', 3]]
    .map(([k, label, ic, n]) => `<a href="${rel}#/${k}"${n ? ' class="step"' : ''}${current === k && withApp ? ' aria-current="page"' : ''}>${n ? `<span class="n" aria-hidden="true">${n}</span><span class="sr-only">工程${n}：</span>` : ''}${icon(ic)}${label}</a>`).join('');
  return `<!doctype html>
<html lang="ja">
<head>
<meta http-equiv="Content-Security-Policy" content="${CSP}">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="referrer" content="no-referrer">
<meta name="color-scheme" content="light dark">
<meta name="theme-color" content="#0066cc">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(description)}">
${canonical !== undefined ? `<link rel="canonical" href="${esc(SITE_URL + canonical)}">` : ''}
<link rel="stylesheet" href="${rel}app.css" integrity="${SRI.css}">
<link rel="icon" href="${rel}icon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="${rel}icon-180.png">
<link rel="manifest" href="${rel}manifest.webmanifest">
</head>
<body>
${SPRITE}
<header class="site-header">
  <div class="wrap">
    <a class="brand" href="${rel}#/">${esc(SITE_NAME)}</a>
    <a class="gear" href="${rel}#/settings" aria-label="設定"${current === 'settings' && withApp ? ' aria-current="page"' : ''}>${icon('settings')}</a>
    <nav class="primary" aria-label="主な画面">${nav}</nav>
  </div>
</header>
<main${withApp ? ' id="app"' : ' class="static"'}>
${withApp ? '' : `<div class="wrap">${body}</div>`}
</main>
${withApp ? `<noscript><div class="wrap"><div class="banner info">${icon('info-circle')}<div><p>この画面にはJavaScriptが必要です。JavaScriptを使わずに読める <a href="${rel}incidents/">事案の一覧</a> もあります。</p></div></div></div></noscript>` : ''}
<footer>
  <div class="wrap">
    <nav aria-label="困ったとき・このサイトについて"><a href="${rel}#/settings">家族に見せる</a><a href="${rel}#/help">相談窓口</a><a href="${rel}faq.html">よくある質問</a><a href="${rel}about.html">このサイトについて</a><a href="${rel}privacy.html">プライバシー</a><a href="${rel}incidents/">すべての事案</a><a href="${REPO_URL}/issues/new/choose" target="_blank" rel="noopener noreferrer">訂正・追加の依頼</a><a href="${REPO_URL}" target="_blank" rel="noopener noreferrer">ソースコード</a></nav>
    <p><b>ご注意</b>：会社が公表した事実と、公的機関が勧める対処をまとめています。あなたが対象かは各社からの連絡でご確認ください。網羅性・即時性は保証しません。</p>
    <p class="caption">データ生成日 ${esc(today)}</p>
  </div>
</footer>
${dataJson ? `<script id="data" type="application/json">${dataJson}</script>` : ''}
${withApp ? `<script src="${rel}app.js" integrity="${SRI.js}" defer></script>` : ''}
</body>
</html>
`;
}

// ---------- 事案ごとの部品（アプリと同じ判断）
const infoTypesSorted = [...cards.info_types].sort((a, b) => (a.urgency || 9) - (b.urgency || 9));
function cardsFor(inc) {
  const out = [{ card: cards.always_first_card, infoType: null }];
  const limited = inc.limited_info_types || {};
  const leaked = new Set(inc.leaked_info_types.filter((k) => !(k in limited)));
  for (const t of infoTypesSorted) {
    if (!t.matches.some((k) => leaked.has(k))) continue;
    for (const c of t.cards) out.push({ card: c, infoType: t });
  }
  return out;
}
function contactHtml(key, where) {
  const c = cards.official_contacts[key];
  if (!c) return '';
  let s = `<div class="contact">${icon(c.phone ? 'phone' : 'file-text')}<div><span class="lab">${esc(c.label)}${c.hours ? `（${esc(c.hours)}）` : ''}</span>`;
  if (c.phone) s += `<span class="num">${esc(c.phone)}</span>`;
  if (c.url) s += `<span class="small">${ext(c.url, '公式ページを開く', where)}</span>`;
  return s + '</div></div>';
}
function sourcesHtml(keys, where) {
  return `<details><summary>${icon('file-text')}根拠を見る（公的機関の資料）</summary><ul>` + keys.map((k) => { const s = cards.sources[k]; return `<li>${s.url ? ext(s.url, s.title, where) : esc(s.title)}</li>`; }).join('') + '</ul></details>';
}
// やり方：番号つき手順（steps）が無ければ文章（detail）。禁止は赤い○斜線つきの1行
function howHtml(card) {
  let s = '<h4>やり方</h4>';
  if (Array.isArray(card.steps) && card.steps.length) s += `<ol class="steps">${card.steps.map((t, i) => `<li><span class="num" aria-hidden="true">${i + 1}</span><span>${esc(t)}</span></li>`).join('')}</ol>`;
  else s += `<p class="how">${esc(card.detail)}</p>`;
  if (card.dont) s += `<div class="dont">${icon('forbid-2')}<span>${esc(card.dont)}</span></div>`;
  return s;
}
// 漏れた情報の種類チップ（カード群単位。アイコン＋文字、緊急度1は強調）
function chipsHtml(inc) {
  const lim = inc.limited_info_types || {};
  const leaked = inc.leaked_info_types.filter((k) => !(k in lim));
  const covered = new Set();
  let s = '<ul class="chips" aria-label="漏れたとされる情報">';
  for (const t of infoTypesSorted) {
    const hit = t.matches.filter((k) => leaked.includes(k));
    if (!hit.length) continue;
    hit.forEach((k) => covered.add(k));
    s += `<li class="chip${t.urgency === 1 ? ' strong' : ''}">${icon(t.icon)}${esc(t.chip_label || t.label)}</li>`;
  }
  for (const k of leaked) if (!covered.has(k)) s += `<li class="chip plain">${esc(INFO_LABEL[k] || k)}</li>`;
  return s + '</ul>';
}

// ---------- 事案別ページ（静的。検索流入の受け口。docs/ux-research.md 5.4）
function incidentPage(inc) {
  const rel = '../../';
  const where = `incident ${inc.id}`;
  const denied = inc.status === 'denied';
  const first = inc.announcements[0];
  const operatorShort = inc.operator.replace(/（.*?）/g, '');
  const lim = inc.limited_info_types || {};
  const mainTypes = inc.leaked_info_types.filter((k) => !(k in lim));
  const list = cardsFor(inc);
  const short = inc.service_name.replace(/（.*?）/g, '').trim() || inc.service_name;
  const title = `${short}の情報漏洩`;
  const description = `${inc.operator}が${fmtDate(first.date)}に公表した${inc.service_name}の情報漏洩${inc.status === 'suspected' ? 'のおそれ' : ''}について、漏れたとされる情報と、利用者がやることを公的機関の根拠つきでまとめています。`;

  let b = `<div class="inc-head">${avatarHtml(svcById[inc.service_ids[0]])}<div class="ttl"><h1>${esc(title)}</h1><span class="sub"><span class="tag ${esc(inc.status)}">${STATUS_LABEL[inc.status]}</span> 公表 ${fmtDate(first.date)}・最終更新 ${fmtDate(inc.last_updated)}${inc._approved === false ? ' <span class="tag neutral">下書き</span>' : ''}</span></div></div>
<p>${esc(operatorShort)}が${fmtDate(first.date)}に、${esc(inc.service_name)}の${esc(STATUS_SUB[inc.status])}。${denied ? 'やることはありません。' : '<b>あなたが対象かは、会社からの連絡でご確認ください。</b>'}</p>
<p class="caption">公表された件数：${esc(inc.counts.wording)}</p>
<nav class="toc" aria-label="目次"><h2 class="sec">目次</h2><ul class="toc-list">${[['facts', '漏れたとされる情報'], ['todo', 'やること'], ['contact', '会社の公式窓口'], ['timeline', '会社の公表（公式ページ）']].filter(([k]) => !(denied && (k === 'facts' || k === 'todo')) && !(k === 'contact' && !((inc.official_contact || {}).phone || (inc.official_contact || {}).url))).map(([k, l]) => `<li><a href="#${k}">${l}</a></li>`).join('')}</ul></nav>`;
  if (!denied) {
    b += `<h2 class="sec" id="facts" tabindex="-1">漏れたとされる情報</h2>${chipsHtml(inc)}`;
    if (mainTypes.length) b += `<p class="caption">${mainTypes.map((k) => esc(INFO_LABEL[k] || k)).join('、')}</p>`;
    if (inc.other_info_detail) b += `<details class="small"><summary class="muted">くわしい内訳</summary><p class="muted">${esc(inc.other_info_detail)}</p></details>`;
    if (Object.keys(lim).length) b += `<p class="small">ごく一部の方だけが対象の情報：${Object.entries(lim).map(([k, note]) => `<b>${esc(INFO_LABEL[k] || k)}</b>（${esc(note)}）`).join('、')}。該当する方には会社から個別に連絡があります。</p>`;
    if (inc.card_not_leaked_stated === true) b += '<p class="small muted">クレジットカード情報は漏洩していない、と会社が公表しています。</p>';
  }
  b += `<div class="banner info">${icon('info-circle')}<div><p><b>登録すると、続報が出たときに「やること」が更新されます。</b></p><p><a class="btn" href="${rel}#s=${encodeURIComponent(inc.service_ids.join(','))}">じぶんのやることに登録する</a></p><p class="caption">ホームにこの事案が出ます。保存先は端末内だけです。</p></div></div>`;

  if (!denied) {
    b += '<h2 id="todo" tabindex="-1">やること</h2><ol class="task-list">';
    let currentType = null;
    list.forEach((x, i) => {
      if (x.infoType !== currentType) {
        currentType = x.infoType;
        if (currentType) b += `<li class="type-head">${icon(currentType.icon)}${esc(currentType.label)}が漏れたとき${currentType.needs_research ? ' <span class="tag neutral">根拠を調査中</span>' : ''}</li>`;
      }
      const t = x.card.title.replace('{service}', short).replace('{services}', short);
      b += `<li class="task-item"><div class="task-row">${icon('ring', 'st')}<div class="row-main"><div class="row-title">${i + 1}. ${esc(t)}</div><div class="row-meta">約${x.card.minutes}分</div></div></div>`;
      b += `<div class="task-panel"><p class="reason">${esc(x.card.reason)}</p>${howHtml(x.card)}`;
      if (x.card.contact) b += contactHtml(x.card.contact, where);
      for (const k of x.card.contact_list || []) b += contactHtml(k, where);
      b += sourcesHtml(x.card.sources, where) + '<p class="caption note">※画面や手順は、機種やアプリの版によって異なります。</p></div></li>';
      if (x.infoType && x.card === x.infoType.cards[x.infoType.cards.length - 1] && x.infoType.skip_if.length) {
        b += `<li class="skip-note"><b>しなくてよい</b><span>${x.infoType.skip_if.map(esc).join('<br>')}</span></li>`;
      }
    });
    b += '</ol>';
  }
  const oc = inc.official_contact || {};
  if (oc.phone || oc.url) b += `<h2 id="contact" tabindex="-1">会社の公式窓口</h2><p>${oc.phone ? `<b>${esc(oc.phone)}</b> ` : ''}${oc.url ? ext(oc.url, '問い合わせページ', where) : ''}</p>`;

  b += '<h2 id="timeline" tabindex="-1">会社の公表（公式ページ）</h2><ul class="timeline">';
  for (const a of inc.announcements) {
    b += `<li><span class="d">${fmtDate(a.date)}</span>${ext(a.url, a.title, where)}`;
    for (const ch of a.changes || []) {
      const m = ch.match(/^info_added:(.+)$/); const r = ch.match(/^info_removed:(.+)$/);
      if (m) b += `<span class="ch">＋${esc(INFO_LABEL[m[1]] || m[1])}が追加</span>`;
      else if (r) b += `<span class="ch">－${esc(INFO_LABEL[r[1]] || r[1])}は対象外に訂正</span>`;
      else if (ch === 'count_update') b += '<span class="ch">件数の訂正・確定</span>';
      else if (ch.startsWith('status:')) b += `<span class="ch">${esc(STATUS_LABEL[ch.split('->')[1]] || '')}</span>`;
    }
    b += `<details><summary>事実のメモ</summary><div class="facts">${esc(a.facts)}</div></details></li>`;
  }
  b += '</ul>';
  b += `<p class="caption">企業の公式発表から事実項目だけを整理しています。誤りは <a href="${REPO_URL}/issues/new/choose" target="_blank" rel="noopener noreferrer">訂正の依頼</a> からお知らせください。</p>`;
  return page({ rel, title, description, body: b, canonical: `incidents/${inc.id}/` });
}

function incidentIndexPage() {
  const rel = '../';
  let b = '<h1>公表された情報漏洩の一覧</h1><p class="caption">企業の公式発表と照合した事案だけです。全事案は網羅していません。</p><ul class="plain-list incident-list">';
  for (const inc of incidents) {
    const short = inc.service_name.replace(/（.*?）/g, '').trim() || inc.service_name;
    b += `<li>${avatarHtml(svcById[inc.service_ids[0]], 'sm')}<span class="ttl"><a href="./${esc(inc.id)}/">${esc(short)}の情報漏洩</a> <span class="tag ${esc(inc.status)}">${STATUS_LABEL[inc.status]}</span><br><span class="caption">公表 ${fmtMd(inc.first_published)}・最終更新 ${fmtMd(inc.last_updated)}・${esc(inc.counts.wording)}</span></span></li>`;
  }
  b += '</ul>';
  return page({ rel, title: '事案の一覧', description: '企業が公式に公表した消費者向けサービスの情報漏洩事案の一覧。', body: b, canonical: 'incidents/' });
}

function aboutPage() {
  const rel = './';
  const b = `<h1>このサイトについて</h1>
<p>「${esc(SITE_NAME)}」は、使っているサービスを選ぶだけで、自分に関係のある情報漏洩と、自分がやることだけが揃い、対策済みの安心な状態に到達できるツールです。個人が運営しています。</p>
<h2>できること</h2>
<ul>
<li>企業が公式に公表した漏洩のうち、あなたが選んだサービスのものだけを表示します。</li>
<li>漏れた情報の種類ごとに、公的機関（IPA、警視庁、デジタル庁など）が勧める対処を「1つずつ」案内します。</li>
<li>続報（おそれ→確定、対象の追加）が出ると、必要なものだけが「再確認」として戻ります。</li>
</ul>
<h2>やらないこと</h2>
<ul>
<li>あなたの氏名・メールアドレス・カード番号・本人確認書類などを預かりません。サーバーに利用者のデータを一切持ちません。</li>
<li>メール・SMS・通知を送りません。「このサイトからの連絡」を名乗るメールは偽物です。</li>
<li>公表されていない漏洩を探すことはしません。対象は企業が公表した事案だけです。</li>
<li>通知メールの貼り付けや、個人情報の入力は受け付けません。入力欄がないこと自体が、安全のための設計です。</li>
</ul>
<h2>表示する情報の根拠</h2>
<ul>
<li>事案：企業の公式発表（プレスリリース・お知らせページ）だけを根拠にし、開発者が目視で照合したものだけを公開します。まとめサイトの文章は転載しません。</li>
<li>やること：${Object.values(cards.sources).map((s) => s.url ? ext(s.url, s.title, 'about') : esc(s.title)).join('、')}</li>
<li>電話番号・URL：公的機関と企業の公式ページで確認したものだけを表示します。企業の通知メールに書かれたリンクや番号は転記しません。</li>
</ul>
<h2>本物のURL</h2>
<p>本物のURLは <b>${esc(SITE_URL)}</b> だけです。独自ドメインは持っていません。似た名前の別サイトや、このサイトを名乗るメールにご注意ください。</p>
<h2>訂正・削除・追加の依頼</h2>
<p>掲載内容の誤り、企業からの訂正・削除のご依頼、「このサービスも選べるようにしてほしい」は <a href="${REPO_URL}/issues/new/choose" target="_blank" rel="noopener noreferrer">GitHub の依頼フォーム</a> からお願いします。公式発表に基づく修正を優先し、確認でき次第すみやかに対応します。</p>
<h2>免責</h2>
<p>掲載の網羅性・即時性は保証しません。本サイトの情報に基づいて行った行動の結果について、故意または重大な過失がある場合を除き、運営者は責任を負いません。最終的な判断は、各社からの連絡と公的機関の案内に基づいて行ってください。</p>
<p class="small muted">ソースコードと事案データは <a href="${REPO_URL}" target="_blank" rel="noopener noreferrer">GitHub</a> で公開しています。プログラムは GNU AGPL-3.0、事案データとやることカードは CC BY-NC-SA 4.0（出典表示・非営利・同条件）で利用できます。企業・自治体での利用はご相談ください。IPA・デジタル庁などの政府系資料は政府標準利用規約2.0に沿って出典を明記のうえ、要約と事実項目のみ利用しています。本サイトは国の機関が作成したものではありません。</p>`;
  return page({ rel, title: 'このサイトについて', description: '「じぶんの情報対策」の目的、できること、やらないこと、情報の根拠、訂正窓口。', body: b, canonical: 'about.html' });
}

function privacyPage() {
  const rel = './';
  const b = `<h1>プライバシーポリシー</h1>
<p class="caption">最終更新：${esc(today)}</p>
<h2>サーバーに保存する情報</h2>
<p>ありません。このサイトは静的なファイルだけで動いており、利用者の入力をサーバーに送る仕組みを持ちません。</p>
<h2>あなたの端末の中にだけ保存する情報</h2>
<table><tr><th>項目</th><th>内容</th><th>目的</th></tr>
<tr><td>選んだサービス</td><td>サービスのID（例：timescar）</td><td>関係のある事案だけを表示するため</td></tr>
<tr><td>やることの完了状態</td><td>事案とやることのIDと、完了した日</td><td>「対策済み」を表示し、続報で戻すため</td></tr>
<tr><td>最終確認日</td><td>このサイトを最後に開いた日</td><td>前回からの変化を表示するため</td></tr></table>
<p>これらはブラウザの localStorage に保存され、このサイト以外からは読めません。「設定」の「この端末の記録を消す」でいつでも削除できます。ブラウザのデータを削除すると消えます。「引き継ぎコード」はこれらをまとめた文字列で、暗号化していないため、他の人に見せないでください。</p>
<h2>外部への通信</h2>
<p>このサイトは、アクセス解析、広告、外部フォント、外部スクリプトを一切使いません。ブラウザの Content Security Policy で外部への通信を技術的に禁止しています。外部リンクを開く際、どのページから来たかの情報（リファラ）は送りません。</p>
<h2>サイトの配信事業者が記録する情報</h2>
<p>このサイトは GitHub Pages（GitHub, Inc.）で配信しています。GitHub は配信にあたり、IPアドレスなどのアクセス記録をセキュリティ目的で保持することがあります。詳細は GitHub のプライバシーに関する声明をご確認ください。運営者はこれらの記録にアクセスしません。</p>
<h2>お問い合わせ</h2>
<p><a href="${REPO_URL}/issues/new/choose" target="_blank" rel="noopener noreferrer">GitHub の依頼フォーム</a> からお願いします。</p>`;
  return page({ rel, title: 'プライバシーポリシー', description: '「じぶんの情報対策」が端末内に保存する項目と、外部に送らないことの説明。', body: b, canonical: 'privacy.html' });
}

function faqPage() {
  const rel = './';
  const b = `<h1>よくある質問</h1>
<h2>見覚えのないサービスの漏洩が出てきました</h2>
<p>「サービス」画面で選んだサービスに関係する事案だけを表示しています。選んだ覚えがなければ、「サービス」画面でチェックを外してください。リンクから開いた場合、そのサービスが自動で追加されることがあります。</p>
<h2>自分が対象かどうか分かりません</h2>
<p>このサイトは「会社が漏洩を公表した」という事実を示すだけで、あなた個人が対象かどうかは分かりません。対象かどうかは、その会社からの連絡（メール・書面・アプリ内のお知らせ）で確認してください。会社の公式窓口は、各事案のページに載せています。連絡が来ていなくても、先頭の「その会社を名乗るメールのリンクは押さない」だけは行っておくと安全です。</p>
<h2>会社を名乗るメールが届きました。本物ですか</h2>
<p>漏洩のあとは、その会社を名乗るニセのメールが増えます。メールの中のリンクは押さず、アプリか、自分で検索して開いた公式サイトで確認してください。このサイトからメールを送ることはありません。</p>
<h2>このサイトは私の情報を保存しますか</h2>
<p>サーバーには何も保存しません。選んだサービスと、やることの完了日は、あなたの端末の中にだけ保存されます。くわしくは <a href="${rel}privacy.html">プライバシーポリシー</a> をご覧ください。</p>
<h2>「対策済み」にしたのに、また「再確認」に戻りました</h2>
<p>会社の続報で「漏洩のおそれ」が「確定」になったり、漏れた情報の種類が増えたりすると、関係するやることだけが「再確認」に戻ります。もう一度内容を確認し、済んでいれば「済みにする」を押してください。</p>
<h2>親や家族の分を確認したいです</h2>
<p>家族の端末でこのサイトを開き、家族が使っているサービスを選んでください。「設定」の「家族に見せる」からURLを送れます。あなたの端末で家族の分を管理する機能は、今後の予定です。</p>
<h2>使っているサービスが一覧にありません</h2>
<p><a href="${REPO_URL}/issues/new/choose" target="_blank" rel="noopener noreferrer">追加の依頼</a> からお知らせください。公表された漏洩があるサービスを優先して追加しています。</p>
<h2>どこに相談すればよいですか</h2>
<p><a href="${rel}#/help">相談窓口</a> に、消費者ホットライン（188）、警察相談専用電話（#9110）、IPA の窓口をまとめています。</p>`;
  return page({ rel, title: 'よくある質問', description: '「じぶんの情報対策」のよくある質問。対象かどうかの確認方法、ニセメール、保存される情報、再確認について。', body: b, canonical: 'faq.html' });
}

function appPage() {
  const rel = './';
  const data = { generated_at: today, include_drafts: includeDrafts, repo_url: REPO_URL, cards, services, incidents };
  const dataJson = JSON.stringify(data).replace(/<\//g, '<\\/').replace(/<!--/g, '<\\!--');
  return page({ rel, title: '', description: TAGLINE + ' 使っているサービスを選ぶだけで、関係のある情報漏洩と、公的機関の根拠つきの「やること」だけが揃います。', body: '', canonical: '', withApp: true, dataJson, current: '' });
}

function notFoundPage() {
  const rel = './';
  return page({ rel, title: 'ページが見つかりません', description: 'ページが見つかりません。', body: `<h1>ページが見つかりません</h1><p><a href="${rel}#/">ホームへ戻る</a>、または <a href="${rel}incidents/">事案の一覧</a> をご覧ください。</p>` });
}

// ---------- アイコン（SVG と PNG）。PNG は zlib だけで生成する
const ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="#0066cc"/><path d="M18 34l10 10 20-22" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/></svg>
`;
function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function pngChunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function makeIconPng(size) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  const s = size / 64;
  const segs = [[18, 34, 28, 44], [28, 44, 48, 22]];
  const distSeg = (px, py, [x1, y1, x2, y2]) => {
    const dx = x2 - x1, dy = y2 - y1; const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)));
    return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
  };
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const ux = (x + 0.5) / s, uy = (y + 0.5) / s;
      const d = Math.min(...segs.map((sg) => distSeg(ux, uy, sg)));
      const white = d < 3.5;
      const o = y * (size * 4 + 1) + 1 + x * 4;
      raw[o] = white ? 255 : 0x00; raw[o + 1] = white ? 255 : 0x66; raw[o + 2] = white ? 255 : 0xcc; raw[o + 3] = 255;
    }
  }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), pngChunk('IHDR', ihdr), pngChunk('IDAT', zlib.deflateSync(raw, { level: 9 })), pngChunk('IEND', Buffer.alloc(0))]);
}

// ---------- 書き出し
const write = (relPath, content) => {
  const p = path.join(outDir, relPath);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content);
};
fs.rmSync(outDir, { recursive: true, force: true });
write('index.html', appPage());
write('about.html', aboutPage());
write('privacy.html', privacyPage());
write('faq.html', faqPage());
write('404.html', notFoundPage());
write('incidents/index.html', incidentIndexPage());
for (const inc of incidents) write(`incidents/${inc.id}/index.html`, incidentPage(inc));
write('app.css', APP_CSS);
write('app.js', APP_JS);
// RFC 9116 security.txt：脆弱性の報告先を機械可読で示す。Expires はビルド日から1年
{
  const exp = new Date(today + 'T00:00:00Z'); exp.setUTCFullYear(exp.getUTCFullYear() + 1);
  write('.well-known/security.txt', [
    `Contact: ${REPO_URL}/security/advisories/new`,
    `Expires: ${exp.toISOString().replace(/\.\d{3}Z$/, 'Z')}`,
    `Preferred-Languages: ja, en`,
    `Canonical: ${SITE_URL}.well-known/security.txt`,
    `Policy: ${REPO_URL}/blob/main/SECURITY.md`,
    '',
  ].join('\n'));
}
write('data.json', JSON.stringify({ generated_at: today, cards, services, incidents: incidents.map(({ _approved, ...i }) => i) }, null, 0));
write('icon.svg', ICON_SVG);
write('icon-180.png', makeIconPng(180));
write('icon-512.png', makeIconPng(512));
write('manifest.webmanifest', JSON.stringify({
  name: SITE_NAME, short_name: SITE_NAME, description: TAGLINE, lang: 'ja', start_url: './', scope: './', display: 'standalone',
  background_color: '#ffffff', theme_color: '#0066cc',
  icons: [{ src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' }, { src: 'icon-180.png', sizes: '180x180', type: 'image/png' }, { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml' }],
}, null, 2));
write('robots.txt', `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}sitemap.xml\n`);
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  [['', today], ['about.html', today], ['privacy.html', today], ['faq.html', today], ['incidents/', today], ...incidents.map((i) => [`incidents/${i.id}/`, i.last_updated])]
    .map(([u, d]) => `  <url><loc>${esc(SITE_URL + u)}</loc><lastmod>${d}</lastmod></url>`).join('\n') + '\n</urlset>\n');
write('.nojekyll', '');
console.log(`built ${path.relative(root, outDir)}: incidents ${incidents.length}${includeDrafts ? ' (including drafts)' : ''}, site ${SITE_URL}`);
