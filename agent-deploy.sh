#!/bin/bash
# Agent Deploy Wrapper - Pre-configured with Market URL & API Key
export MARKET_API_URL="https://market.aitboy.cn"
export MARKET_API_KEY="pd_mkt_6570177f06cb04866981cb4ed9be9d2d"

NODE="C:/ProgramData/WorkBuddy/chromium-env/6mnmkq/.workbuddy/binaries/node/versions/22.22.2/node.exe"
CLI="D:/mycode/agent-hub/agent-deploy/node/dist/cli.js"

# Convert cygwin paths to Windows paths for arguments
ARGS=()
for arg in "$@"; do
  if [[ "$arg" == /* ]]; then
    ARGS+=("$(cygpath -w "$arg" 2>/dev/null || echo "$arg")")
  else
    ARGS+=("$arg")
  fi
done

"$NODE" "$CLI" "${ARGS[@]}"
