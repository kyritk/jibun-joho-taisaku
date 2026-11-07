// 本番ビルド。 node scripts/build.mjs [--out dist] [--include-drafts] [--site-url https://.../]
// Node 標準ライブラリのみ。ネットワークは使わない。出力はすべて相対パスで、どのサブパスでも動く。
// セキュリティ方針は docs/threat-model.md。出力の自己検査は scripts/check-dist.mjs。
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : def; };
const includeDrafts = args.includes('--include-drafts');
const outDir = path.resolve(root, opt('--out', 'dist'));
const SITE_URL = opt('--site-url', 'https://kyritk.github.io/jibun-joho-taisaku/');
const SITE_NAME = 'じぶんの情報対策';
const TAGLINE = '使っているサービスの漏えいと、やることだけ。';
const REPO_URL = 'https://github.com/kyritk/jibun-joho-taisaku';

const read = (p) => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
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
const nl = (s) => esc(s).replace(/\n/g, '<br>');
const fmtDate = (d) => { const [y, m, dd] = d.split('-'); return `${y}年${Number(m)}月${Number(dd)}日`; };

const STATUS_LABEL = { suspected: '漏えいのおそれ', confirmed: '漏えいを確認', individually_notified: '対象者に個別連絡中', denied: '漏えいなし（取り下げ）' };
const INFO_LABEL = {
  credentials: 'ID・パスワード', password: 'パスワード', credit_card: 'クレジットカード番号', credit_card_partial: 'カード番号の一部（下4桁など）',
  email: 'メールアドレス', phone: '電話番号', address: '住所', name: '氏名', birthdate: '生年月日', id_document_image: '本人確認書類の画像',
  bank_account: '銀行口座', my_number: 'マイナンバー', financial_assets: '資産の情報', family_composition: '家族構成', medical: '病歴・診療の情報',
  purchase_history: '購入・利用履歴', other: 'その他',
};
const svcById = Object.fromEntries(services.services.map((s) => [s.id, s]));

// ---------- ページの共通枠
const CSP = [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self'",
  "connect-src 'self'",
  "manifest-src 'self'",
  "base-uri 'none'",
  "object-src 'none'",
  "form-action 'none'",
  "require-trusted-types-for 'script'",
  "trusted-types 'none'",
].join('; ');

function page({ rel, title, description, body, canonical, withApp = false, dataJson = null }) {
  const fullTitle = title ? `${title}｜${SITE_NAME}` : SITE_NAME;
  return `<!doctype html>
<html lang="ja">
<head>
<meta http-equiv="Content-Security-Policy" content="${CSP}">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="referrer" content="no-referrer">
<meta name="color-scheme" content="light dark">
<meta name="theme-color" content="#0b57d0">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(description)}">
${canonical ? `<link rel="canonical" href="${esc(SITE_URL + canonical)}">` : ''}
<link rel="stylesheet" href="${rel}app.css">
<link rel="icon" href="${rel}icon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="${rel}icon-180.png">
<link rel="manifest" href="${rel}manifest.webmanifest">
</head>
<body>
<header>
  <h1><a href="${rel}">${esc(SITE_NAME)}</a></h1>
  <p class="tagline">${esc(TAGLINE)}</p>
  <nav class="site" aria-label="サイト内"><a href="${rel}">じぶんのやること</a><a href="${rel}incidents/">事案の一覧</a><a href="${rel}about.html">このサイトについて</a></nav>
</header>
<main${withApp ? '' : ' class="static"'}>
${body}
</main>
<footer>
  <p><b>ご注意</b>：このサイトは「○○社が漏えい（のおそれ）を公表した」という事実と、公的機関が勧める対処をまとめたものです。あなたの情報が漏れたかどうかは、各社からの連絡でご確認ください。掲載の網羅性・即時性は保証しません。</p>
  <p>本物のURLは <b>${esc(SITE_URL)}</b> だけです。このサイトからメールやSMSを送ることはありません。</p>
  <nav aria-label="フッター"><a href="${rel}about.html">このサイトについて</a><a href="${rel}privacy.html">プライバシー</a><a href="${REPO_URL}/issues/new/choose" target="_blank" rel="noopener noreferrer">訂正・追加の依頼</a><a href="${REPO_URL}" target="_blank" rel="noopener noreferrer">ソースコード</a></nav>
  <p class="small">データ生成日 ${esc(today)}</p>
</footer>
${dataJson ? `<script id="data" type="application/json">${dataJson}</script>` : ''}
${withApp ? `<script src="${rel}app.js" defer></script>` : ''}
</body>
</html>
`;
}

