#!/bin/bash

set -e

# Configuration
SSH_TARGET="miro@skynet"
DEPLOY_DIR="/srv/stack/compose/shared-lists"

echo "🚀 Deploying shared-lists to $SSH_TARGET..."

echo "📦 Syncing files to Skynet..."
# We use rsync because the remote directory doesn't seem to be a git repository.
rsync -avz --exclude "node_modules" --exclude ".git" --exclude ".next" --exclude "build" --exclude ".env" --exclude ".env.local" ./ "$SSH_TARGET:$DEPLOY_DIR/"

echo "🔨 Rebuilding and restarting Docker containers..."
ssh "$SSH_TARGET" "bash -s" << EOF
  set -e
  echo "📁 Navigating to $DEPLOY_DIR..."
  cd "$DEPLOY_DIR" || { echo "Directory not found!"; exit 1; }

  docker compose up -d --build

  echo "🧹 Cleaning up old Docker images..."
  docker image prune -f

  echo "✅ Deployment complete!"
EOF
