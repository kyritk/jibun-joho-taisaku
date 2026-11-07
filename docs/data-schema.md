# データスキーマ

すべて UTF-8 の JSON。日付は `YYYY-MM-DD`。利用者向けの文言は日本語。
承認前の事案は `data/incidents/drafts/`、承認後は `data/incidents/approved/` に置く（ファイル名は `<id>.json`）。

## 1. 漏れた情報の種類（leaked_info_types のキー）

事案が持つ「漏れた情報」は次の細かいキーで記録する。やることカードは `data/cards.json` の `info_types[].matches` でこのキーに対応づける。

| キー | 意味 | 対応するカード群（info_types.key） |
| --- | --- | --- |
| `credentials` | ID・パスワード（ハッシュ化含む。会社が「漏れていない」と明記した場合は含めない） | `credentials` |
| `credit_card` | クレジットカード番号・有効期限・セキュリティコード | `credit_card` |
| `email` / `phone` / `address` / `name` / `birthdate` | 連絡先・氏名・生年月日 | `contact` |
| `id_document_image` | 運転免許証など本人確認書類の画像 | `id_document` |
| `bank_account` | 銀行口座番号など | `bank_account` |
| `my_number` | マイナンバー | `my_number` |
| `financial_assets` / `family_composition` | 資産状況・家族構成 | `assets_family` |
| `medical` | 病歴・診療の情報 | `medical` |
| `credit_card_partial` | カード番号の一部（下4桁など）・名義・有効期限のみ。全桁・セキュリティコードは含まれない | なし（事案ページに表示のみ。要判断） |
| `purchase_history` | 購入履歴・利用履歴（カードは無し。事案ページに表示のみ） | なし |
| `other` | その他（`other_info_detail` に内容を書く） | なし |

`announcements[].changes` に使う値：`status:<前>-><後>`、`info_added:<key>`、`info_removed:<key>`（訂正で対象外になった）、`count_update`（件数の訂正・確定）。

## 2. 事案（data/incidents/*/<id>.json）

```jsonc
{
  "id": "timescar-2026-09",            // 英小文字・数字・ハイフン。<サービス>-<年>-<月>
  "service_ids": ["timescar"],         // data/services.json の id。複数可（委託先経由で複数サービスに及ぶ場合）
  "service_name": "タイムズカー",       // 利用者が認識している通称
  "operator": "タイムズモビリティ株式会社（パーク24グループ）",
  "status": "confirmed",               // suspected | confirmed | individually_notified | denied
  "leaked_info_types": ["id_document_image", "name", "address"],
  "limited_info_types": {              // ごく一部の人だけが対象の情報（数十件以下で、会社が個別連絡済み）。
    "credit_card_partial": "28件のみ。該当する方には会社から個別に連絡"  // ここに入れたキーはカードを出さず、1行の注記だけ表示する
  },
  "other_info_detail": "",
  "counts": {
    "headline": 6600000,               // 見出しに使う数。会社の公表値。不明なら null
    "wording": "約660万アカウント（うち本人確認書類画像約160万件）", // 会社の言い回しをそのまま
    "breakdown": ""
  },
  "card_not_leaked_stated": true,      // 会社が「クレジットカード情報は漏えいしていない」と明記したか。null=言及なし
  "announcements": [                   // 公表の時系列。先頭が第1報
    {
      "date": "2026-09-28",
      "type": "first",                 // first | update | final | retraction
      "url": "https://...",            // 企業の公式発表URL。まとめサイトは不可
      "title": "不正アクセスによる個人情報漏えいに関するお知らせ",
      "facts": "・会員情報約660万件が対象\n・本人確認書類画像約160万件を含む", // 事実項目のみ。文章の転載禁止
      "changes": ["status:suspected->confirmed", "info_added:id_document_image"] // 第2報以降で何が変わったか
    }
  ],
  "official_contact": { "phone": "", "url": "" }, // 公式発表に書かれた問い合わせ先だけ。通知メール由来は不可
  "review": {
    "approved": false,                 // approved/ に移すときに true にする
    "approved_on": null,
    "approved_by": null,
    "notes": "確認時のメモ"
  },
  "first_published": "2026-09-28",     // 第1報の日付（並び順・未読判定に使う）
  "last_updated": "2026-10-07"         // 最新の公表日
}
```

### 一部の人だけが対象の情報（limited_info_types）

決定（2026-11-07）：漏れた情報のうち、**件数が数十件以下で、会社が該当者に個別連絡済み**のものは、全利用者向けのカードを出さない。
代わりに事案ページに「ごく一部の方だけが対象：銀行口座（16件）。該当する方には会社から個別に連絡があります」と1行だけ表示する。
`limited_info_types` に入れたキーは `leaked_info_types` にも残す（事実としては漏れている）が、カードの対応づけから除外する。
数千件以上（skyticket のカード情報 6,140名など）は通常どおりカードを出す。

### 続報による「カードの未完了への戻し」

- `announcements[].changes` に `info_added:<key>` があれば、そのキーに対応するカード群が未完了に戻る。
- `status:suspected->confirmed` があれば、`reopen_on_confirm: true` のカードだけが未完了に戻る。
- `status:*->denied` の場合は事案を「取り下げ」として表示し、カードは表示しない（Git履歴が訂正履歴になる）。

## 3. やることカード（data/cards.json）

- `always_first_card`：どの事案でも先頭に出すカード。`{service}` がサービス名に置換される。
- `info_types[]`：漏れた情報の種類ごとのカード群。
  - `matches`：上の表のキー。事案の `leaked_info_types` に1つでも含まれれば表示。
  - `urgency`：やることの並び順（1が最優先。カード・口座・本人確認書類・マイナンバー=1、パスワード=2、連絡先=3、その他=4）。
  - `cards[]`：1カード1行動。`title`（行動）、`reason`（その行動が必要な理由、1文）、`detail`（やり方）、`minutes`（所要時間の目安）、`contact` / `contact_list`（`official_contacts` のキー）、`sources`（`sources` のキー）、`reopen_on_confirm`。
  - 文言：外来語（ログイン／アカウント／インストール／アップデート／ダークウェブ／ハッカー）は避ける。検証で警告になる。
  - `skip_if[]`：やらなくていいこと。
  - `needs_research`：公的根拠が足りない種別。モックでは「調査中」と明示する。
- `official_contacts`：表示してよい電話番号・URL。`verified_on` が null のものは公開前に要確認。
- `sources`：根拠。`verified_on` が null のものは公開前に要確認。

## 4. サービスマスタ（data/services.json）

```jsonc
{
  "id": "timescar",
  "name": "タイムズカー",                 // 通称（利用者が認識している呼び名）
  "operator": "タイムズモビリティ株式会社",
  "category": "mobility",               // categories[] の key
  "aliases": ["タイムズカーシェア", "Times Car", "たいむず"], // 検索の別名。ひらがな・略称を含める
  "popular_rank": 3,                    // 「よく使われているサービス」の固定順（任意。10件まで）
  "password_change_url": null,          // 公式のパスワード変更ページ。開発者が確認したものだけ
  "official_contact_phone": null,       // 公式の問い合わせ番号。同上
  "verified_on": null
}
```

## 5. 公開JSON（ビルド生成。MVPで配信するもの）

`scripts/build-mock.mjs` が approved の事案・cards・services を1つにまとめて `mock/index.html` に埋め込む。
フェーズ1では同じ処理で `public/data.json` を生成し、GitHub Pages から配信する。
