#!/usr/bin/env bash
# Reproducible tool setup only; no provider keys, production data or deployment.
set -euo pipefail
perform_repo="$(cd "$(dirname "$0")/.." && pwd)"
test -f "$perform_repo/application/pnpm-lock.yaml"
if [[ ! -x /tmp/perform-pnpm9/node_modules/.bin/pnpm ]]; then
  npm install --prefix /tmp/perform-pnpm9 --ignore-scripts --cache /tmp/perform-npm-cache pnpm@9.12.0
fi
if [[ ! -d /tmp/perform-browser-check/node_modules/@playwright/test ]]; then
  npm install --prefix /tmp/perform-browser-check --ignore-scripts --cache /tmp/perform-npm-cache @playwright/test@1.63.0
fi
export PATH="/tmp/perform-pnpm9/node_modules/.bin:$PATH"
cd "$perform_repo/application"
CI=1 pnpm install --frozen-lockfile --ignore-scripts --store-dir /tmp/perform-pnpm9-store
node scripts/prime-css.cjs
mkdir -p /tmp/perform-expo
if [[ ! -x /tmp/perform-php-runtime/usr/bin/php8.4 ]]; then
  test -f /usr/share/keyrings/debian-archive-keyring.gpg
  mkdir -p /tmp/perform-apt/{lists/partial,archives/partial,parts,log} /tmp/perform-php-runtime
  cat > /tmp/perform-apt/sources.list <<'EOF'
deb [signed-by=/usr/share/keyrings/debian-archive-keyring.gpg] https://deb.debian.org/debian trixie main
EOF
  : > /tmp/perform-apt/apt.conf
  cat > /tmp/perform-apt/config <<'EOF'
Dir::Etc::main "/tmp/perform-apt/apt.conf";
Dir::Etc::parts "/tmp/perform-apt/parts";
Dir::Etc::sourcelist "/tmp/perform-apt/sources.list";
Dir::Etc::sourceparts "/tmp/perform-apt/parts";
Dir::State::lists "/tmp/perform-apt/lists";
Dir::Cache::archives "/tmp/perform-apt/archives";
Dir::Log "/tmp/perform-apt/log";
APT::Sandbox::User "agent";
EOF
  APT_CONFIG=/tmp/perform-apt/config apt-get update
  (
    cd /tmp/perform-apt/archives
    APT_CONFIG=/tmp/perform-apt/config apt-get download php8.4-cli php8.4-common php8.4-curl libargon2-1
    for perform_deb in ./*.deb; do dpkg-deb -x "$perform_deb" /tmp/perform-php-runtime; done
  )
fi
LD_LIBRARY_PATH=/tmp/perform-php-runtime/usr/lib/x86_64-linux-gnu /tmp/perform-php-runtime/usr/bin/php8.4 -n \
  -d extension=/tmp/perform-php-runtime/usr/lib/php/20240924/curl.so \
  -d extension=/tmp/perform-php-runtime/usr/lib/php/20240924/fileinfo.so \
  -r 'if(!extension_loaded("curl")||!extension_loaded("fileinfo"))exit(1);echo "PHP cURL/Fileinfo ready for synthetic tests",PHP_EOL;'
printf '%s\n' 'Pinned frontend tools and local PHP test runtime ready. No production services started.'
