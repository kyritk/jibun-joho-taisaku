// データの整合性チェック。 node scripts/validate.mjs
// cards.json / services.json / incidents/{drafts,approved}/*.json を読み、スキーマ（docs/data-schema.md）と参照整合性を確認する。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));

const errors = [];
const warns = [];
const err = (m) => errors.push(m);
const warn = (m) => warns.push(m);

const INFO_KEYS = new Set(['credentials', 'password', 'credit_card', 'credit_card_partial', 'email', 'phone', 'address', 'name', 'birthdate',
  'id_document_image', 'bank_account', 'my_number', 'financial_assets', 'family_composition', 'medical', 'purchase_history', 'other']);
const STATUS = new Set(['suspected', 'confirmed', 'individually_notified', 'denied']);
const ANN_TYPES = new Set(['first', 'update', 'final', 'retraction']);
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const ID = /^[a-z0-9-]+$/;

// ---- official-domains.json（表示してよいURLのホスト許可リスト。docs/threat-model.md T1）
const domains = read('data/official-domains.json');
const allowedHosts = new Map(domains.hosts.map((h) => [h.host, h]));
const checkUrl = (u, where, { allowMedia = false } = {}) => {
  if (!u) return;
  let parsed;
  try { parsed = new URL(u); } catch { err(`${where}: URL が不正 "${u}"`); return; }
  if (parsed.protocol !== 'https:') err(`${where}: URL は https のみ "${u}"`);
  const entry = allowedHosts.get(parsed.hostname);
  if (!entry) { err(`${where}: 許可リストに無いホスト "${parsed.hostname}"（data/official-domains.json に理由付きで追加するか、URLを公式のものに差し替える）`); return; }
  if (entry.kind === 'media' && !allowMedia) err(`${where}: 報道のURLは事案・窓口には使えない "${u}"`);
};

// ---- assets/icons（アイコンID。絵文字や外部画像は使わない。docs/ux-visual-research.md 6章）
const iconIds = new Set(fs.readdirSync(path.join(root, 'assets', 'icons')).filter((f) => f.endsWith('.svg')).map((f) => f.slice(0, -4)));
const checkIcon = (id, where) => { if (typeof id !== 'string' || !/^[a-z0-9-]+$/.test(id)) err(`${where}: icon はアイコンID（英小文字・数字・ハイフン）"${id}"`); else if (!iconIds.has(id)) err(`${where}: assets/icons/${id}.svg が無い`); };

