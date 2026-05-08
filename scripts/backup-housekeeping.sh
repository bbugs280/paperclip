#!/usr/bin/env bash
# Housekeeping for Paperclip backups - clean up old backups per retention policy
# Usage: ./scripts/backup-housekeeping.sh [--dry-run] [--backup-dir dir]

set -euo pipefail

DRY_RUN="${1:---dry-run}"
BACKUP_BASE_DIR="${2:---backup-dir}"

# Parse arguments
EXECUTE=false
CUSTOM_DIR=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --execute)
      EXECUTE=true
      shift
      ;;
    --dry-run)
      EXECUTE=false
      shift
      ;;
    --backup-dir)
      CUSTOM_DIR="$2"
      shift 2
      ;;
    *)
      shift
      ;;
  esac
done

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

# ═══════════════════════════════════════════════════════════════
# RETENTION POLICIES
# ═══════════════════════════════════════════════════════════════

declare -A RETENTION_POLICIES=(
  ["daily"]="7"       # Keep daily backups for 7 days
  ["weekly"]="30"     # Keep weekly backups for 30 days
  ["archive"]="90"    # Keep archived backups for 90 days (optional)
)

# ═══════════════════════════════════════════════════════════════
# HOUSEKEEPING FUNCTION
# ═══════════════════════════════════════════════════════════════

cleanup_directory() {
  local backup_dir="$1"
  local retention_days="$2"
  local dir_name=$(basename "$backup_dir")
  
  if [[ ! -d "$backup_dir" ]]; then
    echo "⊘ Skipping (not found): $backup_dir"
    return 0
  fi
  
  local count=0
  local freed=0
  
  while IFS= read -r old_backup; do
    if [[ -d "$old_backup" ]]; then
      local size=$(du -sh "$old_backup" | cut -f1)
      
      if [[ "$EXECUTE" == true ]]; then
        rm -rf "$old_backup"
        echo "  🗑  Deleted: $(basename "$old_backup") ($size)"
        ((count++))
      else
        echo "  [DRY-RUN] Would delete: $(basename "$old_backup") ($size)"
        ((count++))
      fi
    fi
  done < <(find "$backup_dir" -maxdepth 1 -type d -name 'paperclip-*' -mtime +$retention_days 2>/dev/null | sort)
  
  if [[ $count -gt 0 ]]; then
    echo "  Summary: $count backup(s) marked for deletion in $dir_name"
  else
    echo "  ✓ All backups in $dir_name within retention policy"
  fi
  
  return 0
}

# ═══════════════════════════════════════════════════════════════
# MAIN EXECUTION
# ═══════════════════════════════════════════════════════════════

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  Paperclip Backup Housekeeping                                 ║"
if [[ "$EXECUTE" == true ]]; then
  echo "║  Mode: EXECUTE (deleting old backups)                         ║"
else
  echo "║  Mode: DRY-RUN (preview only)                                 ║"
fi
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

total_freed=0

# If custom dir specified, clean just that one
if [[ -n "$CUSTOM_DIR" ]]; then
  echo "Custom backup directory: $CUSTOM_DIR"
  cleanup_directory "$CUSTOM_DIR" 7
  echo ""
else
  # Standard cleanup paths
  for backup_type in "${!RETENTION_POLICIES[@]}"; do
    retention_days="${RETENTION_POLICIES[$backup_type]}"
    backup_dir="$HOME/.paperclip/${backup_type}-backups"
    
    echo "📁 Checking: $backup_type (retention: ${retention_days} days)"
    cleanup_directory "$backup_dir" "$retention_days"
    echo ""
  done
fi

# ═══════════════════════════════════════════════════════════════
# DISK USAGE SUMMARY
# ═══════════════════════════════════════════════════════════════

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Backup Storage Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

for backup_type in "${!RETENTION_POLICIES[@]}"; do
  backup_dir="$HOME/.paperclip/${backup_type}-backups"
  if [[ -d "$backup_dir" ]]; then
    size=$(du -sh "$backup_dir" 2>/dev/null | cut -f1 || echo "0")
    count=$(find "$backup_dir" -maxdepth 1 -type d -name 'paperclip-*' 2>/dev/null | wc -l)
    echo "  $backup_type: $size ($count backup(s))"
  fi
done

total_size=$(du -sh "$HOME/.paperclip/"*-backups 2>/dev/null | awk '{sum+=$1} END {print sum}' || echo "0")
echo "  ─────────────────────────────"
echo "  Total: $total_size"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [[ "$EXECUTE" == false ]]; then
  echo ""
  echo "🔍 DRY-RUN COMPLETE (no changes made)"
  echo ""
  echo "To actually delete old backups, run:"
  echo "  ./scripts/backup-housekeeping.sh --execute"
  echo ""
else
  echo ""
  echo "✅ Housekeeping complete!"
  echo ""
fi
