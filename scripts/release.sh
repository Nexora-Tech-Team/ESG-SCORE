#!/usr/bin/env bash
#
# Release helper for ESG Score.
#
# Bumps the version in frontend/package.json, records changes into VERSION.md
# from the Conventional Commits made since the last git tag, then creates a
# release commit and a git tag vX.Y.Z. It does NOT push (do that yourself).
#
# Usage (from frontend/):  npm run release -- [patch|minor|major]
#        or (from root):   bash scripts/release.sh [patch|minor|major]
# Default bump level: patch.
#
set -euo pipefail

BUMP="${1:-patch}"
case "$BUMP" in
  patch|minor|major) ;;
  *) echo "Usage: release.sh [patch|minor|major]" >&2; exit 1 ;;
esac

# Repo root = parent of this script's directory.
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PKG="$ROOT/frontend/package.json"
CHANGELOG="$ROOT/VERSION.md"

if [ -n "$(git -C "$ROOT" status --porcelain)" ]; then
  echo "✗ Working tree tidak bersih. Commit/stash dulu sebelum rilis." >&2
  exit 1
fi

# Compute next version from the current package.json version.
CUR="$(node -p "require('$PKG').version")"
IFS='.' read -r MA MI PA <<< "$CUR"
case "$BUMP" in
  major) MA=$((MA + 1)); MI=0; PA=0 ;;
  minor) MI=$((MI + 1)); PA=0 ;;
  patch) PA=$((PA + 1)) ;;
esac
NEW="$MA.$MI.$PA"

# Commit range: since the last tag, or the whole history if there is none.
LAST_TAG="$(git -C "$ROOT" describe --tags --abbrev=0 2>/dev/null || true)"
RANGE="${LAST_TAG:+$LAST_TAG..}HEAD"

echo "→ Rilis v$CUR → v$NEW (bump: $BUMP)"
echo "→ Merangkum commit: ${LAST_TAG:-<awal>} .. HEAD"

# Group Conventional Commit subjects by type.
added=""; fixed=""; changed=""
while IFS= read -r s; do
  [ -z "$s" ] && continue
  case "$s" in
    chore\(release\)*|chore:\ release*) continue ;;
    feat:*|feat\(*\)*)  added+="- ${s}"$'\n' ;;
    fix:*|fix\(*\)*)    fixed+="- ${s}"$'\n' ;;
    *)                  changed+="- ${s}"$'\n' ;;
  esac
done < <(git -C "$ROOT" log --no-merges --pretty=format:'%s' $RANGE)

if [ -z "$added$fixed$changed" ]; then
  echo "✗ Tidak ada commit baru sejak ${LAST_TAG:-awal}. Batal." >&2
  exit 1
fi

# Build the new changelog section into a temp file.
SEC="$(mktemp)"
{
  echo "## [$NEW] - $(date +%F)"
  [ -n "$added" ]   && { echo; echo "### Added";   echo; printf '%s' "$added"; }
  [ -n "$fixed" ]   && { echo; echo "### Fixed";   echo; printf '%s' "$fixed"; }
  [ -n "$changed" ] && { echo; echo "### Changed"; echo; printf '%s' "$changed"; }
} > "$SEC"

# Insert the section right after the <!-- RELEASES --> anchor in VERSION.md.
TMP="$(mktemp)"
awk -v f="$SEC" '
  { print }
  /<!-- RELEASES -->/ && !done {
    print ""
    while ((getline line < f) > 0) print line
    done = 1
  }
' "$CHANGELOG" > "$TMP"
mv "$TMP" "$CHANGELOG"
rm -f "$SEC"

# Bump package.json (and package-lock.json) without letting npm tag/commit.
( cd "$ROOT/frontend" && npm version "$NEW" --no-git-tag-version >/dev/null )

# Release commit + tag.
git -C "$ROOT" add "$CHANGELOG" frontend/package.json frontend/package-lock.json 2>/dev/null || \
  git -C "$ROOT" add "$CHANGELOG" frontend/package.json
git -C "$ROOT" commit -q -m "chore(release): v$NEW"
git -C "$ROOT" tag "v$NEW"

echo "✓ Rilis v$NEW siap."
echo "  Push:  git push && git push origin v$NEW"
