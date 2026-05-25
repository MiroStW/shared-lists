#!/bin/bash

set -e

# Configuration
SSH_TARGET="miro@skynet"
# Update this path if the app is located elsewhere on Skynet
DEPLOY_DIR="/home/miro/stack/shared-lists"

echo "🚀 Deploying shared-lists to $SSH_TARGET..."

ssh $SSH_TARGET "bash -s" << EOF
  set -e
  echo "📁 Navigating to \$DEPLOY_DIR..."
  cd \$DEPLOY_DIR || { echo "Directory not found!"; exit 1; }

  echo "⬇️ Pulling latest changes from git..."
  git pull origin main

  echo "🔨 Rebuilding and restarting Docker containers..."
  docker compose up -d --build

  echo "🧹 Cleaning up old Docker images..."
  docker image prune -f

  echo "✅ Deployment complete!"
EOF
