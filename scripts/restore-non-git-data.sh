#!/usr/bin/env bash
# Restore non-git data from a backup directory
# Usage: ./scripts/restore-non-git-data.sh <backup_dir> [--force]

set -euo pipefail

if [[ -z "${1:-}" ]]; then
  echo "Usage: ./scripts/restore-non-git-data.sh <backup_dir> [--force]"
  echo ""
  echo "Options:"
  echo "  backup_dir  Path to backup directory (e.g., .backups/paperclip-20260501-120000)"
  echo "  --force     Skip confirmation prompt"
  echo ""
  echo "Example:"
  echo "  ./scripts/restore-non-git-data.sh .backups/paperclip-20260501-120000"
  exit 1
fi

BACKUP_DIR="$1"
FORCE="${2:-}"

if [[ ! -d "$BACKUP_DIR" ]]; then
  echo "❌ Backup directory not found: $BACKUP_DIR"
  exit 1
fi

if [[ ! -f "$BACKUP_DIR/BACKUP_INFO.txt" ]]; then
  echo "❌ Not a valid backup directory (missing BACKUP_INFO.txt)"
  exit 1
fi

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

# ═══════════════════════════════════════════════════════════════
# SAFETY CHECKS
# ═══════════════════════════════════════════════════════════════

echo "⚠️  RESTORE WARNING"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "This will restore non-git data from:"
echo "  $BACKUP_DIR"
echo ""
echo "The following will be OVERWRITTEN:"
echo "  - ~/.paperclip/instances/default/secrets/"
echo "  - ~/.paperclip/instances/default/db/"
echo "  - ~/.paperclip/instances/default/companies/"
echo "  - ~/.paperclip/instances/default/data/"
echo "  - ~/.paperclip/instances/default/workspaces/"
echo "  - ~/.paperclip/instances/default/projects/"
echo "  - ~/.paperclip/instances/default/runtime-services/"
echo "  - ~/.paperclip/instances/default/skills/"
echo ""

if [[ "$FORCE" != "--force" ]]; then
  read -p "Continue? (type 'yes' to confirm): " CONFIRM
  if [[ "$CONFIRM" != "yes" ]]; then
    echo "Restore cancelled."
    exit 0
  fi
fi

# ═══════════════════════════════════════════════════════════════
# BACKUP CURRENT STATE (safety net)
# ═══════════════════════════════════════════════════════════════

echo ""
echo "🔄 Creating safety backup of current state..."

CURRENT_BACKUP="$PROJECT_ROOT/.backups/pre-restore-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$CURRENT_BACKUP"

# Quick backup of critical files
for file in ~/.paperclip/instances/default/.env; do
  if [[ -f "$file" ]]; then
    cp "$file" "$CURRENT_BACKUP/" 2>/dev/null || true
  fi
done

echo "  ✓ Safety backup created: $CURRENT_BACKUP"

# ═══════════════════════════════════════════════════════════════
# PAUSE SERVICE
# ═══════════════════════════════════════════════════════════════

echo ""
echo "⏸  Pausing Paperclip service..."

if command -v ./paperclip-service.sh &>/dev/null; then
  ./paperclip-service.sh pause 2>/dev/null || true
fi

# Kill any running processes
pkill -f "paperclip" 2>/dev/null || true
sleep 2

echo "  ✓ Service paused"

# ═══════════════════════════════════════════════════════════════
# RESTORE CRITICAL DATA FIRST
# ═══════════════════════════════════════════════════════════════

echo ""
echo "🔐 Restoring CRITICAL data (secrets, config)..."

if [[ -d "$BACKUP_DIR/critical/secrets" ]]; then
  rm -rf ~/.paperclip/instances/default/secrets
  cp -r "$BACKUP_DIR/critical/secrets" ~/.paperclip/instances/default/
  echo "  ✓ Secrets restored"
else
  echo "  ⚠ No secrets found in backup"
fi

if [[ -f "$BACKUP_DIR/critical/.env" ]]; then
  cp "$BACKUP_DIR/critical/.env" ~/.paperclip/instances/default/.env
  echo "  ✓ Instance config restored"
fi

# ═══════════════════════════════════════════════════════════════
# RESTORE DATABASE
# ═══════════════════════════════════════════════════════════════

echo ""
echo "💾 Restoring DATABASE..."

if [[ -f "$BACKUP_DIR/database/db.tar.gz" ]]; then
  rm -rf ~/.paperclip/instances/default/db
  mkdir -p ~/.paperclip/instances/default/
  tar -xzf "$BACKUP_DIR/database/db.tar.gz" \
    -C ~/.paperclip/instances/default
  echo "  ✓ Database restored"
elif [[ -d "$BACKUP_DIR/database/db" ]]; then
  rm -rf ~/.paperclip/instances/default/db
  cp -r "$BACKUP_DIR/database/db" ~/.paperclip/instances/default/
  echo "  ✓ Database restored"
