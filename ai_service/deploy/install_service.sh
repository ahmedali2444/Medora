#!/usr/bin/env bash
# Install / update the Medora AI systemd service.
# Usage: sudo bash deploy/install_service.sh
set -euo pipefail

SERVICE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(dirname "$SERVICE_DIR")"
UNIT_SRC="$SERVICE_DIR/ai_service.service"
UNIT_DST="/etc/systemd/system/ai_service.service"

echo "==> App dir: $APP_DIR"

# 1) Ensure a working virtualenv with dependencies.
if [ ! -x "$APP_DIR/venv/bin/uvicorn" ]; then
  echo "==> Creating virtualenv and installing requirements ..."
  python3 -m venv "$APP_DIR/venv"
  "$APP_DIR/venv/bin/pip" install --upgrade pip >/dev/null
  "$APP_DIR/venv/bin/pip" install -r "$APP_DIR/requirements.txt"
fi

# 2) Ensure an .env exists.
if [ ! -f "$APP_DIR/.env" ]; then
  echo "==> Creating .env from .env.example (edit it to set OPENAI_API_KEY / JWT_SECRET)"
  cp "$APP_DIR/.env.example" "$APP_DIR/.env"
fi

# 3) Install the unit and (re)start.
echo "==> Installing systemd unit -> $UNIT_DST"
install -m 644 "$UNIT_SRC" "$UNIT_DST"
systemctl daemon-reload
systemctl enable ai_service
systemctl restart ai_service

sleep 4
systemctl --no-pager status ai_service | head -12
echo
echo "==> Health check:"
curl -fsS http://127.0.0.1:8100/health && echo " OK" || echo " (service still warming up; retry in a few seconds)"