// ---------- 事案ごとの部品（静的ページとアプリで共通の判断）
function cardsFor(inc) {
  const out = [{ card: cards.always_first_card, infoType: null }];
  const limited = inc.limited_info_types || {};
  const leaked = new Set(inc.leaked_info_types.filter((k) => !(k in limited)));
  for (const t of cards.info_types) {
    if (!t.matches.some((k) => leaked.has(k))) continue;
    for (const c of t.cards) out.push({ card: c, infoType: t });
  }
  return out;
}
function contactHtml(key, where) {
  const c = cards.official_contacts[key];
  if (!c) return '';
  let s = `<div class="contact">${esc(c.label)}：`;
  if (c.phone) s += `<b>${esc(c.phone)}</b>`;
  if (c.url) s += (c.phone ? '　' : '') + ext(c.url, c.url, where);
  if (c.hours) s += `<span class="muted small">（${esc(c.hours)}）</span>`;
  return s + '</div>';
}
function sourcesHtml(keys, where) {
  return '<div class="src small muted">根拠：' + keys.map((k) => { const s = cards.sources[k]; return s.url ? ext(s.url, s.title, where) : esc(s.title); }).join('、') + '</div>';
}

// ---------- 事案別ページ（静的。検索流入の受け口）
function incidentPage(inc) {
  const rel = '../../';
  const where = `incident ${inc.id}`;
  const denied = inc.status === 'denied';
  const first = inc.announcements[0];
  const operatorShort = inc.operator.replace(/（.*?）/g, '');
  const lim = inc.limited_info_types || {};
  const mainTypes = inc.leaked_info_types.filter((k) => !(k in lim));
  const list = cardsFor(inc);
  const title = `${inc.service_name}の情報漏えい`;
  const description = `${inc.operator}が${fmtDate(first.date)}に公表した${inc.service_name}の情報漏えい${inc.status === 'suspected' ? 'のおそれ' : ''}について、漏れたとされる情報と、利用者がやることを公的機関の根拠つきでまとめています。`;

  let b = `<h1>${esc(title)}</h1>
<p><span class="badge ${esc(inc.status)}">${STATUS_LABEL[inc.status]}</span> <span class="muted small">最終更新 ${fmtDate(inc.last_updated)}</span>${inc._approved === false ? ' <span class="badge draft">下書き</span>' : ''}</p>
<p>${esc(inc.operator)}が${fmtDate(first.date)}に、${esc(inc.service_name)}の情報漏えい${inc.status === 'suspected' ? 'のおそれ' : ''}を公表しました。${denied ? 'その後、<b>漏えいはなかった</b>と公表されたため、やることはありません。' : `<b>あなたが対象かどうかは、${esc(operatorShort)}からの連絡でご確認ください。</b>`}</p>
<p class="muted small">公表された件数：${esc(inc.counts.wording)}</p>`;
  if (!denied) {
    b += `<p>漏れたとされる情報：${mainTypes.map((k) => `<b>${esc(INFO_LABEL[k] || k)}</b>`).join('、')}${inc.other_info_detail ? `<br><span class="muted small">${esc(inc.other_info_detail)}</span>` : ''}</p>`;
    if (Object.keys(lim).length) b += `<p class="small">ごく一部の方だけが対象の情報：${Object.entries(lim).map(([k, note]) => `<b>${esc(INFO_LABEL[k] || k)}</b>（${esc(note)}）`).join('、')}。該当する方には会社から個別に連絡があります。</p>`;
    if (inc.card_not_leaked_stated === true) b += '<p class="muted small">クレジットカード情報は漏えいしていない、と会社が公表しています。</p>';
  }
  const oc = inc.official_contact || {};
  if (oc.phone || oc.url) b += `<p class="small">会社の公式窓口：${oc.phone ? `<b>${esc(oc.phone)}</b> ` : ''}${oc.url ? ext(oc.url, '問い合わせページ', where) : ''}</p>`;

  b += `<div class="notice info"><b>このサービスを登録しておくと、続報が出たときに「やること」が更新されます。</b><br><a class="btn" href="${rel}#s=${encodeURIComponent(inc.service_ids.join(','))}">じぶんのやることに登録する</a><br><span class="small muted">登録内容はあなたの端末の中にだけ保存されます。</span></div>`;

  if (!denied) {
    b += '<h2>やること</h2><ol class="cards">';
    let currentType = null;
    list.forEach((x, i) => {
      if (x.infoType !== currentType) {
        currentType = x.infoType;
        if (currentType) b += `<p class="muted small type-head"><b>${esc(currentType.label)}</b>が漏れたときにやること${currentType.needs_research ? ' <span class="badge draft">公的な根拠を調査中</span>' : ''}</p>`;
      }
      const t = x.card.title.replace('{service}', inc.service_name);
      b += `<li class="card"><span class="num">${i + 1}.</span><div><div class="ct">${esc(t)}</div><div class="cd">${esc(x.card.detail)}</div>`;
      if (x.card.contact) b += contactHtml(x.card.contact, where);
      for (const k of x.card.contact_list || []) b += contactHtml(k, where);
      b += sourcesHtml(x.card.sources, where) + '</div></li>';
      if (x.infoType && x.card === x.infoType.cards[x.infoType.cards.length - 1] && x.infoType.skip_if.length) {
        b += `<li class="skip small">やらなくていいこと：${x.infoType.skip_if.map(esc).join('<br>')}</li>`;
      }
    });
    b += '</ol>';
  }

  b += '<h2>会社の公表（公式ページ）</h2><ul class="timeline">';
  for (const a of inc.announcements) {
    b += `<li><span class="d">${fmtDate(a.date)}</span>${ext(a.url, a.title, where)}`;
    for (const ch of a.changes || []) {
      const m = ch.match(/^info_added:(.+)$/); const r = ch.match(/^info_removed:(.+)$/);
      if (m) b += `<span class="ch">＋${esc(INFO_LABEL[m[1]] || m[1])}が追加</span>`;
      else if (r) b += `<span class="ch">－${esc(INFO_LABEL[r[1]] || r[1])}は対象外に訂正</span>`;
      else if (ch === 'count_update') b += '<span class="ch">件数の訂正・確定</span>';
      else if (ch.startsWith('status:')) b += `<span class="ch">${esc(STATUS_LABEL[ch.split('->')[1]] || '')}</span>`;
    }
    b += `<details class="small"><summary class="muted">事実のメモ</summary><div class="muted facts">${esc(a.facts)}</div></details></li>`;
  }
  b += '</ul>';
  b += `<p class="small muted">このページは企業の公式発表を元に、事実項目だけを整理したものです。文章の転載はしていません。誤りがあれば <a href="${REPO_URL}/issues/new/choose" target="_blank" rel="noopener noreferrer">訂正の依頼</a> からお知らせください。</p>`;
  return page({ rel, title, description, body: b, canonical: `incidents/${inc.id}/` });
}