else
  echo "  ⚠ No database found in backup"
fi

# ═══════════════════════════════════════════════════════════════
# RESTORE COMPANY STATE
# ═══════════════════════════════════════════════════════════════

echo ""
echo "🏢 Restoring COMPANY & AGENT STATE..."

if [[ -f "$BACKUP_DIR/company-state/companies.tar.gz" ]]; then
  rm -rf ~/.paperclip/instances/default/companies
  mkdir -p ~/.paperclip/instances/default/
  tar -xzf "$BACKUP_DIR/company-state/companies.tar.gz" \
    -C ~/.paperclip/instances/default
  echo "  ✓ Companies restored"
elif [[ -d "$BACKUP_DIR/company-state/companies" ]]; then
  rm -rf ~/.paperclip/instances/default/companies
  cp -r "$BACKUP_DIR/company-state/companies" ~/.paperclip/instances/default/
  echo "  ✓ Companies restored"
else
  echo "  ⚠ No company state found in backup"
fi

# ═══════════════════════════════════════════════════════════════
# RESTORE FILE STORAGE
# ═══════════════════════════════════════════════════════════════

echo ""
echo "📁 Restoring FILE STORAGE..."

if [[ -f "$BACKUP_DIR/storage/data.tar.gz" ]]; then
  rm -rf ~/.paperclip/instances/default/data
  mkdir -p ~/.paperclip/instances/default/
  tar -xzf "$BACKUP_DIR/storage/data.tar.gz" \
    -C ~/.paperclip/instances/default
  echo "  ✓ File storage restored"
elif [[ -d "$BACKUP_DIR/storage/data" ]]; then
  rm -rf ~/.paperclip/instances/default/data
  cp -r "$BACKUP_DIR/storage/data" ~/.paperclip/instances/default/
  echo "  ✓ File storage restored"
else
  echo "  ⚠ No file storage found in backup"
fi

# ═══════════════════════════════════════════════════════════════
# RESTORE OTHER STATE
# ═══════════════════════════════════════════════════════════════

echo ""
echo "⚙️  Restoring OTHER STATE..."

for state_file in "$BACKUP_DIR"/state/*.tar.gz; do
  if [[ -f "$state_file" ]]; then
    dir_name=$(basename "$state_file" .tar.gz)
    rm -rf ~/.paperclip/instances/default/$dir_name
    mkdir -p ~/.paperclip/instances/default/
    tar -xzf "$state_file" -C ~/.paperclip/instances/default
    echo "  ✓ $dir_name restored"
  fi
done

# ═══════════════════════════════════════════════════════════════
# RESTORE EXTENSIONS (optional)
# ═══════════════════════════════════════════════════════════════

echo ""
echo "🔌 Restoring EXTENSIONS (optional)..."

for ext_file in "$BACKUP_DIR"/extensions/*.tar.gz; do
  if [[ -f "$ext_file" ]]; then
    dir_name=$(basename "$ext_file" .tar.gz)
    
    # Ask before overwriting plugins
    read -p "  Restore $dir_name? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      rm -rf ~/.paperclip/$dir_name
      mkdir -p ~/.paperclip/
      tar -xzf "$ext_file" -C ~/.paperclip
      echo "  ✓ $dir_name restored"
    else
      echo "  ⊘ $dir_name skipped"
    fi
  fi
done

# ═══════════════════════════════════════════════════════════════
# RESTART SERVICE
# ═══════════════════════════════════════════════════════════════

echo ""
echo "🚀 Restarting Paperclip service..."

if command -v ./paperclip-service.sh &>/dev/null; then
  ./paperclip-service.sh resume 2>/dev/null || {
    echo "  ℹ Service auto-restart disabled"
    echo "  Run manually: pnpm dev"
  }
else
  echo "  ℹ Manual restart needed: pnpm dev"
fi

# ═══════════════════════════════════════════════════════════════
# VERIFICATION
# ═══════════════════════════════════════════════════════════════

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Restore complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Verification checks:"
echo ""
echo "1. Verify secrets exist:"
echo "   ls -la ~/.paperclip/instances/default/secrets/"
echo ""
echo "2. Verify database:"
echo "   ls -la ~/.paperclip/instances/default/db/ | head"
echo ""
echo "3. Verify companies:"
echo "   ls -la ~/.paperclip/instances/default/companies/ | head"
echo ""
echo "4. Start Paperclip:"
echo "   cd $PROJECT_ROOT && pnpm dev"
echo ""
echo "5. Check health:"
echo "   curl http://localhost:3100/api/health"
echo ""
echo "If anything looks wrong, restore from safety backup:"
echo "  $CURRENT_BACKUP"
echo ""
