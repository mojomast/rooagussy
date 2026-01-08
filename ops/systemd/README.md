# Roo Code Docs RAG - Systemd Timer for Automatic Sync
#
# Installation:
#   sudo cp roo-rag-sync.service /etc/systemd/system/
#   sudo cp roo-rag-sync.timer /etc/systemd/system/
#   sudo systemctl daemon-reload
#   sudo systemctl enable roo-rag-sync.timer
#   sudo systemctl start roo-rag-sync.timer

# Check status:
#   systemctl status roo-rag-sync.timer
#   systemctl list-timers