function incidentIndexPage() {
  const rel = '../';
  let b = '<h1>公表された情報漏えいの一覧</h1><p class="muted">企業が公式に公表した消費者向けサービスの事案のうち、開発者が公式発表と照合したものだけを載せています。全事案の網羅はしていません。</p><ul class="incident-list">';
  for (const inc of incidents) {
    b += `<li><a href="./${esc(inc.id)}/">${esc(inc.service_name)}の情報漏えい</a> <span class="badge ${esc(inc.status)}">${STATUS_LABEL[inc.status]}</span><br><span class="muted small">${esc(inc.operator)}・公表 ${fmtDate(inc.first_published)}・最終更新 ${fmtDate(inc.last_updated)}・${esc(inc.counts.wording)}</span></li>`;
  }
  b += '</ul>';
  return page({ rel, title: '事案の一覧', description: '企業が公式に公表した消費者向けサービスの情報漏えい事案の一覧。', body: b, canonical: 'incidents/' });
}

function aboutPage() {
  const rel = './';
  const b = `<h1>このサイトについて</h1>
<p>「${esc(SITE_NAME)}」は、使っているサービスを選ぶだけで、自分に関係のある情報漏えいと、自分がやることだけが揃い、対策済みの安心な状態に到達できるツールです。個人が運営しています。</p>
<h2>できること</h2>
<ul>
<li>企業が公式に公表した漏えいのうち、あなたが選んだサービスのものだけを表示します。</li>
<li>漏れた情報の種類ごとに、公的機関（IPA、警視庁、デジタル庁など）が勧める対処を「1枚1行動」のカードにして示します。</li>
<li>続報（おそれ→確定、対象の追加）が出ると、必要なカードだけが未完了に戻ります。</li>
</ul>
<h2>やらないこと</h2>
<ul>
<li>あなたの氏名・メールアドレス・カード番号・本人確認書類などを預かりません。サーバーに利用者のデータを一切持ちません。</li>
<li>メール・SMS・プッシュ通知を送りません。「このサイトからの連絡」を名乗るメールは偽物です。</li>
<li>ダークウェブ監視や、未公表の漏えいの検知はしません。対象は企業が公表した事案だけです。</li>
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
<p class="small muted">ソースコードと事案データは <a href="${REPO_URL}" target="_blank" rel="noopener noreferrer">GitHub</a> で公開しています。IPA・デジタル庁などの政府系資料は政府標準利用規約2.0に沿って出典を明記のうえ、要約と事実項目のみ利用しています。本サイトは国の機関が作成したものではありません。</p>`;
  return page({ rel, title: 'このサイトについて', description: '「じぶんの情報対策」の目的、できること、やらないこと、情報の根拠、訂正窓口。', body: b, canonical: 'about.html' });
}

