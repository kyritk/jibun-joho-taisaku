#!/usr/bin/env bash
# GitHub 側の初期設定（1回だけ実行）。公開リポジトリの作成、Pages の有効化、push、ブランチ保護、脆弱性報告の受付。
# 前提：gh auth login 済み（scopes: repo, workflow）。リポジトリ直下で実行する。
set -euo pipefail
OWNER="${OWNER:-kyritk}"
REPO="${REPO:-jibun-joho-taisaku}"

echo "1/5 公開リポジトリを作成（Pages 無料プランの条件）"
gh repo create "$OWNER/$REPO" --public --source=. --remote=origin \
  --description "じぶんの情報対策 — 使っているサービスの漏洩と、やることだけ"

echo "2/5 GitHub Pages を Actions 配信で有効化（push より先に行う。deploy ワークフローが configure-pages で失敗しないように）"
gh api -X POST "repos/$OWNER/$REPO/pages" -f build_type=workflow >/dev/null || \
gh api -X PUT  "repos/$OWNER/$REPO/pages" -f build_type=workflow >/dev/null

echo "3/5 main を push（deploy ワークフローが起動する）"
git push -u origin main

echo "4/5 ブランチ保護：PR必須（レビュー数0）、CI必須、force push・削除禁止、管理者にも適用"
gh api -X PUT "repos/$OWNER/$REPO/branches/main/protection" --input - <<'JSON' >/dev/null
{
  "required_status_checks": { "strict": true, "contexts": ["validate-and-build"] },
  "enforce_admins": true,
  "required_pull_request_reviews": null,
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "required_linear_history": true,
  "required_conversation_resolution": false
}
JSON

echo "5/5 脆弱性の非公開報告を受け付ける（SECURITY.md の報告先）"
gh api -X PUT "repos/$OWNER/$REPO/private-vulnerability-reporting" >/dev/null

echo "完了。デプロイの状況: gh run watch  /  公開URL: https://$OWNER.github.io/$REPO/"
echo "残る手動設定：GitHub アカウントの2要素認証（Settings → Password and authentication）"
