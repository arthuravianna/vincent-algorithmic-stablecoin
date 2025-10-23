#!/bin/bash

# Check for node
if ! which node > /dev/null; then
  echo "Error: node not found. Please ensure you have node@^20.0.0 installed."
  exit 1
fi

# Check for corepack
if ! which corepack > /dev/null; then
  echo "Error: corepack not found. Please ensure you have node@^20.0.0 installed."
  exit 1
fi

# Verify corepack version > 0.31.0
# corepack -v outputs only the semver (e.g., 0.34.0), so use it directly
COREPACK_VERSION=$(corepack -v 2>/dev/null | head -n1 | tr -d '[:space:]')

# Ensure we got a non-empty version
if [ -z "$COREPACK_VERSION" ]; then
  echo "Error: unable to determine corepack version."
  echo "Please ensure corepack > 0.31.0 (upgrade Node.js to >= 20 if needed)."
  exit 1
fi

# Compare versions using sort -V which understands semantic versioning
MIN_VERSION="0.31.0"
# Determine the lowest of the two versions
LOWEST=$(printf "%s\n%s\n" "$COREPACK_VERSION" "$MIN_VERSION" | sort -V | head -n1)
# If lowest is MIN_VERSION and not equal to COREPACK_VERSION, then COREPACK_VERSION > MIN_VERSION; otherwise it's <= MIN_VERSION
if [ "$LOWEST" = "$MIN_VERSION" ] && [ "$COREPACK_VERSION" != "$MIN_VERSION" ]; then
  : # COREPACK_VERSION > MIN_VERSION => OK
else
  echo "Error: corepack version $COREPACK_VERSION is too old. Please upgrade to a version > $MIN_VERSION."
  exit 1
fi

npx only-allow pnpm
