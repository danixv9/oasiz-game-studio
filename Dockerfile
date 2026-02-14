FROM oven/bun:1

WORKDIR /app

# Useful basics for installs that reference git URLs and for HTTPS downloads.
RUN set -eux; \
  if command -v apt-get >/dev/null 2>&1; then \
    apt-get update; \
    apt-get install -y --no-install-recommends git ca-certificates; \
    rm -rf /var/lib/apt/lists/*; \
  elif command -v apk >/dev/null 2>&1; then \
    apk add --no-cache git ca-certificates; \
  else \
    echo "No supported package manager found (apt-get/apk)"; \
    exit 1; \
  fi

COPY . .
