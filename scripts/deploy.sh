#!/usr/bin/env bash
set -euo pipefail

# Deploys the backend to Cloud Run and the frontend to Firebase Hosting's
# "teachxr" site, both in the vietrochack-lab GCP project. See
# docs/adr/0001-deploy-topology.md for why, and docs/runbook.md for the
# one-time setup this script assumes is already done.
#
# Run from anywhere: bash scripts/deploy.sh
# .github/workflows/deploy.yml runs the same steps on every push to main.

cd "$(dirname "${BASH_SOURCE[0]}")/.."  # repo root

PROJECT_ID="${GOOGLE_CLOUD_PROJECT:-vietrochack-lab}"
REGION="${REGION:-us-central1}"
SERVICE_NAME="${SERVICE_NAME:-teachxr-server}"

echo "==> Checking required tools..."
command -v gcloud >/dev/null || {
  echo "gcloud CLI not found: https://cloud.google.com/sdk/docs/install"
  exit 1
}
command -v firebase >/dev/null || {
  echo "firebase CLI not found, run: npm install -g firebase-tools"
  exit 1
}

IMAGE="$REGION-docker.pkg.dev/$PROJECT_ID/teachxr/server:$(git rev-parse --short HEAD 2>/dev/null || date +%s)"

echo "==> Building backend image: $IMAGE"
# Built into the app's own Artifact Registry repo (not cloud-run-source-deploy)
# so its cleanup policy applies. See docs/runbook.md.
gcloud builds submit backend --config=backend/cloudbuild.yaml \
  --substitutions=_IMAGE="$IMAGE" --project "$PROJECT_ID"

echo "==> Deploying backend to Cloud Run"
echo "    service: $SERVICE_NAME   project: $PROJECT_ID   region: $REGION"
# --timeout stays above LIVE_MAX_SESSION_SECONDS (backend/src/config.py) so
# sessions end cleanly before Cloud Run cuts the WebSocket. Limits are part of
# abuse prevention; see docs/adr/0005-abuse-prevention.md.
gcloud run deploy "$SERVICE_NAME" \
  --image="$IMAGE" \
  --region "$REGION" \
  --allow-unauthenticated \
  --max-instances=3 \
  --concurrency=20 \
  --timeout=600 \
  --set-secrets=GEMINI_API_KEY=teachxr-gemini-api-key:latest \
  --project "$PROJECT_ID"

echo "==> Building frontend..."
(cd frontend && npm ci && npm run build)

echo "==> Deploying frontend to Firebase Hosting (teachxr site)"
firebase deploy --only hosting:teachxr --project "$PROJECT_ID"

echo ""
echo "==> Done."
echo "Live at: https://teachxr.vietrochack.com (and https://vietrochack-teachxr.web.app)"
