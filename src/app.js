// じぶんの情報対策 — クライアント側ロジック
// 方針（docs/threat-model.md）：文字列をHTMLとして流し込む経路を一切使わず、DOM API（createElement / textContent）だけで描画する。
// CSP の require-trusted-types-for 'script' により、万一そうした経路が混入してもブラウザが遮断する。
// 通信は行わない（データはページに埋め込み済み）。保存は localStorage のみ。
(function () {
  'use strict';

  // ---------- データ
  const dataEl = document.getElementById('data');
  if (!dataEl) return;
  let DATA;
  try { DATA = JSON.parse(dataEl.textContent); } catch { return; }
  const { cards, services, incidents } = DATA;

  // ---------- 小さなDOMヘルパー（文字列はすべて textNode として扱う）
  const el = (tag, props, ...children) => {
    const n = document.createElement(tag);
    if (props) {
      for (const [k, v] of Object.entries(props)) {
        if (v == null || v === false) continue;
        if (k === 'class') n.className = v;
        else if (k === 'text') n.textContent = v;
        else if (k === 'for') n.htmlFor = v;
        else if (k === 'checked' || k === 'open' || k === 'disabled') n[k] = !!v;
        else if (k === 'value' && (tag === 'progress' || tag === 'input' || tag === 'textarea')) n.value = v;
        else n.setAttribute(k, String(v));
      }
    }
    for (const c of children.flat(Infinity)) {
      if (c == null || c === false) continue;
      n.append(c instanceof Node ? c : document.createTextNode(String(c)));
    }
    return n;
  };
  // 外部リンク。https 以外はリンクにしない（防御的二重化。ビルド時に許可リストで検査済み）
  const extLink = (url, label) => {
    let ok = false;
    try { ok = new URL(url).protocol === 'https:'; } catch { ok = false; }
    if (!ok) return el('span', null, label || url);
    return el('a', { href: url, target: '_blank', rel: 'noopener noreferrer' }, label || url);
  };
  const clear = (n) => { while (n.firstChild) n.removeChild(n.firstChild); };

  // ---------- 端末内保存
  const LS = { services: 'jibun.services', done: 'jibun.done', lastVisit: 'jibun.lastVisit' };
  const load = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } };
  const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* 保存できない環境では何もしない */ } };
  const remove = (k) => { try { localStorage.removeItem(k); } catch { /* noop */ } };

  const svcById = Object.fromEntries(services.services.map((s) => [s.id, s]));
  let selected = new Set((load(LS.services, []) || []).filter((id) => svcById[id]));
  let done = load(LS.done, {}) || {};
  if (typeof done !== 'object' || Array.isArray(done)) done = {};
  const lastVisit = load(LS.lastVisit, null);
  const today = new Date().toISOString().slice(0, 10);

  // #s=timescar,skyticket で選択を持ち込める（事案別ページの導線）。存在するIDだけ受け付け、追加したことを表示する
  let addedByLink = [];
  const params = new URLSearchParams(location.hash.replace(/^#/, '') || location.search.replace(/^\?/, ''));
  const qs = params.get('s');
  if (qs) {
    for (const raw of qs.split(',')) {
      const id = raw.trim();
      if (svcById[id] && !selected.has(id)) { selected.add(id); addedByLink.push(id); }
    }
    if (addedByLink.length) save(LS.services, [...selected]);
    history.replaceState(null, '', location.pathname);
  }

  const STATUS_LABEL = { suspected: '漏えいのおそれ', confirmed: '漏えいを確認', individually_notified: '対象者に個別連絡中', denied: '漏えいなし（取り下げ）' };
  const INFO_LABEL = {
    credentials: 'ID・パスワード', password: 'パスワード', credit_card: 'クレジットカード番号', credit_card_partial: 'カード番号の一部（下4桁など）',
    email: 'メールアドレス', phone: '電話番号', address: '住所', name: '氏名', birthdate: '生年月日', id_document_image: '本人確認書類の画像',
    bank_account: '銀行口座', my_number: 'マイナンバー', financial_assets: '資産の情報', family_composition: '家族構成', medical: '病歴・診療の情報',
    purchase_history: '購入・利用履歴', other: 'その他',
  };
  const fmtDate = (d) => { const [y, m, dd] = d.split('-'); return `${y}年${Number(m)}月${Number(dd)}日`; };
  const incidentsByService = {};
  for (const inc of incidents) for (const sid of inc.service_ids) (incidentsByService[sid] ||= []).push(inc);

  // ---------- サービス選択
  const servicesEl = document.getElementById('services');
  function renderServices() {
    clear(servicesEl);
    for (const cat of services.categories) {
      const list = services.services.filter((s) => s.category === cat.key);
      if (!list.length) continue;
      servicesEl.append(el('div', { class: 'cat' }, `${cat.icon} ${cat.label}`));
      const grid = el('div', { class: 'svc-grid' });
      for (const s of list) {
        const n = (incidentsByService[s.id] || []).filter((i) => i.status !== 'denied').length;
        grid.append(el('label', { class: 'svc' },
          el('input', { type: 'checkbox', value: s.id, checked: selected.has(s.id) }),
          el('span', { class: 'name' }, s.name),
          n ? el('span', { class: 'hit' }, '事案あり') : null,
        ));
      }
      servicesEl.append(grid);
    }
  }
  servicesEl.addEventListener('change', (e) => {
    const t = e.target;
    if (!(t instanceof HTMLInputElement) || t.type !== 'checkbox') return;
    if (t.checked) selected.add(t.value); else selected.delete(t.value);
    save(LS.services, [...selected]);
    renderTodo();
  });

  // ---------- カードの計算
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
      out.push({ card, infoType, key, isDone, reopened: !!doneOn && !isDone, reopenDate: rd });
    };
    push(cards.always_first_card, null);
    const limited = inc.limited_info_types || {};
    const leaked = new Set(inc.leaked_info_types.filter((k) => !(k in limited)));
    for (const t of cards.info_types) {
      if (!t.matches.some((k) => leaked.has(k))) continue;
      for (const c of t.cards) push(c, t);
    }
    return out;
  }
  function contactNode(key) {
    const c = cards.official_contacts[key];
    if (!c) return null;
    const n = el('div', { class: 'contact' }, `${c.label}：`);
    if (c.phone) n.append(el('b', null, c.phone));
    if (c.url) { if (c.phone) n.append('　'); n.append(extLink(c.url)); }
    if (c.hours) n.append(el('span', { class: 'muted small' }, `（${c.hours}）`));
    if (!c.verified_on) n.append(' ', el('span', { class: 'badge draft' }, '要確認'));
    return n;
  }
  function sourcesNode(keys) {
    const n = el('div', { class: 'src small muted' }, '根拠：');
    keys.forEach((k, i) => {
      const s = cards.sources[k];
      if (!s) return;
      if (i) n.append('、');
      n.append(s.url ? extLink(s.url, s.title) : s.title);
    });
    return n;
  }
  function cardNode(inc, x) {
    const title = x.card.title.replace('{service}', inc.service_name);
    const id = 'c-' + x.key.replace(/[^a-z0-9-]/gi, '_');
    const body = el('div', null,
      el('div', { class: 'ct' }, title),
      el('div', { class: 'cd' }, x.card.detail),
      x.reopened ? el('div', { class: 'small reopen' }, `${fmtDate(x.reopenDate)}の続報で内容が変わりました。もう一度確認してください。`) : null,
      x.card.contact ? contactNode(x.card.contact) : null,
      ...(x.card.contact_list || []).map(contactNode),
      sourcesNode(x.card.sources),
    );
    return el('div', { class: 'card' + (x.isDone ? ' done' : '') + (x.reopened ? ' reopened' : '') },
      el('label', { class: 'chk', for: id },
        el('input', { type: 'checkbox', id, 'data-key': x.key, checked: x.isDone }),
        el('span', { class: 'sr-only' }, '完了'),
      ),
      body,
    );
  }

  // ---------- 事案
  function incidentNode(inc) {
    const list = cardsFor(inc);
    const total = list.length;
    const n = list.filter((x) => x.isDone).length;
    const isNew = !lastVisit || inc.last_updated > lastVisit;
    const denied = inc.status === 'denied';
    const allDone = !denied && n === total;
    const operatorShort = inc.operator.replace(/（.*?）/g, '');

    const summary = el('summary', null,
      el('span', { class: 't' }, inc.service_name),
      isNew ? el('span', { class: 'badge new' }, '新着') : null,
      el('span', { class: `badge ${inc.status}` }, STATUS_LABEL[inc.status] || inc.status),
      inc._approved === false ? el('span', { class: 'badge draft' }, '下書き') : null,
      allDone ? el('span', { class: 'badge done' }, '対策済み') : null,
      el('span', { class: 'arrow', 'aria-hidden': 'true' }, '▶'),
      denied ? null : el('span', { class: 'muted small' }, `やること ${n} / ${total}`),
      denied ? null : el('progress', { class: 'progress', max: total || 1, value: n, 'aria-label': 'やることの進み具合' }),
    );

    const body = el('div', { class: 'body' });
    const first = inc.announcements[0];
    const intro = el('p', null,
      `${inc.operator}が${fmtDate(first.date)}に、${inc.service_name}の情報漏えい${inc.status === 'suspected' ? 'のおそれ' : ''}を公表しました。`,
    );
    if (denied) intro.append('その後、', el('b', null, '漏えいはなかった'), 'と公表されたため、やることはありません。');
    else intro.append(el('b', null, `あなたが対象かどうかは、${operatorShort}からの連絡でご確認ください。`));
    body.append(intro, el('p', { class: 'muted small' }, `公表された件数：${inc.counts.wording}`));

    if (!denied) {
      const lim = inc.limited_info_types || {};
      const mainTypes = inc.leaked_info_types.filter((k) => !(k in lim));
      const p = el('p', null, '漏れたとされる情報：');
      mainTypes.forEach((k, i) => { if (i) p.append('、'); p.append(el('b', null, INFO_LABEL[k] || k)); });
      if (inc.other_info_detail) p.append(el('br'), el('span', { class: 'muted small' }, inc.other_info_detail));
      body.append(p);
      const limKeys = Object.keys(lim);
      if (limKeys.length) {
        const q = el('p', { class: 'small' }, 'ごく一部の方だけが対象の情報：');
        limKeys.forEach((k, i) => { if (i) q.append('、'); q.append(el('b', null, INFO_LABEL[k] || k), `（${lim[k]}）`); });
        q.append('。該当する方には会社から個別に連絡があります。');
        body.append(q);
      }
      if (inc.card_not_leaked_stated === true) body.append(el('p', { class: 'muted small' }, 'クレジットカード情報は漏えいしていない、と会社が公表しています。'));
    }
    const oc = inc.official_contact || {};
    if (oc.phone || oc.url) {
      const p = el('p', { class: 'small' }, '会社の公式窓口：');
      if (oc.phone) p.append(el('b', null, oc.phone), ' ');
      if (oc.url) p.append(extLink(oc.url, '問い合わせページ'));
      body.append(p);
    }

    if (!denied) {
      body.append(el('h3', null, 'やること'));
      if (allDone) body.append(el('div', { class: 'notice ok' }, 'いまは対策済みです。続報があれば、必要なものだけがまた未完了に戻ります。'));
      let currentType = null;
      list.forEach((x) => {
        if (x.infoType !== currentType) {
          currentType = x.infoType;
          if (currentType) {
            body.append(el('p', { class: 'muted small type-head' },
              el('b', null, currentType.label), 'が漏れたときにやること',
              currentType.needs_research ? [' ', el('span', { class: 'badge draft' }, '公的な根拠を調査中')] : null,
            ));
          }
        }
        body.append(cardNode(inc, x));
        if (x.infoType && x.card === x.infoType.cards[x.infoType.cards.length - 1] && x.infoType.skip_if.length) {
          const sk = el('div', { class: 'skip small' }, 'やらなくていいこと：');
          x.infoType.skip_if.forEach((s, i) => { if (i) sk.append(el('br')); sk.append(s); });
          body.append(sk);
        }
      });
    }

    body.append(el('h3', null, '会社の公表（公式ページ）'));
    const tl = el('ul', { class: 'timeline' });
    for (const a of inc.announcements) {
      const li = el('li', null, el('span', { class: 'd' }, fmtDate(a.date)), extLink(a.url, a.title));
      for (const ch of a.changes || []) {
        const m = ch.match(/^info_added:(.+)$/); const r = ch.match(/^info_removed:(.+)$/);
        let label = null;
        if (m) label = `＋${INFO_LABEL[m[1]] || m[1]}が追加`;
        else if (r) label = `－${INFO_LABEL[r[1]] || r[1]}は対象外に訂正`;
        else if (ch === 'count_update') label = '件数の訂正・確定';
        else if (ch.startsWith('status:')) label = STATUS_LABEL[ch.split('->')[1]] || '';
        if (label) li.append(el('span', { class: 'ch' }, label));
      }
      li.append(el('details', { class: 'small' }, el('summary', { class: 'muted' }, '事実のメモ'), el('div', { class: 'muted facts' }, a.facts)));
      tl.append(li);
    }
    body.append(tl);
    body.append(el('p', { class: 'small' }, el('a', { href: `./incidents/${encodeURIComponent(inc.id)}/` }, 'この事案のページ')));
    if (inc._approved === false) body.append(el('div', { class: 'notice draft small' }, 'この事案は開発者の目視承認前の下書きです。', inc.review && inc.review.notes ? ` ${inc.review.notes}` : ''));

    return el('details', { class: 'incident', name: 'incident', open: isNew && !denied, 'data-id': inc.id }, summary, body);
  }

  const incidentsEl = document.getElementById('incidents');
  const summaryEl = document.getElementById('summary');
  const selCountEl = document.getElementById('sel-count');
  function renderTodo() {
    clear(incidentsEl); clear(summaryEl);
    selCountEl.textContent = selected.size ? `${selected.size}件 選択中` : '';
    if (!selected.size) { summaryEl.append(el('div', { class: 'notice' }, 'まず上で、使っているサービスを選んでください。')); return; }
    const mine = incidents.filter((i) => i.service_ids.some((sid) => selected.has(sid)));
    const active = mine.filter((i) => i.status !== 'denied');
    if (!active.length) {
      summaryEl.append(el('div', { class: 'notice ok' }, '選んだサービスについて、公表された漏えいはいまのところありません。いまは対策済みです。'));
    } else {
      let open = 0;
      for (const inc of active) if (cardsFor(inc).some((x) => !x.isDone)) open++;
      summaryEl.append(open
        ? el('div', { class: 'notice' }, '選んだサービスのうち ', el('b', null, `${active.length}件`), ' で漏えいが公表されています。やることが残っているのは ', el('b', null, `${open}件`), ' です。上から順に終えてください。')
        : el('div', { class: 'notice ok' }, el('b', null, 'いまは対策済みです。'), `選んだサービスの漏えい ${active.length}件について、やることはすべて完了しています。続報があれば、必要なものだけがまた未完了に戻ります。`));
    }
    for (const inc of mine) incidentsEl.append(incidentNode(inc));
  }
  incidentsEl.addEventListener('change', (e) => {
    const t = e.target;
    if (!(t instanceof HTMLInputElement) || !t.dataset.key) return;
    if (t.checked) done[t.dataset.key] = today; else delete done[t.dataset.key];
    save(LS.done, done);
    const openIds = new Set([...incidentsEl.querySelectorAll('details.incident[open]')].map((d) => d.dataset.id));
    renderTodo();
    for (const d of incidentsEl.querySelectorAll('details.incident')) d.open = openIds.has(d.dataset.id);
  });

  // ---------- 引き継ぎ
  const codeEl = document.getElementById('code');
  const b64e = (s) => btoa(Array.from(new TextEncoder().encode(s), (b) => String.fromCharCode(b)).join(''));
  const b64d = (s) => new TextDecoder().decode(Uint8Array.from(atob(s), (c) => c.charCodeAt(0)));
  const msgEl = document.getElementById('transfer-msg');
  const say = (text, ok) => { msgEl.textContent = text; msgEl.className = 'notice ' + (ok ? 'ok' : ''); };
  document.getElementById('export').addEventListener('click', () => {
    codeEl.value = 'JIBUN1.' + b64e(JSON.stringify({ s: [...selected], d: done }));
    say('コードを書き出しました。このコードには、選んだサービスと完了状態が入っています。他の人には見せないでください。', true);
  });
  document.getElementById('import').addEventListener('click', () => {
    const v = codeEl.value.trim();
    if (!v.startsWith('JIBUN1.')) { say('コードの形式が違います。「JIBUN1.」で始まるコードを貼り付けてください。'); return; }
    try {
      const o = JSON.parse(b64d(v.slice(7)));
      const s = Array.isArray(o.s) ? o.s.filter((id) => typeof id === 'string' && svcById[id]) : [];
      const d = (o.d && typeof o.d === 'object' && !Array.isArray(o.d)) ? o.d : {};
      const cleanDone = {};
      for (const [k, val] of Object.entries(d)) if (typeof k === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(String(val))) cleanDone[k] = String(val);
      selected = new Set(s); done = cleanDone;
      save(LS.services, [...selected]); save(LS.done, done);
      renderServices(); renderTodo();
      say(`読み込みました（サービス ${selected.size}件）。`, true);
    } catch { say('コードを読み込めませんでした。'); }
  });
  document.getElementById('reset').addEventListener('click', () => {
    if (!confirm('この端末に保存した選択と完了状態を消します。よろしいですか？')) return;
    remove(LS.services); remove(LS.done); remove(LS.lastVisit);
    selected = new Set(); done = {}; codeEl.value = '';
    renderServices(); renderTodo();
    say('この端末の記録を消しました。', true);
  });

  // ---------- 初期化
  if (addedByLink.length) {
    const names = addedByLink.map((id) => svcById[id].name).join('、');
    const box = document.getElementById('link-notice');
    box.textContent = `リンクから「${names}」を選択に追加しました。使っていない場合はチェックを外してください。`;
    box.classList.remove('hidden');
  }
  renderServices();
  renderTodo();
  // 「新着」判定は描画時の lastVisit を使い、描画後に今日を記録する
  save(LS.lastVisit, today);
})();
