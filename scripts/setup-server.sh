#!/usr/bin/env bash
# One-time setup script for the Vultr server.
# Run this once after SSH-ing in to bootstrap the deployment environment.
set -euo pipefail

DEPLOY_DIR="${DEPLOY_DIR:-/opt/tinytron}"

echo "==> Creating deploy directory at $DEPLOY_DIR"
mkdir -p "$DEPLOY_DIR/mosquitto"

echo "==> Copying config files"
cp mosquitto/mosquitto.conf "$DEPLOY_DIR/mosquitto/mosquitto.conf"
cp compose.yaml "$DEPLOY_DIR/compose.yaml"

if [ ! -f "$DEPLOY_DIR/.env" ]; then
  cp .env.example "$DEPLOY_DIR/.env"
  echo ""
  echo "!! .env created at $DEPLOY_DIR/.env — fill in your secrets before starting:"
  echo "   nano $DEPLOY_DIR/.env"
else
  echo "-- .env already exists, skipping"
fi

echo ""
echo "==> Setting up SSH key for GitHub Actions deploy"
echo "    Generate a key pair (if you haven't):"
echo "      ssh-keygen -t ed25519 -C 'github-actions-deploy' -f ~/.ssh/github_deploy"
echo "    Add the public key to authorized_keys:"
echo "      cat ~/.ssh/github_deploy.pub >> ~/.ssh/authorized_keys"
echo "    Add the private key as VULTR_SSH_KEY in GitHub Actions secrets."
echo ""
echo "==> GitHub Actions secrets needed:"
echo "    VULTR_HOST       — your server's IP or hostname"
echo "    VULTR_USER       — SSH user (e.g. root)"
echo "    VULTR_SSH_KEY    — private key from above"
echo "    DEPLOY_DIR       — $DEPLOY_DIR"
echo "    CONTROL_PIN      — value of CONTROL_PIN (for web build arg)"
echo ""
echo "Done. Once secrets are set and .env is filled in, push to main to trigger deploys."
