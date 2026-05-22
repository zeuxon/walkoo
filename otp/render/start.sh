#!/bin/sh
set -eu

PORT_VALUE="${PORT:-8080}"
OTP_DIR="${OTP_BASE_DIR:-/var/opentripplanner}"
JAVA_OPTS_VALUE="${JAVA_OPTS:--Xmx1G}"

mkdir -p "$OTP_DIR"

if [ ! -f "$OTP_DIR/otp-config.json" ]; then
  if [ -f "/opt/render/default-otp-config.json" ]; then
    cp "/opt/render/default-otp-config.json" "$OTP_DIR/otp-config.json"
  fi
fi

if [ ! -f "$OTP_DIR/graph.obj" ]; then
  if [ -n "${GRAPH_OBJ_URL:-}" ]; then
    echo "graph.obj missing; downloading from GRAPH_OBJ_URL..." >&2
    curl -fsSL "$GRAPH_OBJ_URL" -o "$OTP_DIR/graph.obj"
  else
    echo "ERROR: graph.obj not found at $OTP_DIR/graph.obj" >&2
    echo "Fix: mount a disk at $OTP_DIR with graph.obj, OR set GRAPH_OBJ_URL to a public download link." >&2
    exit 1
  fi
fi

echo "Starting OTP on port $PORT_VALUE (base dir: $OTP_DIR)" >&2

export JAVA_OPTS="$JAVA_OPTS_VALUE"

exec /docker-entrypoint.sh \
  --load \
  --serve \
  --port "$PORT_VALUE"
