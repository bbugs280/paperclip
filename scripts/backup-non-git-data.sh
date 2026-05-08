#!/usr/bin/env bash
# Backup all non-git data (config, company state, database, secrets)
# Designed to protect against accidental AI modifications
# Usage: ./scripts/backup-non-git-data.sh [backup_dir] [compress]

set -euo pipefail

BACKUP_BASE="${1:-.backups}"
COMPRESS="${2:-true}"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_DIR="$BACKUP_BASE/paperclip-$TIMESTAMP"

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

echo "📦 Starting non-git data backup..."
echo "   Target: $BACKUP_DIR"
echo ""

# ═══════════════════════════════════════════════════════════════
# CRITICAL DATA (smallest, fastest to restore, most important)
# ═══════════════════════════════════════════════════════════════

echo "🔐 Backing up CRITICAL data (secrets, config)..."

mkdir -p "$BACKUP_DIR/critical"

# 1. Secrets (encryption key - absolutely required for recovery)
if [[ -d ~/.paperclip/instances/default/secrets ]]; then
  cp -r ~/.paperclip/instances/default/secrets "$BACKUP_DIR/critical/"
  echo "  ✓ Secrets"
fi

# 2. Instance config
if [[ -f ~/.paperclip/instances/default/.env ]]; then
  cp ~/.paperclip/instances/default/.env "$BACKUP_DIR/critical/"
  echo "  ✓ Instance config"
fi

# 3. Repo-level config
if [[ -f "$PROJECT_ROOT/.env" ]]; then
  cp "$PROJECT_ROOT/.env" "$BACKUP_DIR/critical/"
  echo "  ✓ Repo config"
fi

# ═══════════════════════════════════════════════════════════════
# DATABASE (226MB - critical for all app state)
# ═══════════════════════════════════════════════════════════════

echo ""
echo "💾 Backing up DATABASE..."

mkdir -p "$BACKUP_DIR/database"

if [[ -d ~/.paperclip/instances/default/db ]]; then
  # Stop any running db connections first (graceful pause if service is running)
  if command -v ./paperclip-service.sh &>/dev/null; then
    ./paperclip-service.sh pause 2>/dev/null || true
  fi
  
  # Tar the database (preserve all PostgreSQL internals)
  tar -czf "$BACKUP_DIR/database/db.tar.gz" \
    -C ~/.paperclip/instances/default db/ \
    2>/dev/null || {
    echo "  ⚠ DB still in use (running), doing best-effort copy..."
    cp -r ~/.paperclip/instances/default/db "$BACKUP_DIR/database/" || true
  }
  
  echo "  ✓ Database"
fi

# ═══════════════════════════════════════════════════════════════
# COMPANY & AGENT STATE (AI-managed, prone to corruption)
# ═══════════════════════════════════════════════════════════════

echo ""
echo "🏢 Backing up COMPANY & AGENT STATE (AI-managed)..."

mkdir -p "$BACKUP_DIR/company-state"

if [[ -d ~/.paperclip/instances/default/companies ]]; then
  tar -czf "$BACKUP_DIR/company-state/companies.tar.gz" \
    -C ~/.paperclip/instances/default companies/
  echo "  ✓ Companies (agent instructions, scripts, generated docs)"
fi

# ═══════════════════════════════════════════════════════════════
# FILE STORAGE & DATA (5.2GB - user uploads, AI-generated content)
# ═══════════════════════════════════════════════════════════════

echo ""
echo "📁 Backing up FILE STORAGE..."

mkdir -p "$BACKUP_DIR/storage"

if [[ -d ~/.paperclip/instances/default/data ]]; then
  # File storage can be large - tar it for compression
  tar -czf "$BACKUP_DIR/storage/data.tar.gz" \
    -C ~/.paperclip/instances/default data/
  STORAGE_SIZE=$(du -sh "$BACKUP_DIR/storage/data.tar.gz" | cut -f1)
  echo "  ✓ File storage ($STORAGE_SIZE compressed)"
fi

# ═══════════════════════════════════════════════════════════════
# OTHER STATE (workspaces, projects, runtime services)
# ═══════════════════════════════════════════════════════════════

echo ""
echo "⚙️  Backing up OTHER STATE..."

mkdir -p "$BACKUP_DIR/state"

for dir in workspaces projects runtime-services skills; do
  if [[ -d ~/.paperclip/instances/default/$dir ]]; then
    tar -czf "$BACKUP_DIR/state/$dir.tar.gz" \
      -C ~/.paperclip/instances/default $dir/
    echo "  ✓ $dir"
  fi
done

# ═══════════════════════════════════════════════════════════════
# CUSTOM PLUGINS & TOOLS (user-installed adapters)
# ═══════════════════════════════════════════════════════════════

echo ""
echo "🔌 Backing up CUSTOM PLUGINS & TOOLS..."

mkdir -p "$BACKUP_DIR/extensions"

for dir in adapter-plugins plugins tools; do
  if [[ -d ~/.paperclip/$dir && $(find ~/.paperclip/$dir -type f | wc -l) -gt 0 ]]; then
    # Skip node_modules for size
    tar -czf "$BACKUP_DIR/extensions/$dir.tar.gz" \
      -C ~/.paperclip \
      --exclude='node_modules' \
      $dir/ 2>/dev/null || true
    echo "  ✓ $dir"
  fi
done

# ═══════════════════════════════════════════════════════════════
# METADATA & RESTORE INFO
# ═══════════════════════════════════════════════════════════════

echo ""
echo "📋 Creating backup manifest..."

cat > "$BACKUP_DIR/BACKUP_INFO.txt" << EOF
Paperclip Non-Git Data Backup
==============================

Timestamp: $TIMESTAMP
Location: $BACKUP_DIR
Compress: $COMPRESS

CONTENTS:

[CRITICAL] - Restore FIRST
  - secrets/               Master encryption key (REQUIRED)
  - critical/.env         Configuration files

[DATABASE] - Restore SECOND
  - database/db.tar.gz    PostgreSQL database (226MB)
                          Contains all app state (issues, tasks, companies, agents)

[COMPANY STATE] - Restore THIRD (AI-managed, risk of corruption)
  - company-state/        Agent instructions, shared scripts, generated documents
  
[FILE STORAGE] - Restore FOURTH (5.2GB compressed)
  - storage/              User uploads, AI-generated content

[OTHER STATE]
  - state/                Workspaces, projects, runtime services, skills

[EXTENSIONS]
  - extensions/           Custom adapters, plugins, tools

RESTORE PROCEDURE:
  1. Run: ./scripts/restore-non-git-data.sh $BACKUP_DIR
  2. Or manually: tar -xzf database/db.tar.gz -C ~/.paperclip/instances/default
  3. Review: Check that secrets/master.key exists after restore

APPROXIMATE SIZE:
  - Critical: < 100KB
  - Database: ~226MB (compressed: ~50MB)
  - Company state: ~500KB
  - File storage: ~5.2GB (compressed: varies)
  - Total uncompressed: ~5.5GB

EOF

TOTAL_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)

# ═══════════════════════════════════════════════════════════════
# FINAL REPORT
# ═══════════════════════════════════════════════════════════════

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Backup complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Backup location: $BACKUP_DIR"
echo "Total size: $TOTAL_SIZE"
echo ""
echo "To restore:"
echo "  ./scripts/restore-non-git-data.sh $BACKUP_DIR"
echo ""
echo "To verify backup integrity:"
echo "  tar -tzf $BACKUP_DIR/database/db.tar.gz | head -5"
echo "  tar -tzf $BACKUP_DIR/company-state/companies.tar.gz | head -5"
echo ""