function privacyPage() {
  const rel = './';
  const b = `<h1>プライバシーポリシー</h1>
<p class="muted small">最終更新：${esc(today)}</p>
<h2>サーバーに保存する情報</h2>
<p>ありません。このサイトは静的なファイルだけで動いており、利用者の入力をサーバーに送る仕組みを持ちません。</p>
<h2>あなたの端末の中にだけ保存する情報</h2>
<table><tr><th>項目</th><th>内容</th><th>目的</th></tr>
<tr><td>選んだサービス</td><td>サービスのID（例：timescar）</td><td>関係のある事案だけを表示するため</td></tr>
<tr><td>やることの完了状態</td><td>事案とカードのIDと、完了した日</td><td>「対策済み」を表示し、続報で戻すため</td></tr>
<tr><td>最終確認日</td><td>このサイトを最後に開いた日</td><td>「新着」を表示するため</td></tr></table>
<p>これらはブラウザの localStorage に保存され、このサイト以外からは読めません。「この端末の記録を消す」ボタンでいつでも削除できます。ブラウザのデータを削除すると消えます。「引き継ぎコード」はこれらをまとめた文字列で、暗号化していないため、他の人に見せないでください。</p>
<h2>外部への通信</h2>
<p>このサイトは、アクセス解析、広告、外部フォント、外部スクリプトを一切使いません。ブラウザの Content Security Policy で外部への通信を技術的に禁止しています。外部リンクを開く際、どのページから来たかの情報（リファラ）は送りません。</p>
<h2>サイトの配信事業者が記録する情報</h2>
<p>このサイトは GitHub Pages（GitHub, Inc.）で配信しています。GitHub は配信にあたり、IPアドレスなどのアクセス記録をセキュリティ目的で保持することがあります。詳細は GitHub のプライバシーに関する声明をご確認ください。運営者はこれらの記録にアクセスしません。</p>
<h2>お問い合わせ</h2>
<p><a href="${REPO_URL}/issues/new/choose" target="_blank" rel="noopener noreferrer">GitHub の依頼フォーム</a> からお願いします。</p>`;
  return page({ rel, title: 'プライバシーポリシー', description: '「じぶんの情報対策」が端末内に保存する項目と、外部に送らないことの説明。', body: b, canonical: 'privacy.html' });
}

