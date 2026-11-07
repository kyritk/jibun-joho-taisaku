// じぶんの情報対策 — クライアント側（4画面：ホーム／やること／サービス／設定、＋相談窓口）
// 方針（docs/threat-model.md）：文字列をHTMLとして流し込む経路を一切使わず、DOM API だけで描画する。
// CSP の require-trusted-types-for 'script' と trusted-types 'none' により、万一混入してもブラウザが遮断する。
// 通信は行わない。保存は localStorage のみ。設計根拠は docs/ux-research.md と docs/ux-visual-research.md。
// アイコンは HTML 内のスプライト（<symbol id="i-…">）を <use> で参照する。外部ファイルは読まない。
(function () {
  'use strict';

  const dataEl = document.getElementById('data');
  const app = document.getElementById('app');
  if (!dataEl || !app) return;
  // 他サイトの iframe に埋め込まれている場合は描画しない（クリックジャッキング・偽サイトの中での表示を防ぐ。T3）
  let framed = false;
  try { framed = window.top !== window.self; } catch { framed = true; }
  if (framed) {
    while (app.firstChild) app.removeChild(app.firstChild);
    const p = document.createElement('p');
    p.className = 'wrap';
    p.textContent = 'このページは別のサイトの中に埋め込まれています。本物のURL（' + location.origin + location.pathname + '）を直接開いてください。';
    app.append(p);
    return;
  }
  let DATA;
  try { DATA = JSON.parse(dataEl.textContent); } catch { return; }
  const { cards, services, incidents } = DATA;

  // ---------- DOM ヘルパー（文字列は常に textNode）
  const el = (tag, props, ...children) => {
    const n = document.createElement(tag);
    if (props) {
      for (const [k, v] of Object.entries(props)) {
        if (v == null || v === false) continue;
        if (k === 'class') n.className = v;
        else if (k === 'text') n.textContent = v;
        else if (k === 'for') n.htmlFor = v;
        else if (k === 'checked' || k === 'open' || k === 'disabled' || k === 'hidden') n[k] = !!v;
        else if (k === 'value') n.value = v;
        else n.setAttribute(k, String(v));
      }
    }
    for (const c of children.flat(Infinity)) {
      if (c == null || c === false) continue;
      n.append(c instanceof Node ? c : document.createTextNode(String(c)));
    }
    return n;
  };
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const XLINK_NS = 'http://www.w3.org/1999/xlink';
  const ICON_ID = /^[a-z0-9-]+$/;
  // スプライト内の <symbol id="i-名前"> を参照する。名前は英小文字・数字・ハイフンのみ
  const icon = (name, cls) => {
    const s = document.createElementNS(SVG_NS, 'svg');
    s.setAttribute('class', 'icon' + (cls ? ' ' + cls : ''));
    s.setAttribute('viewBox', '0 0 24 24');
    s.setAttribute('aria-hidden', 'true');
    s.setAttribute('focusable', 'false');
    if (ICON_ID.test(name)) {
      const u = document.createElementNS(SVG_NS, 'use');
      u.setAttribute('href', '#i-' + name);
      u.setAttributeNS(XLINK_NS, 'xlink:href', '#i-' + name);
      s.append(u);
    }
    return s;
  };
  const extLink = (url, label) => {
    let ok = false;
    try { ok = new URL(url).protocol === 'https:'; } catch { ok = false; }
    if (!ok) return el('span', null, label || url);
    return el('a', { href: url, target: '_blank', rel: 'noopener noreferrer' }, label || url);
  };
  const clear = (n) => { while (n.firstChild) n.removeChild(n.firstChild); };
  const fmtDate = (d) => { const [y, m, dd] = d.split('-'); return `${y}年${Number(m)}月${Number(dd)}日`; };
  const fmtMd = (d) => { const [, m, dd] = d.split('-'); return `${Number(m)}月${Number(dd)}日`; };

  // ---------- 端末内保存
  const LS = { services: 'jibun.services', done: 'jibun.done', lastVisit: 'jibun.lastVisit', seen: 'jibun.seen' };
  const load = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } };
  const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* 保存できない環境では何もしない */ } };
  const remove = (k) => { try { localStorage.removeItem(k); } catch { /* noop */ } };
  const isObj = (o) => o && typeof o === 'object' && !Array.isArray(o);

  const svcById = Object.fromEntries(services.services.map((s) => [s.id, s]));
  const catByKey = Object.fromEntries(services.categories.map((c) => [c.key, c]));
  let selected = new Set((load(LS.services, []) || []).filter((id) => svcById[id]));
  let done = load(LS.done, {}); if (!isObj(done)) done = {};
  let seen = load(LS.seen, {}); if (!isObj(seen)) seen = {};
  const lastVisit = load(LS.lastVisit, null);
  const today = new Date().toISOString().slice(0, 10);
  let flash = null; // { kind, text } 次の画面で1回だけ出す
  let totop = null; // やること画面の「先頭へ」ボタン（1画面分より下で表示）
  window.addEventListener('scroll', () => { if (totop && totop.isConnected) totop.hidden = window.scrollY < window.innerHeight; }, { passive: true });

  const STATUS_LABEL = { suspected: '漏洩のおそれ', confirmed: '漏洩を確認', individually_notified: '漏洩を確認', denied: '漏洩なしと公表' };
  const STATUS_SUB = { suspected: '漏洩のおそれがあると公表', confirmed: '漏洩を確認したと公表', individually_notified: '漏洩を確認し、対象の人に会社から連絡しています', denied: 'その後「漏洩はなかった」と公表されました' };
  const INFO_LABEL = {
    credentials: 'ID・パスワード', password: 'パスワード', credit_card: 'クレジットカード番号', credit_card_partial: 'カード番号の一部（下4桁など）',
    email: 'メールアドレス', phone: '電話番号', address: '住所', name: '氏名', birthdate: '生年月日', id_document_image: '本人確認書類の画像',
    bank_account: '銀行口座', my_number: 'マイナンバー', financial_assets: '資産の情報', family_composition: '家族構成', medical: '病歴・診療の情報',
    purchase_history: '購入・利用履歴', other: 'その他',
  };
  const incidentsByService = {};
  for (const inc of incidents) for (const sid of inc.service_ids) (incidentsByService[sid] ||= []).push(inc);
  const infoTypesSorted = [...cards.info_types].sort((a, b) => (a.urgency || 9) - (b.urgency || 9));

  // ---------- 視覚部品：会社の丸（カテゴリ固定色＋カテゴリの絵）、情報の種類チップ、状態の形
  const avatarFor = (svc, size) => {
    const cat = svc && catByKey[svc.category];
    return el('span', { class: `av${size ? ' ' + size : ''}${cat ? ' c-' + cat.key : ''}`, 'aria-hidden': 'true' }, icon(cat ? cat.icon : 'layout-grid'));
  };
  const serviceOf = (inc) => svcById[inc.service_ids[0]];
  // 見出し・カード題名用の短い名前（「ブックオフ（オンラインストア・公式アプリ・Web会員）」→「ブックオフ」）。正式名は事案別ページに
  const shortName = (inc) => inc.service_name.replace(/（.*?）/g, '').trim() || inc.service_name;
  // 事案の「漏れた情報」を、カード群（情報の種類）単位のチップにまとめる。カード群に無いキーは文字だけのチップ
  function infoChips(inc) {
    const limited = inc.limited_info_types || {};
    const leaked = inc.leaked_info_types.filter((k) => !(k in limited));
    const ul = el('ul', { class: 'chips', 'aria-label': '漏れたとされる情報' });
    const covered = new Set();
    for (const t of infoTypesSorted) {
      const hit = t.matches.filter((k) => leaked.includes(k));
      if (!hit.length) continue;
      hit.forEach((k) => covered.add(k));
      ul.append(el('li', { class: 'chip' + (t.urgency === 1 ? ' strong' : '') }, icon(t.icon), t.chip_label || t.label));
    }
    for (const k of leaked) if (!covered.has(k)) ul.append(el('li', { class: 'chip plain' }, INFO_LABEL[k] || k));
    return ul;
  }
  const statusShape = (x) => icon(x.isDone ? 'circle-check' : x.reopened ? 'alert-triangle' : 'ring', 'st');

  // ---------- カードの計算（並び：先頭カード → 緊急度順）
  function reopenDate(inc, card, infoType) {
    let d = inc.first_published;
    for (const a of inc.announcements) {
      for (const ch of a.changes || []) {
        if (infoType && ch.startsWith('info_added:') && infoType.matches.includes(ch.slice(11)) && a.date > d) d = a.date;
        if (ch.startsWith('status:') && ch.endsWith('->confirmed') && card.reopen_on_confirm && a.date > d) d = a.date;
      }
    }
    return d;
  }
  function cardsFor(inc) {
    const out = [];
    const push = (card, infoType) => {
      const key = `${inc.id}:${card.id}`;
      const rd = reopenDate(inc, card, infoType);
      const doneOn = typeof done[key] === 'string' ? done[key] : null;
      const isDone = !!doneOn && doneOn >= rd;
      const reopened = !!doneOn && !isDone;
      out.push({ inc, card, infoType, key, isDone, reopened, doneOn, reopenDate: rd, unseen: reopened && seen[key] !== rd });
    };
    push(cards.always_first_card, null);
    const limited = inc.limited_info_types || {};
    const leaked = new Set(inc.leaked_info_types.filter((k) => !(k in limited)));
    for (const t of infoTypesSorted) {
      if (!t.matches.some((k) => leaked.has(k))) continue;
      for (const c of t.cards) push(c, t);
    }
    return out;
  }
  const myIncidents = () => incidents.filter((i) => i.service_ids.some((sid) => selected.has(sid)));
  // 並び：要対応がある事案 → 全部済んだ事案 → 取り下げ。同じ段の中は新しい公表が先
  const rank = (inc) => (inc.status === 'denied' ? 2 : cardsFor(inc).every((x) => x.isDone) ? 1 : 0);
  const orderIncidents = (list) => [...list].sort((a, b) => rank(a) - rank(b) || (a.last_updated < b.last_updated ? 1 : -1));
  function summary() {
    const mine = myIncidents();
    const active = mine.filter((i) => i.status !== 'denied');
    let open = 0, total = 0, reopened = 0, unseen = 0;
    for (const inc of active) for (const x of cardsFor(inc)) { total++; if (!x.isDone) open++; if (x.reopened) reopened++; if (x.unseen) unseen++; }
    const newIncidents = lastVisit ? active.filter((i) => i.last_updated > lastVisit) : [];
    return { mine, active, open, total, reopened, unseen, newIncidents };
  }

  // ---------- 共通部品
  const banner = (kind, name, ...content) => el('div', { class: `banner ${kind}`, role: 'status' }, icon(name), el('div', null, ...content));
  const tagFor = (x) => {
    if (x.isDone) return el('span', { class: 'tag done' }, '対策済み');
    if (x.reopened) return el('span', { class: 'tag recheck' }, '再確認', x.unseen ? el('span', { class: 'dot', 'aria-hidden': 'true' }) : null);
    return el('span', { class: 'tag todo' }, '未対応');
  };
  const cardTitle = (x) => x.card.title.replace('{service}', shortName(x.inc));
  function contactNode(key) {
    const c = cards.official_contacts[key];
    if (!c) return null;
    const body = el('div', null, el('span', { class: 'lab' }, c.label + (c.hours ? `（${c.hours}）` : '')));
    if (c.phone) body.append(el('span', { class: 'num' }, c.phone));
    if (c.url) body.append(el('span', { class: 'small' }, extLink(c.url, '公式ページを開く')));
    return el('div', { class: 'contact' }, icon(c.phone ? 'phone' : 'file-text'), body);
  }
  function sourcesNode(keys) {
    const list = el('ul', null);
    for (const k of keys) { const s = cards.sources[k]; if (s) list.append(el('li', null, s.url ? extLink(s.url, s.title) : s.title)); }
    return el('details', null, el('summary', null, icon('file-text'), '根拠（公的機関の資料）'), list);
  }
  // やり方：番号つき手順（steps）が無ければ文章（detail）
  function howNode(card) {
    const frag = document.createDocumentFragment();
    frag.append(el('h4', null, 'やり方'));
    if (Array.isArray(card.steps) && card.steps.length) {
      const ol = el('ol', { class: 'steps' });
      card.steps.forEach((t, i) => ol.append(el('li', null, el('span', { class: 'num', 'aria-hidden': 'true' }, String(i + 1)), el('span', null, t))));
      frag.append(ol);
    } else frag.append(el('p', { class: 'how' }, card.detail));
    if (card.dont) frag.append(el('div', { class: 'dont' }, icon('forbid-2'), el('span', null, card.dont)));
    return frag;
  }
  const skipNode = (t) => {
    const n = el('div', { class: 'skip' }, el('b', null, 'しなくてよい'));
    const body = el('span', null);
    t.skip_if.forEach((s, i) => { if (i) body.append(el('br')); body.append(s); });
    n.append(body);
    return n;
  };

  // ---------- 全体像の部品（docs/ux-overview-research.md §4）
  // 工程バー（段B）：全部で3つ「1 選ぶ／2 確かめる／3 対策する」。どの画面も1行の小型。現在だけ黒太字。矢印は使わない
  // cur: 1〜3。trail: 右端に添える文字（やること画面の「22件中 1件 済み」など）
  function journeyNode(cur, s, trail) {
    const steps = [
      { n: 1, label: '選ぶ', href: '#/services' },
      { n: 2, label: '確かめる', href: '#/' },
      { n: 3, label: '対策する', href: '#/todo' },
    ];
    const ol = el('ol', { class: 'journey', 'aria-label': '全部で3つの工程' });
    steps.forEach((st, i) => {
      const isCur = st.n === cur;
      const isDone = !isCur && (st.n < cur || (st.n === 3 && s.total && !s.open) || (st.n === 1 && selected.size > 0));
      const dot = el('span', { class: 'dot', 'aria-hidden': 'true' }, isDone ? icon('check') : String(st.n));
      ol.append(el('li', { class: isCur ? 'cur' : isDone ? 'done' : '', 'aria-current': isCur ? 'step' : null },
        el('a', { href: st.href }, dot, el('span', { class: 'lbl' }, st.label), isCur ? el('span', { class: 'sr-only' }, '（いまここ）') : null)));
      if (i < 2) ol.append(el('li', { class: 'sep', 'aria-hidden': 'true' }, '—'));
    });
    if (trail) ol.append(el('li', { class: 'trail' }, trail));
    return ol;
  }
  // ホームの状態の箱の下の1行（段C）：内訳の数字。それぞれ押せる
  function metaLine(s, onIncidents) {
    const svc = el('a', { href: '#/services' }, `選んだサービス ${selected.size}`);
    const inc = el('button', { type: 'button', class: 'linklike' }, `関係ある漏洩 ${s.active.length}`);
    inc.addEventListener('click', onIncidents);
    const done = el('a', { href: '#/todo' }, `対策済み ${s.total - s.open}`);
    return el('p', { class: 'hero-meta' }, svc, ' ・ ', inc, ' ・ ', done, ' ・ ', `最終確認 ${fmtMd(today)}`);
  }
  // 次に起きること（段C）：1行の要約を見出しにした折りたたみ
  function nextWhatNode() {
    return el('details', { class: 'fold-c' },
      el('summary', null, icon('chevron-down', 'chev'), '次に起きること（全部済ませると「今は対策済み」。続報が出ると必要な分だけ戻ります）'),
      el('ol', null,
        el('li', null, '全部済ませると「今は対策済み」になります'),
        el('li', null, '続報が出ると、必要な分だけ「再確認」で戻ります'),
        el('li', null, 'お知らせは届きません。ときどき開いてください')));
  }
  // 最近の公表（段C）：箱なし、13px、状態は文字
  function recentNode(open) {
    const recent = [...incidents].sort((a, b) => (a.last_updated < b.last_updated ? 1 : -1)).slice(0, 3);
    const ul = el('ul', { class: 'recent' });
    for (const inc of recent) ul.append(el('li', null, el('span', { class: 'd' }, fmtMd(inc.last_updated)), el('a', { href: `./incidents/${encodeURIComponent(inc.id)}/` }, shortName(inc)), ` ${STATUS_LABEL[inc.status]}`));
    ul.append(el('li', null, el('span', { class: 'd' }), el('a', { href: './incidents/' }, 'すべての事案')));
    return el('details', { class: 'fold-c', open: !!open }, el('summary', null, icon('chevron-down', 'chev'), '最近の公表（選んだサービス以外も）'), ul);
  }

  // ---------- ホーム
  // 関係ある漏洩の1行（段B）：丸＋事案名＋13px補足＋件数。全部済んだ事案は灰の通常ウェイト。チップは出さない（事案別ページとやることに残す）
  function incidentRow(inc) {
    const list = cardsFor(inc);
    const n = list.filter((x) => x.isDone).length;
    const denied = inc.status === 'denied';
    const allDone = !denied && n === list.length;
    const first = inc.announcements[0];
    const last = inc.announcements[inc.announcements.length - 1];
    const sub = denied ? 'その後「漏洩はなかった」と公表' : allDone ? '対策済み' : `${fmtMd(first.date)} ${STATUS_LABEL[inc.status]}${inc.announcements.length > 1 ? ` ・ 第${inc.announcements.length}報 ${fmtMd(last.date)}` : ''}`;
    const cnt = denied ? el('span', { class: 'cnt ok' }, '取り下げ') : allDone ? el('span', { class: 'cnt ok' }, `${n} / ${list.length}`) : el('span', { class: 'cnt' }, el('b', null, String(n)), ` / ${list.length}`);
    return el('li', { class: allDone || denied ? 'is-done' : '' }, el('a', { href: denied ? `./incidents/${encodeURIComponent(inc.id)}/` : '#/todo' },
      avatarFor(serviceOf(inc), 'sm'), el('span', { class: 'nm' }, shortName(inc), el('small', null, sub)), cnt, icon('chevron-down', 'chev')));
  }
  function viewHome() {
    const s = summary();
    const wrap = el('div', { class: 'wrap' });
    if (flash) { wrap.append(banner(flash.kind, flash.kind === 'success' ? 'circle-check' : 'info-circle', el('p', null, flash.text))); flash = null; }
    else if (selected.size && (s.newIncidents.length || s.unseen)) {
      const parts = [];
      if (s.newIncidents.length) parts.push(`新しい公表 ${s.newIncidents.length}件`);
      if (s.unseen) parts.push(`再確認 ${s.unseen}件`);
      wrap.append(banner('info', 'info-circle', el('p', null, `前回（${fmtMd(lastVisit)}）から：${parts.join('、')}`), el('a', { href: '#/todo' }, 'やることを見る')));
    }

    // 段B：関係ある漏洩（罫線の行）。段Cの「関係ある漏洩 N」を押すとここへ
    let mineSec = null;
    if (selected.size && s.mine.length) {
      const ul = el('ul', { class: 'inc-rows' });
      for (const inc of orderIncidents(s.mine)) ul.append(incidentRow(inc));
      mineSec = el('section', { 'aria-labelledby': 'mine-h', id: 'mine' }, el('h2', { id: 'mine-h', class: 'sec', tabindex: '-1' }, '関係ある漏洩'), ul);
    }
    const toMine = () => { if (mineSec) { mineSec.scrollIntoView({ block: 'start' }); mineSec.querySelector('h2').focus(); } };

    if (!selected.size) {
      // 空状態：段A＝タグライン＋主ボタン（説明の上）。段B＝工程3段＋終点。段C＝できること・できないこと、最近の公表
      const step = (n, title, note) => el('li', null, el('span', { class: 'num', 'aria-hidden': 'true' }, n), el('span', null, el('b', null, title), el('small', null, note)));
      wrap.append(el('section', { class: 'hero start', 'aria-labelledby': 'h1' },
        el('h1', { id: 'h1' }, '使っているサービスの漏洩と、やることだけ'),
        el('div', { class: 'btn-row' }, el('a', { class: 'btn lg wide', href: '#/services' }, icon('layout-grid'), '1 サービスを選ぶ'))));
      wrap.append(el('ol', { class: 'steps-home', 'aria-label': '全部で3つの工程' },
        step('1', 'サービスを選ぶ', 'チェックを入れるだけ ・ 約2分'),
        step('2', '漏洩を確かめる', '関係ある公表だけが出ます ・ 約1分'),
        step('3', '対策する', '1つずつ「済みにする」 ・ 1件 約1〜15分'),
        el('li', { class: 'goal' }, el('span', { class: 'num', 'aria-hidden': 'true' }, icon('check')), el('span', null, el('b', null, '今は対策済み'), el('small', null, '続報が出たら、必要な分だけ戻ります')))));
      wrap.append(el('details', { class: 'fold-c' }, el('summary', null, icon('chevron-down', 'chev'), 'できること・できないこと'),
        el('ul', null,
          el('li', null, 'できること：会社が公表した漏洩のうち、関係あるものだけを表示'),
          el('li', null, 'できないこと：あなたが対象かの判定。会社からの連絡で確認を'),
          el('li', null, '選んだ内容は端末内にだけ保存。氏名やメールの入力はありません'))));
      wrap.append(recentNode(true));
      return wrap;
    }

    wrap.append(journeyNode(s.open > 0 || !s.total ? 2 : 3, s));
    if (s.open > 0) {
      // 段A：状態の箱（1画面に1つ）。見出し＋残り件数（最大の数字）＋主ボタン。内訳は段Cの1行
      wrap.append(el('section', { class: 'hero todo', 'aria-labelledby': 'h1' },
        el('div', { class: 'hero-head' }, el('span', { class: 'av big accent', 'aria-hidden': 'true' }, icon('list-check')),
          el('h1', { id: 'h1' }, 'やること', el('br'), el('span', { class: 'big-n' }, String(s.open)), '件')),
        el('div', { class: 'btn-row' }, el('a', { class: 'btn lg wide', href: '#/todo' }, '次の1件をやる')),
        metaLine(s, toMine)));
    } else {
      wrap.append(el('section', { class: 'hero ok', 'aria-labelledby': 'h1' },
        el('div', { class: 'hero-head' }, el('span', { class: 'av big success', 'aria-hidden': 'true' }, icon('circle-check')), el('h1', { id: 'h1' }, '今は対策済みです')),
        el('p', { class: 'sum' }, s.active.length ? `やること${s.total}件はすべて終わっています。` : '選んだサービスに、公表された漏洩はありません。'),
        el('div', { class: 'btn-row' }, el('a', { class: 'btn secondary', href: '#/services' }, 'サービスを追加する'), s.active.length ? el('a', { class: 'btn text', href: '#/todo' }, '終わったやることを見る') : null),
        metaLine(s, toMine)));
    }
    if (mineSec) wrap.append(mineSec);
    wrap.append(nextWhatNode());
    wrap.append(recentNode(true));
    return wrap;
  }

  // ---------- やること
  function viewTodo() {
    const s = summary();
    const wrap = el('div', { class: 'wrap' });
    if (!selected.size) {
      wrap.append(el('h1', null, 'やること'), el('div', { class: 'hero start' }, el('p', null, 'まず、使っているサービスを選んでください。'), el('div', { class: 'btn-row' }, el('a', { class: 'btn', href: '#/services' }, 'サービスを選ぶ'))));
      return wrap;
    }
    wrap.append(journeyNode(3, s, s.total ? `${s.total}件中 ${s.total - s.open}件 済み` : null));
    const h1 = el('h1', { tabindex: '-1', class: 'sr-only' }, 'やること');
    wrap.append(h1);
    if (!s.total) wrap.append(el('p', { class: 'caption' }, '選んだサービスについて、公表された漏洩は今のところありません。'));
    const rows = new Map(); // key → { row, panel }
    const ordered = orderIncidents(s.mine);
    const sections = ordered.map((inc) => incidentSection(inc, rows));
    // 目次（段C）：事案が4つ以上のときだけ、文字のリスト
    if (ordered.length >= 4) {
      const toc = el('nav', { class: 'toc', 'aria-labelledby': 'toc-h' }, el('h2', { id: 'toc-h', class: 'sec' }, '目次'));
      const ul = el('ul', null);
      ordered.forEach((inc, i) => {
        const list = cardsFor(inc);
        const n = list.filter((x) => x.isDone).length;
        const b = el('button', { type: 'button', class: 'linklike' }, `${shortName(inc)}（${inc.status === 'denied' ? '取り下げ' : `${n} / ${list.length}`}）`);
        b.addEventListener('click', () => { const sec = sections[i]; sec.open = true; sec.scrollIntoView({ block: 'start' }); sec.querySelector('summary').focus(); });
        ul.append(el('li', null, b));
      });
      toc.append(ul);
      wrap.append(toc);
    }
    // 次の1件（未対応の先頭）。直下に全体一覧があるので俯瞰は失わない
    const next = s.active.flatMap(cardsFor).find((x) => !x.isDone);
    if (next) {
      const ok = el('button', { type: 'button', class: 'btn' }, icon('check'), '済みにする');
      ok.addEventListener('click', () => { done[next.key] = today; save(LS.done, done); rerender(); });
      const how = el('button', { type: 'button', class: 'btn ghost' }, 'やり方を見る');
      how.addEventListener('click', () => { const r = rows.get(next.key); if (!r) return; r.open(); r.row.scrollIntoView({ block: 'center' }); r.row.focus(); });
      wrap.append(el('section', { class: 'next', 'aria-labelledby': 'next-h' },
        el('div', { class: 'lab' }, el('span', { id: 'next-h' }, '次の 1件'), el('span', null, `${s.total}件中 ${s.total - s.open + 1}件目`)),
        el('div', { class: 'body' }, icon(next.card.icon || (next.infoType && next.infoType.icon) || 'list-check', 'xl'),
          el('div', null, el('h2', null, cardTitle(next)), el('p', { class: 'meta' }, `${shortName(next.inc)} ・ 約${next.card.minutes}分`))),
        el('div', { class: 'btn-row' }, ok, how)));
    }
    for (const sec of sections) wrap.append(sec);
    if (!s.open && s.total) wrap.append(banner('success', 'circle-check', el('p', null, el('b', null, '今は対策済みです。'), '続報が出たら、必要なものだけが「再確認」として戻ります。'), el('a', { href: '#/' }, 'ホームへ')));
    // 「先頭へ」：1画面分より下にいるときだけ出す
    const top = el('button', { type: 'button', class: 'totop', hidden: true }, icon('chevron-down'), '先頭へ');
    top.addEventListener('click', () => { window.scrollTo(0, 0); h1.focus(); });
    totop = top;
    wrap.append(top);
    return wrap;
  }
  // 事案（段B）＝見出し行（下罫線）＋行。未対応があれば開いた状態、全部済んだ・取り下げは閉じた1行（段C）で始める
  // 行の並び：未対応・再確認 → 先頭 VISIBLE 件だけ見せ、残りは「残り N件」に畳む → 対策済みは「対策済み N件」に畳む（段C）
  const VISIBLE = 3;
  function incidentSection(inc, rows) {
    const list = cardsFor(inc);
    const n = list.filter((x) => x.isDone).length;
    const denied = inc.status === 'denied';
    const allDone = !denied && n === list.length;
    const first = inc.announcements[0];
    const sec = el('details', { class: 'task' + (allDone || denied ? ' is-done' : ''), id: `sec-${inc.id}`, open: !denied && !allDone });
    const sub = denied ? 'その後「漏洩はなかった」と公表' : allDone ? `対策済み ${n} / ${list.length}` : `${fmtMd(first.date)} ${STATUS_LABEL[inc.status]}`;
    sec.append(el('summary', { class: 'inc-head' }, avatarFor(serviceOf(inc), allDone || denied ? 'sm' : null),
      el('div', { class: 'ttl' }, el('h2', { id: `t-${inc.id}` }, shortName(inc)), el('span', { class: 'sub' }, sub)),
      denied || allDone ? null : el('span', { class: 'count' }, el('b', null, String(n)), ` / ${list.length}`),
      icon('chevron-down', 'chev')));
    const detailLink = el('p', { class: 'task-about caption' }, el('a', { href: `./incidents/${encodeURIComponent(inc.id)}/` }, '会社の公表と窓口を見る'));
    if (denied) { sec.append(el('p', { class: 'task-withdrawn' }, 'やることはありません。'), detailLink); return sec; }
    // 行を「未対応（小見出し・しなくてよい つき）」と「対策済み」に分けて組む
    const openItems = []; // li の列（type-head / task-item / skip-note）
    const doneItems = [];
    let currentType = null;
    let openCount = 0;
    for (const x of list) {
      if (x.infoType !== currentType) {
        currentType = x.infoType;
        if (currentType && list.some((y) => y.infoType === currentType && !y.isDone)) {
          const cnt = list.filter((y) => y.infoType === currentType && !y.isDone).length;
          openItems.push({ head: true, li: el('li', { class: 'type-head' }, icon(currentType.icon), `${currentType.label}が漏れたとき（${cnt}件）`, currentType.needs_research ? el('span', { class: 'tag neutral' }, '根拠を調査中') : null) });
        }
      }
      if (x.isDone) doneItems.push(taskItem(x, rows));
      else { openItems.push({ li: taskItem(x, rows), item: true }); openCount++; }
      if (!x.isDone && x.infoType && x.card === x.infoType.cards[x.infoType.cards.length - 1] && x.infoType.skip_if.length) {
        const li = el('li', { class: 'skip-note' }, el('b', null, 'しなくてよい'));
        const body = el('span', null);
        x.infoType.skip_if.forEach((t, i) => { if (i) body.append(el('br')); body.append(t); });
        li.append(body); openItems.push({ li });
      }
    }
    const ul = el('ul', { class: 'task-list' });
    let shown = 0, overflow = null;
    for (const it of openItems) {
      if (it.item) shown++;
      if (shown > VISIBLE) {
        if (!overflow) {
          overflow = el('ul', { class: 'task-list' });
          // 直前が小見出しだけで終わっていたら、小見出しごと畳む側へ移す
          const tail = ul.lastElementChild;
          if (tail && tail.classList.contains('type-head')) overflow.append(tail);
        }
        overflow.append(it.li);
      } else ul.append(it.li);
    }
    sec.append(ul);
    if (overflow) sec.append(el('details', { class: 'fold-rows' }, el('summary', null, icon('chevron-down', 'chev'), `残り ${openCount - VISIBLE}件`), overflow));
    if (doneItems.length) {
      const dul = el('ul', { class: 'task-list' }, ...doneItems);
      sec.append(el('details', { class: 'fold-rows done', open: allDone }, el('summary', null, icon('chevron-down', 'chev'), `対策済み ${doneItems.length}件`), dul));
    }
    sec.append(detailLink);
    return sec;
  }
  function taskItem(x, rows) {
    const inc = x.inc;
    const title = cardTitle(x);
    const panelId = 'p-' + x.key.replace(/[^a-z0-9-]/gi, '_');
    const meta = x.isDone ? `対策済み ・ ${fmtMd(x.doneOn)}` : x.reopened ? `${fmtMd(x.reopenDate)}の続報があります ・ 約${x.card.minutes}分` : `約${x.card.minutes}分`;
    const row = el('button', { type: 'button', class: 'task-row' + (x.isDone ? ' is-done' : '') + (x.reopened ? ' is-recheck' : ''), 'aria-expanded': 'false', 'aria-controls': panelId },
      statusShape(x),
      el('span', { class: 'row-main' }, el('span', { class: 'row-title' }, title), el('span', { class: 'row-meta' }, meta)),
      // 未対応は○の形だけ（タグを並べると段Aと競合する）。読み上げには状態語を残す。再確認・対策済みは文字も出す
      el('span', { class: 'row-status' }, x.isDone || x.reopened ? tagFor(x) : el('span', { class: 'sr-only' }, '未対応'), icon('chevron-down', 'chev')));
    const panel = el('div', { class: 'task-panel', id: panelId, hidden: true });
    panel.append(el('p', { class: 'reason' }, x.card.reason));
    if (x.reopened) panel.append(banner('warning', 'alert-triangle', el('p', null, `${fmtMd(x.reopenDate)}の続報で対象が広がりました。もう一度確認してください。`)));
    panel.append(howNode(x.card));
    if (x.card.contact) panel.append(contactNode(x.card.contact));
    for (const k of x.card.contact_list || []) panel.append(contactNode(k));
    panel.append(sourcesNode(x.card.sources));
    panel.append(el('p', { class: 'caption note' }, '※画面や手順は機種により異なります'));
    const actions = el('div', { class: 'btn-row' });
    if (x.isDone) {
      const undo = el('button', { type: 'button', class: 'btn secondary' }, '対策済みを取り消す');
      undo.addEventListener('click', () => { delete done[x.key]; save(LS.done, done); rerender(); });
      actions.append(undo);
    } else {
      const ok = el('button', { type: 'button', class: 'btn' }, icon('check'), '済みにする');
      ok.addEventListener('click', () => { done[x.key] = today; save(LS.done, done); rerender(); });
      const later = el('button', { type: 'button', class: 'btn text' }, 'あとで');
      later.addEventListener('click', () => { row.setAttribute('aria-expanded', 'false'); panel.hidden = true; });
      actions.append(ok, later);
    }
    panel.append(actions);
    const open = () => {
      row.setAttribute('aria-expanded', 'true'); panel.hidden = false;
      if (x.unseen) { seen[x.key] = x.reopenDate; save(LS.seen, seen); x.unseen = false; const d = row.querySelector('.dot'); if (d) d.remove(); }
    };
    row.addEventListener('click', () => {
      if (row.getAttribute('aria-expanded') === 'true') { row.setAttribute('aria-expanded', 'false'); panel.hidden = true; } else open();
    });
    if (rows) rows.set(x.key, { row, panel, open });
    return el('li', { class: 'task-item' }, row, panel);
  }

  // ---------- サービス選択
  const normalize = (s) => String(s || '').normalize('NFKC').toLowerCase().replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60)).replace(/[\s・（）()「」]/g, '');
  const searchIndex = services.services.map((s) => ({ s, keys: [s.name, s.operator, ...(s.aliases || [])].map(normalize) }));
  const hasIncident = (id) => (incidentsByService[id] || []).some((i) => i.status !== 'denied');
  function pickNode(s, onChange) {
    const input = el('input', { type: 'checkbox', value: s.id, checked: selected.has(s.id) });
    input.addEventListener('change', () => { if (input.checked) selected.add(s.id); else selected.delete(s.id); save(LS.services, [...selected]); onChange(); });
    return el('label', { class: 'pick' }, avatarFor(s), el('span', { class: 'name' }, s.name, el('span', { class: 'op' }, s.operator), hasIncident(s.id) ? el('span', { class: 'hit' }, '漏洩の公表あり') : null), input);
  }
  function viewServices() {
    const wrap = el('div', { class: 'wrap' });
    wrap.append(journeyNode(1, summary(), false));
    wrap.append(el('h1', null, '使っているサービスを選ぶ'), el('p', { class: 'caption' }, '使っているものをすべて選んでください。あとから変えられます。'));

    // 検索
    const input = el('input', { type: 'search', id: 'svc-search', placeholder: '例：セブン、ペイペイ、タイムズ', autocomplete: 'off', 'aria-label': 'サービス名で探す', 'aria-controls': 'svc-suggest', enterkeyhint: 'search' });
    const suggest = el('ul', { class: 'suggest', id: 'svc-suggest', hidden: true, 'aria-live': 'polite' });
    const sync = () => { refreshTokens(); for (const cb of wrap.querySelectorAll('input[type=checkbox]')) cb.checked = selected.has(cb.value); };
    const runSearch = () => {
      const q = normalize(input.value);
      clear(suggest);
      if (!q) { suggest.hidden = true; return; }
      const hits = searchIndex.filter((e) => e.keys.some((k) => k.includes(q))).slice(0, 8);
      if (!hits.length) suggest.append(el('li', { class: 'empty' }, '見つかりません。別の呼び名で探すか、', el('a', { href: `${DATA.repo_url}/issues/new/choose`, target: '_blank', rel: 'noopener noreferrer' }, '追加を依頼'), 'してください。'));
      for (const e of hits) suggest.append(el('li', null, pickNode(e.s, sync)));
      suggest.hidden = false;
    };
    input.addEventListener('input', runSearch);
    wrap.append(el('section', { 'aria-label': '検索' }, el('label', { class: 'sr-only', for: 'svc-search' }, 'サービス名で探す'), el('div', { class: 'search' }, icon('search'), input), suggest));

    // よく使われている
    const popular = services.services.filter((s) => s.popular_rank).sort((a, b) => a.popular_rank - b.popular_rank).slice(0, 10);
    const grid = el('div', { class: 'pick-grid' });
    for (const s of popular) grid.append(pickNode(s, sync));
    wrap.append(el('section', { 'aria-labelledby': 'pop' }, el('h2', { id: 'pop', class: 'small muted' }, 'よく使われているサービス'), grid));

    // 最近漏洩が公表されたサービス ＋ カテゴリ
    const recentIds = [...new Set(incidents.filter((i) => i.status !== 'denied').sort((a, b) => (a.last_updated < b.last_updated ? 1 : -1)).flatMap((i) => i.service_ids))].filter((id) => svcById[id]);
    const cats = el('div', null);
    cats.append(catDetails('最近、漏洩が公表された', el('span', { class: 'av c-recent', 'aria-hidden': 'true' }, icon('alert-circle')), recentIds.map((id) => svcById[id]), sync));
    for (const cat of services.categories) {
      const list = services.services.filter((s) => s.category === cat.key);
      if (list.length) cats.append(catDetails(cat.label, el('span', { class: `av c-${cat.key}`, 'aria-hidden': 'true' }, icon(cat.icon)), list, sync));
    }
    wrap.append(el('section', { 'aria-labelledby': 'cats' }, el('h2', { id: 'cats', class: 'small muted' }, '種類から探す'), cats));
    wrap.append(el('p', { class: 'caption' }, '見つからないものは、あとで追加できます。'));

    // 画面下の固定バー（選択中をトークンで表示。件数だけにしない）
    const tokens = el('div', { class: 'tokens' });
    const label = el('span', { class: 'label' });
    const decide = el('a', { class: 'btn', href: '#/' }, '決定');
    decide.addEventListener('click', () => { flash = { kind: 'success', text: `${selected.size}件を選びました。` }; });
    const bar = el('div', { class: 'sticky-bar' }, el('div', { class: 'inner' }, label, tokens, decide));
    function refreshTokens() {
      clear(tokens);
      label.textContent = selected.size ? `選択中 ${selected.size}件` : '選択中';
      if (!selected.size) { tokens.append(el('span', { class: 'muted small' }, 'まだ選んでいません')); return; }
      for (const id of selected) {
        const t = el('button', { type: 'button', class: 'token', 'aria-label': `${svcById[id].name} を外す` }, avatarFor(svcById[id], 'xs'), svcById[id].name, el('span', { class: 'x', 'aria-hidden': 'true' }, icon('x')));
        t.addEventListener('click', () => { selected.delete(id); save(LS.services, [...selected]); sync(); });
        tokens.append(t);
      }
    }
    refreshTokens();
    wrap.append(bar);
    return wrap;
  }
  function catDetails(label, av, list, onChange) {
    const LIMIT = 10;
    const body = el('div', { class: 'pick-list' });
    const show = (n) => { clear(body); for (const s of list.slice(0, n)) body.append(pickNode(s, onChange)); };
    const d = el('details', { class: 'cat' }, el('summary', null, av, label, el('span', { class: 'cnt' }, `${list.length}件`), icon('chevron-down', 'chev')), el('div', { class: 'body' }, body));
    // 1件だけ隠さない（Baymard）
    if (list.length > LIMIT + 1) {
      show(LIMIT);
      const more = el('button', { type: 'button', class: 'btn secondary more' }, `さらに表示（+${list.length - LIMIT}）`);
      more.addEventListener('click', () => { show(list.length); more.remove(); });
      d.querySelector('.body').append(more);
    } else show(list.length);
    return d;
  }

  // ---------- 設定
  function viewSettings() {
    const wrap = el('div', { class: 'wrap' });
    wrap.append(el('h1', null, '設定'));
    const ul = el('ul', { class: 'plain-list settings-list' });

    // 家族に見せる
    const shareMsg = el('p', { class: 'small muted', 'aria-live': 'polite' });
    const share = el('button', { type: 'button', class: 'btn secondary' }, 'このページのURLを家族に送る');
    share.addEventListener('click', async () => {
      const url = location.origin + location.pathname;
      try {
        if (navigator.share) { await navigator.share({ title: 'じぶんの情報対策', url }); shareMsg.textContent = '共有しました。'; }
        else if (navigator.clipboard) { await navigator.clipboard.writeText(url); shareMsg.textContent = 'URLをコピーしました。メッセージに貼り付けて送ってください。'; }
        else shareMsg.textContent = url;
      } catch { shareMsg.textContent = url; }
    });
    ul.append(el('li', null, el('h3', null, icon('home-2'), '家族に見せる'), el('p', { class: 'small' }, 'URLを家族に送ります。家族の端末で同じサービスを選ぶと、同じやることが見られます。あなたの記録は送られません。'), share, shareMsg));

    // 引き継ぎ
    const code = el('textarea', { class: 'code', 'aria-label': '引き継ぎコード', placeholder: 'ここにコードが表示されます／貼り付けます', spellcheck: 'false' });
    const msg = el('p', { class: 'small', 'aria-live': 'polite' });
    const b64e = (s) => btoa(Array.from(new TextEncoder().encode(s), (b) => String.fromCharCode(b)).join(''));
    const b64d = (s) => new TextDecoder().decode(Uint8Array.from(atob(s), (c) => c.charCodeAt(0)));
    const exp = el('button', { type: 'button', class: 'btn secondary' }, 'コードを書き出す');
    exp.addEventListener('click', () => { code.value = 'JIBUN1.' + b64e(JSON.stringify({ s: [...selected], d: done })); msg.textContent = '書き出しました。他の人には見せないでください。'; });
    const imp = el('button', { type: 'button', class: 'btn secondary' }, 'コードを読み込む');
    imp.addEventListener('click', () => {
      const v = code.value.trim();
      if (!v.startsWith('JIBUN1.')) { msg.textContent = 'コードの形式が違います。「JIBUN1.」で始まるコードを貼り付けてください。'; return; }
      try {
        const o = JSON.parse(b64d(v.slice(7)));
        const s = Array.isArray(o.s) ? o.s.filter((id) => typeof id === 'string' && svcById[id]) : [];
        const d = {}; if (isObj(o.d)) for (const [k, val] of Object.entries(o.d)) if (/^\d{4}-\d{2}-\d{2}$/.test(String(val))) d[k] = String(val);
        selected = new Set(s); done = d; save(LS.services, [...selected]); save(LS.done, done);
        msg.textContent = `読み込みました（サービス ${selected.size}件）。`;
      } catch { msg.textContent = 'コードを読み込めませんでした。'; }
    });
    ul.append(el('li', null, el('h3', null, icon('device-mobile'), '引き継ぎ（機種変更のとき）'), el('p', { class: 'small' }, '選んだサービスと完了状態をコードにして、新しい端末で読み込めます。'), el('div', { class: 'btn-row' }, exp, imp), code, msg));

    // 端末の記録を消す
    const resetMsg = el('p', { class: 'small', 'aria-live': 'polite' });
    const reset = el('button', { type: 'button', class: 'btn secondary' }, 'この端末の記録を消す');
    reset.addEventListener('click', () => {
      if (!confirm('この端末に保存した「選んだサービス」と「完了状態」を消します。消してよいですか？')) return;
      remove(LS.services); remove(LS.done); remove(LS.lastVisit); remove(LS.seen);
      selected = new Set(); done = {}; seen = {}; resetMsg.textContent = '消しました。';
    });
    ul.append(el('li', null, el('h3', null, icon('settings'), 'この端末の記録'), el('p', { class: 'small' }, '保存しているのは、選んだサービス・完了日・最終確認日の3つだけです。'), reset, resetMsg));

    ul.append(el('li', null, el('h3', null, icon('home'), 'ホーム画面に追加'), el('p', { class: 'small' }, '次に開きやすくなります。iPhone：共有ボタン→「ホーム画面に追加」。Android：メニュー→「ホーム画面に追加」。')));
    ul.append(el('li', null, el('h3', null, icon('info-circle'), 'このサイトについて'), el('p', { class: 'small' }, el('a', { href: './about.html' }, '目的と、やらないこと'), '　', el('a', { href: './privacy.html' }, 'プライバシー'), '　', el('a', { href: './faq.html' }, 'よくある質問'), '　', el('a', { href: './incidents/' }, 'すべての事案'))));
    wrap.append(ul);
    return wrap;
  }

  // ---------- 相談窓口
  function viewHelp() {
    const wrap = el('div', { class: 'wrap' });
    wrap.append(el('h1', null, '相談窓口'), el('p', { class: 'caption' }, '迷ったときの公的な窓口です。番号は公式ページで確認済みです。'));
    const ul = el('ul', { class: 'plain-list contact-list' });
    for (const key of ['consumer-hotline', 'police-consult', 'ipa-anshin', 'intl-call-stop', 'mynumber-call']) {
      if (!cards.official_contacts[key]) continue;
      ul.append(el('li', null, contactNode(key)));
    }
    wrap.append(ul, el('p', { class: 'small muted' }, '被害に遭ったとき、遭いそうなときは、警察署か 110 へ。'));
    return wrap;
  }

  // ---------- ルーティング
  const VIEWS = { '': viewHome, todo: viewTodo, services: viewServices, settings: viewSettings, help: viewHelp };
  const TITLES = { '': 'じぶんの情報対策', todo: 'やること｜じぶんの情報対策', services: 'サービスを選ぶ｜じぶんの情報対策', settings: '設定｜じぶんの情報対策', help: '相談窓口｜じぶんの情報対策' };
  function route() {
    const h = location.hash.replace(/^#\/?/, '');
    // 旧形式 #s=id1,id2（事案別ページの「登録する」導線）
    const m = h.match(/^s=(.+)$/);
    if (m) {
      const added = [];
      for (const raw of m[1].split(',')) { const id = raw.trim(); if (svcById[id] && !selected.has(id)) { selected.add(id); added.push(svcById[id].name); } }
      if (added.length) { save(LS.services, [...selected]); flash = { kind: 'success', text: `「${added.join('、')}」を追加しました。「サービス」から外せます。` }; }
      history.replaceState(null, '', location.pathname + '#/');
      return '';
    }
    return h.split('?')[0];
  }
  function rerender() {
    const view = route();
    const fn = VIEWS[view] || viewHome;
    clear(app);
    app.append(fn());
    document.title = TITLES[view] || TITLES[''];
    const current = VIEWS[view] ? view : '';
    for (const a of document.querySelectorAll('nav.primary a')) {
      const target = (a.getAttribute('href').split('#')[1] || '').replace(/^\//, '');
      if (target === current) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    }
  }
  window.addEventListener('hashchange', () => { rerender(); window.scrollTo(0, 0); });
  rerender();
  // 「新着」「変化」の判定は初回描画の lastVisit を使い、描画後に今日を記録する
  save(LS.lastVisit, today);
})();