// ---- cards.json
const cards = read('data/cards.json');
for (const [k, s] of Object.entries(cards.sources)) checkUrl(s.url, `sources/${k}`, { allowMedia: true });
for (const [k, c] of Object.entries(cards.official_contacts)) if (!k.startsWith('_')) checkUrl(c.url, `official_contacts/${k}`);
const sourceKeys = new Set(Object.keys(cards.sources));
const contactKeys = new Set(Object.keys(cards.official_contacts).filter((k) => !k.startsWith('_')));
const cardIds = new Set();
const checkCard = (c, where) => {
  if (!c.id || cardIds.has(c.id)) err(`${where}: card id が無いか重複 (${c.id})`);
  cardIds.add(c.id);
  if (!c.title || !c.detail) err(`${where}/${c.id}: title/detail が必要`);
  if (!Array.isArray(c.sources) || c.sources.length === 0) err(`${where}/${c.id}: sources が空（根拠の無い行動は書かない）`);
  for (const s of c.sources || []) if (!sourceKeys.has(s)) err(`${where}/${c.id}: 未定義の source "${s}"`);
  if (c.contact && !contactKeys.has(c.contact)) err(`${where}/${c.id}: 未定義の contact "${c.contact}"`);
  for (const k of c.contact_list || []) if (!contactKeys.has(k)) err(`${where}/${c.id}: 未定義の contact "${k}"`);
  if (typeof c.reopen_on_confirm !== 'boolean') err(`${where}/${c.id}: reopen_on_confirm は boolean`);
  if (c.scope !== 'once' && c.scope !== 'service') err(`${where}/${c.id}: scope は "once"（1回で全事案に効く）か "service"（サービスごと）`);
  if (typeof c.renew_on_new_incident !== 'boolean') err(`${where}/${c.id}: renew_on_new_incident は boolean`);
  if (c.scope === 'service' && c.renew_on_new_incident) err(`${where}/${c.id}: service のカードに renew_on_new_incident は使わない`);
  if (c.scope === 'once' && /\{service\}/.test(c.title)) err(`${where}/${c.id}: once のカードの title には {service} ではなく {services} を使う`);
  if (!c.reason || typeof c.reason !== 'string') err(`${where}/${c.id}: reason（理由1文）が必要`);
  if (!Number.isInteger(c.minutes) || c.minutes < 1) err(`${where}/${c.id}: minutes（所要時間の目安、分）が必要`);
  if (c.steps !== undefined && (!Array.isArray(c.steps) || !c.steps.length || c.steps.some((s) => typeof s !== 'string' || !s))) err(`${where}/${c.id}: steps は空でない文字列の配列`);
  if (c.dont !== undefined && (typeof c.dont !== 'string' || !c.dont)) err(`${where}/${c.id}: dont は文字列`);
  if (c.icon !== undefined) checkIcon(c.icon, `${where}/${c.id}`);
  // 対象は非ITの社会人（CLAUDE.md 文体）：ログイン・アカウント・インストール等は通じるのでそのまま使う。説明なしでは伝わらない語だけ警告する
  if (/(ダークウェブ|ハッカー|クレデンシャル|フィッシング(?!（))/.test(c.title + c.detail + c.reason + (c.steps || []).join('') + (c.dont || ''))) warn(`${where}/${c.id}: 初出で説明が必要な語を含む（ダークウェブ／ハッカー／クレデンシャル／説明のないフィッシング）`);
};
checkCard(cards.always_first_card, 'always_first_card');
const matchedKeys = new Set();
for (const t of cards.info_types) {
  if (!t.key || !t.label) err(`info_types: key/label が必要`);
  for (const m of t.matches || []) {
    if (!INFO_KEYS.has(m)) err(`info_types/${t.key}: 未知の matches キー "${m}"`);
    if (matchedKeys.has(m)) err(`info_types/${t.key}: matches "${m}" が他の種別と重複`);
    matchedKeys.add(m);
  }
  if (!Array.isArray(t.cards) || t.cards.length === 0) err(`info_types/${t.key}: cards が空`);
  if (!Number.isInteger(t.urgency) || t.urgency < 1) err(`info_types/${t.key}: urgency（1が最優先）が必要`);
  checkIcon(t.icon, `info_types/${t.key}`);
  for (const c of t.cards || []) checkCard(c, `info_types/${t.key}`);
}
for (const [k, s] of Object.entries(cards.sources)) if (!s.verified_on) warn(`source "${k}" は未確認（verified_on が null）。公開前に原文を確認`);
for (const k of contactKeys) if (!cards.official_contacts[k].verified_on) warn(`official_contact "${k}" は未確認（verified_on が null）。公開前に公式で確認`);

// ---- services.json
const services = read('data/services.json');
const catKeys = new Set(services.categories.map((c) => c.key));
for (const c of services.categories) { if (!/^[a-z]+$/.test(c.key || '')) err(`categories: key が不正 "${c.key}"`); checkIcon(c.icon, `categories/${c.key}`); }
const serviceIds = new Set();
for (const s of services.services) {
  checkUrl(s.password_change_url, `services/${s.id}: password_change_url`);
  if (!ID.test(s.id || '')) err(`services: id が不正 "${s.id}"`);
  if (serviceIds.has(s.id)) err(`services: id 重複 "${s.id}"`);
  serviceIds.add(s.id);
  if (!s.name || !s.operator) err(`services/${s.id}: name/operator が必要`);
  if (!catKeys.has(s.category)) err(`services/${s.id}: 未知の category "${s.category}"`);
  if (s.popular_rank !== undefined && (!Number.isInteger(s.popular_rank) || s.popular_rank < 1)) err(`services/${s.id}: popular_rank は1以上の整数`);
  if (!Array.isArray(s.aliases)) err(`services/${s.id}: aliases は配列`);
}
{
  const ranks = services.services.filter((s) => s.popular_rank).map((s) => s.popular_rank);
  if (new Set(ranks).size !== ranks.length) err('services: popular_rank が重複');
  if (ranks.length > 10) warn(`services: popular_rank が ${ranks.length} 件。1画面に見せる候補は6〜10件が目安`);
}

