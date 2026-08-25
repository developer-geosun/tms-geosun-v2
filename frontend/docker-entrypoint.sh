#!/bin/sh
set -eu

APP_CONFIG_LOCAL_PATH="/usr/share/nginx/html/assets/app-config.local.js"

# Записує ключ HERE з оточення в окремий локальний runtime-конфіг.
cat > "$APP_CONFIG_LOCAL_PATH" <<EOF
// Локальний runtime-конфіг (згенеровано в контейнері).
window.__APP_CONFIG__ = {
  ...(window.__APP_CONFIG__ || {}),
  hereApiKey: "${HERE_API_KEY:-}"
};
EOF

exec nginx -g 'daemon off;'