function appPage() {
  const rel = './';
  const data = { generated_at: today, include_drafts: includeDrafts, cards, services, incidents };
  const dataJson = JSON.stringify(data).replace(/<\//g, '<\\/').replace(/<!--/g, '<\\!--');
  const b = `${includeDrafts ? '<div class="notice draft small">このビルドは<b>承認前の下書きデータ</b>を含みます（検証用）。</div>' : ''}
<noscript><div class="notice">この画面はJavaScriptが必要です。JavaScriptを使わずに読める <a href="${rel}incidents/">事案の一覧</a> もあります。</div></noscript>
<div id="link-notice" class="notice info hidden"></div>
<nav aria-label="画面" class="row">
  <a class="btn secondary" href="#select">1. サービスを選ぶ</a>
  <a class="btn secondary" href="#todo">2. じぶんのやること</a>
</nav>
<section id="select">
  <h2>1. 使っているサービスを選ぶ</h2>
  <p class="muted">選んだ内容はこの端末の中にだけ保存されます。サーバーには送りません。</p>
  <div id="services"></div>
  <div class="row"><a class="btn" href="#todo">「じぶんのやること」を見る</a><span class="muted" id="sel-count"></span></div>
  <p class="small muted">使っているサービスが一覧にない場合は <a href="${REPO_URL}/issues/new/choose" target="_blank" rel="noopener noreferrer">追加の依頼</a> からお知らせください。</p>
</section>
<section id="todo">
  <h2>2. じぶんのやること</h2>
  <div id="summary"></div>
  <div id="incidents"></div>
</section>
<section id="transfer">
  <h2>引き継ぎ（機種変更のとき）</h2>
  <p class="muted">選んだサービスと完了状態を、短いコードにして書き出せます。新しい端末でこのコードを読み込めば続きから使えます。コードは他の人に見せないでください。</p>
  <div class="row"><button class="btn secondary" id="export" type="button">コードを書き出す</button><button class="btn secondary" id="import" type="button">コードを読み込む</button><button class="btn secondary" id="reset" type="button">この端末の記録を消す</button></div>
  <div id="transfer-msg" class="hidden" aria-live="polite"></div>
  <textarea id="code" aria-label="引き継ぎコード" placeholder="ここにコードが表示されます／貼り付けます" spellcheck="false"></textarea>
</section>
<section id="install">
  <h2>次に見に来やすくする</h2>
  <p class="muted">通知は送りません。ホーム画面にこのサイトを追加しておくと、次に確認しやすくなります。iPhone は共有ボタン→「ホーム画面に追加」、Android は ブラウザのメニュー→「ホーム画面に追加」です。</p>
</section>`;
  return page({ rel, title: '', description: TAGLINE + ' 使っているサービスを選ぶだけで、関係のある情報漏えいと、公的機関の根拠つきの「やること」だけが揃います。', body: b, canonical: '', withApp: true, dataJson });
}

function notFoundPage() {
  const rel = './';
  return page({ rel, title: 'ページが見つかりません', description: 'ページが見つかりません。', body: `<h1>ページが見つかりません</h1><p><a href="${rel}">トップへ戻る</a>、または <a href="${rel}incidents/">事案の一覧</a> をご覧ください。</p>` });
}

// ---------- アイコン（SVG と PNG）。PNG は zlib だけで生成する
const ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="#0b57d0"/><path d="M18 34l10 10 20-22" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/></svg>
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
    raw[y * (size * 4 + 1)] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const ux = (x + 0.5) / s, uy = (y + 0.5) / s;
      const d = Math.min(...segs.map((sg) => distSeg(ux, uy, sg)));
      const white = d < 3.5;
      const o = y * (size * 4 + 1) + 1 + x * 4;
      raw[o] = white ? 255 : 0x0b; raw[o + 1] = white ? 255 : 0x57; raw[o + 2] = white ? 255 : 0xd0; raw[o + 3] = 255;
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
write('404.html', notFoundPage());
write('incidents/index.html', incidentIndexPage());
for (const inc of incidents) write(`incidents/${inc.id}/index.html`, incidentPage(inc));
write('app.css', fs.readFileSync(path.join(root, 'src/app.css')));
write('app.js', fs.readFileSync(path.join(root, 'src/app.js')));
write('data.json', JSON.stringify({ generated_at: today, cards, services, incidents: incidents.map(({ _approved, ...i }) => i) }, null, 0));
write('icon.svg', ICON_SVG);
write('icon-180.png', makeIconPng(180));
write('icon-512.png', makeIconPng(512));
write('manifest.webmanifest', JSON.stringify({
  name: SITE_NAME, short_name: SITE_NAME, description: TAGLINE, lang: 'ja', start_url: './', scope: './', display: 'standalone',
  background_color: '#f7f7f5', theme_color: '#0b57d0',
  icons: [{ src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' }, { src: 'icon-180.png', sizes: '180x180', type: 'image/png' }, { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml' }],
}, null, 2));
write('robots.txt', `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}sitemap.xml\n`);
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  [['', today], ['about.html', today], ['privacy.html', today], ['incidents/', today], ...incidents.map((i) => [`incidents/${i.id}/`, i.last_updated])]
    .map(([u, d]) => `  <url><loc>${esc(SITE_URL + u)}</loc><lastmod>${d}</lastmod></url>`).join('\n') + '\n</urlset>\n');
write('.nojekyll', '');
console.log(`built ${path.relative(root, outDir)}: incidents ${incidents.length}${includeDrafts ? ' (including drafts)' : ''}, site ${SITE_URL}`);