// ---- incidents
const checkIncidentDir = (dir, mustBeApproved) => {
  const full = path.join(root, 'data', 'incidents', dir);
  if (!fs.existsSync(full)) return 0;
  const files = fs.readdirSync(full).filter((f) => f.endsWith('.json'));
  const seen = new Set();
  for (const f of files) {
    const where = `${dir}/${f}`;
    let inc;
    try { inc = JSON.parse(fs.readFileSync(path.join(full, f), 'utf8')); } catch (e) { err(`${where}: JSON parse 失敗 ${e.message}`); continue; }
    if (!ID.test(inc.id || '')) err(`${where}: id が不正`);
    if (f !== inc.id + '.json') err(`${where}: ファイル名は <id>.json`);
    if (seen.has(inc.id)) err(`${where}: id 重複`);
    seen.add(inc.id);
    if (!Array.isArray(inc.service_ids) || inc.service_ids.length === 0) err(`${where}: service_ids が空`);
    for (const sid of inc.service_ids || []) if (!serviceIds.has(sid)) err(`${where}: services.json に無い service_id "${sid}"`);
    if (!inc.service_name || !inc.operator) err(`${where}: service_name/operator が必要`);
    if (!STATUS.has(inc.status)) err(`${where}: 不正な status "${inc.status}"`);
    for (const k of inc.leaked_info_types || []) if (!INFO_KEYS.has(k)) err(`${where}: 未知の leaked_info_type "${k}"`);
    if ((inc.leaked_info_types || []).includes('other') && !inc.other_info_detail) warn(`${where}: other があるのに other_info_detail が空`);
    if (inc.limited_info_types !== undefined) {
      if (typeof inc.limited_info_types !== 'object' || Array.isArray(inc.limited_info_types)) err(`${where}: limited_info_types は {key: 注記} の形`);
      else for (const [k, v] of Object.entries(inc.limited_info_types)) {
        if (!(inc.leaked_info_types || []).includes(k)) err(`${where}: limited_info_types の "${k}" は leaked_info_types にも入れる`);
        if (typeof v !== 'string' || !v) err(`${where}: limited_info_types["${k}"] の注記が空`);
      }
    }
    if (!inc.counts || typeof inc.counts.wording !== 'string') err(`${where}: counts.wording が必要`);
    if (!Array.isArray(inc.announcements) || inc.announcements.length === 0) err(`${where}: announcements が空`);
    let prev = '';
    (inc.announcements || []).forEach((a, i) => {
      if (!DATE.test(a.date || '')) err(`${where}: announcements[${i}].date が不正`);
      if (!ANN_TYPES.has(a.type)) err(`${where}: announcements[${i}].type が不正 "${a.type}"`);
      if (!/^https:\/\//.test(a.url || '')) err(`${where}: announcements[${i}].url は https の公式URL`);
      checkUrl(a.url, `${where}: announcements[${i}]`);
      // 自由記述（facts）の中の URL も許可リストのホストだけ（文字として表示されても利用者がコピーして開く）
      for (const u of String(a.facts || '').match(/https?:\/\/[^\s）」、]+/g) || []) checkUrl(u, `${where}: announcements[${i}].facts`);
      if (i === 0 && a.type !== 'first') err(`${where}: 先頭の announcement は type "first"`);
      if (a.date < prev) err(`${where}: announcements は日付順に並べる`);
      prev = a.date;
      for (const ch of a.changes || []) {
        if (!/^(status:[a-z_]+->[a-z_]+|info_added:[a-z_]+|info_removed:[a-z_]+|count_update)$/.test(ch)) err(`${where}: 不正な changes "${ch}"`);
        const m = ch.match(/^info_(added|removed):(.+)$/);
        if (m && !INFO_KEYS.has(m[2])) err(`${where}: changes のキーが未知 "${m[2]}"`);
      }
    });
    if (inc.official_contact) checkUrl(inc.official_contact.url, `${where}: official_contact`);
    if (!DATE.test(inc.first_published || '') || !DATE.test(inc.last_updated || '')) err(`${where}: first_published/last_updated が必要`);
    if (!inc.review || typeof inc.review.approved !== 'boolean') err(`${where}: review.approved が必要`);
    if (mustBeApproved && !inc.review.approved) err(`${where}: approved/ にあるのに review.approved が false`);
    if (mustBeApproved && !inc.review.approved_on) err(`${where}: approved/ には approved_on が必要`);
    if (!mustBeApproved && inc.review.approved) warn(`${where}: approved なのに drafts/ にある。approved/ へ移す`);
    if (/未検証|unverified/.test(JSON.stringify(inc)) ) warn(`${where}: 「未検証」を含む。承認前に必ず原文確認`);
  }
  return files.length;
};
const nDrafts = checkIncidentDir('drafts', false);
const nApproved = checkIncidentDir('approved', true);

// ---- report
for (const w of warns) console.log('WARN ', w);
for (const e of errors) console.log('ERROR', e);
console.log(`\ncards: ${cardIds.size} 枚 / services: ${serviceIds.size} 件 / incidents: approved ${nApproved}, drafts ${nDrafts} / warnings ${warns.length} / errors ${errors.length}`);
process.exit(errors.length ? 1 : 0);
