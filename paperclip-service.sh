#!/bin/bash
# Paperclip dev service toggle helper

if [[ "$1" == "pause" ]]; then
  echo "⏸️  Pausing Paperclip autostart service..."
  launchctl unload ~/Library/LaunchAgents/com.paperclip.service.plist 2>/dev/null
  lsof -ti:3100 | xargs kill -9 2>/dev/null
  echo "✅ Service paused. Manually run 'pnpm dev' to start."
  
elif [[ "$1" == "resume" ]]; then
  echo "▶️  Resuming Paperclip autostart service..."
  launchctl load ~/Library/LaunchAgents/com.paperclip.service.plist 2>/dev/null
  echo "✅ Service resumed. Will restart on reboot."
  
elif [[ "$1" == "status" ]]; then
  launchctl list com.paperclip.service 2>/dev/null && echo "✅ Service active" || echo "❌ Service inactive"
  
else
  echo "Usage: $0 {pause|resume|status}"
  echo ""
  echo "  pause   - Disable autostart (for active development)"
  echo "  resume  - Enable autostart (when done developing)"
  echo "  status  - Check service status"
fi
