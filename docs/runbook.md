# Runbook

Everything lives in GCP project `vietrochack-lab`, region `us-central1`.

| Resource | Name |
|---|---|
| Hosting site | `vietrochack-teachxr` (`https://vietrochack-teachxr.web.app`), target `teachxr` in `.firebaserc` |
| Custom domain | `teachxr.vietrochack.com` |
| Cloud Run | `teachxr-server` (`https://teachxr-server-246457606106.us-central1.run.app`) |
| Artifact Registry | `teachxr` (Docker), with a cleanup policy (keep 3; delete untagged > 1 day, any > 90 days) |
| Firestore | database `teachxr`: collections `sessions`, `rateLimits`, with a TTL on `expiresAt` |
| Secret | `teachxr-gemini-api-key` (API key "TeachXR", restricted to `generativelanguage.googleapis.com`) |
| CI identity | `gh-actions-deploy-teachxr@…` via WIF provider `github/teachxr` (repo variables `WORKLOAD_IDENTITY_PROVIDER`, `GCP_SERVICE_ACCOUNT`) |
| Budget | the project-wide "vietrochack-lab monthly budget" ($10), shared with the other apps |

## Deploying

Push to `main` (`.github/workflows/deploy.yml`), or run `bash scripts/deploy.sh`. Both:

1. Run the backend tests (CI only).
2. Build the image into `teachxr` with `gcloud builds submit`.
3. `gcloud run deploy`.
4. Build the frontend and `firebase deploy --only hosting:teachxr`.

Stop the Vite dev server before running `deploy.sh` on Windows. `npm ci`
can't replace `esbuild.exe` while it's running, and it leaves `node_modules`
half-deleted.

## One-time setup (already done 2026-09-25, kept for reference)

```bash
P=vietrochack-lab; R=us-central1

# Gemini key, restricted, straight into Secret Manager
gcloud services api-keys create --display-name=TeachXR \
  --api-target=service=generativelanguage.googleapis.com --project=$P
printf '%s' "$KEY" | gcloud secrets create teachxr-gemini-api-key --data-file=- --project=$P

gcloud firestore databases create --database=teachxr --location=$R --project=$P
for c in sessions rateLimits; do
  gcloud firestore fields ttls update expiresAt --collection-group=$c --enable-ttl \
    --database=teachxr --project=$P
done

gcloud artifacts repositories create teachxr --repository-format=docker --location=$R --project=$P
gcloud artifacts repositories set-cleanup-policies teachxr --location=$R --project=$P \
  --policy=cleanup-policy.json --no-dry-run   # policy JSON from the migration guide §6

firebase hosting:sites:create vietrochack-teachxr --project=$P

# After the first Cloud Run deploy: its runtime SA needs Firestore
gcloud projects add-iam-policy-binding $P \
  --member=serviceAccount:246457606106-compute@developer.gserviceaccount.com \
  --role=roles/datastore.user

# Custom domain (REST, since firebase-tools has no command for it)
TOKEN=$(gcloud auth print-access-token)
BASE=https://firebasehosting.googleapis.com/v1beta1/projects/$P/sites/vietrochack-teachxr/customDomains
curl -X POST "$BASE?customDomainId=teachxr.vietrochack.com" -H "Authorization: Bearer $TOKEN" \
  -H "X-Goog-User-Project: $P" -H "Content-Type: application/json" -d '{}'
curl "$BASE/teachxr.vietrochack.com" -H "Authorization: Bearer $TOKEN" -H "X-Goog-User-Project: $P"
```

DNS records at Namecheap for `vietrochack.com`:

| Host | Type | Value |
|---|---|---|
| `teachxr` | CNAME | `vietrochack-teachxr.web.app` |
| `_acme-challenge.teachxr` | TXT | `Ool3nxPL1apNDkJ7h98fWqOqhsQiuGquqqw7fvZt7AA` |

WIF followed migration guide §8, with roles `run.admin`, `iam.serviceAccountUser`,
`cloudbuild.builds.editor`, `artifactregistry.writer`, `storage.admin`,
`firebasehosting.admin`, `logging.viewer`, `secretmanager.secretAccessor` and
`serviceusage.serviceUsageConsumer`.

## Operations

- **Logs**: `gcloud run services logs read teachxr-server --region=us-central1 --project=vietrochack-lab`.
  Every session logs `Live session <id> ended: <reason> (N images, M texts)`.
- **Model 404s**: Google retires model names. List the models that support
  `bidiGenerateContent` and redeploy with `--update-env-vars=LIVE_MODEL=...`:
  ```bash
  curl -s "https://generativelanguage.googleapis.com/v1beta/models?pageSize=200" \
    -H "x-goog-api-key: $(gcloud secrets versions access latest --secret=teachxr-gemini-api-key --project=vietrochack-lab)"
  ```
- **Rotating the key**: create a new restricted key, add it as a new secret
  version (`gcloud secrets versions add`), redeploy, then delete the old key.
- **Limits**: tune with env vars (see `backend/src/config.py`), e.g.
  `SESSIONS_GLOBAL_PER_HOUR` or `LIVE_MAX_SESSION_SECONDS` (keep it under the
  Cloud Run `--timeout`, and update `SESSION_SECONDS` in `frontend/src/lib/useTutor.js`).

## 3D assets

All CC0 from [Poly Haven](https://polyhaven.com):

- **Models** (`frontend/public/models/*.glb`): desk_lamp_arm_01, alarm_clock_01,
  potted_plant_01/02/04, wall_clock, wooden_bookshelf_worn,
  book_encyclopedia_set_01, old_bed_frame, throw_pillows_01,
  painted_wooden_nightstand, painted_wooden_shelves, standing_picture_frame_01,
  hanging_picture_frame_01/02, ceramic_vase_01, GreenChair_01, side_table_01,
  drawer_cabinet, modern_ceiling_lamp_01. Compressed from the 1k glTFs with:
  ```bash
  npx @gltf-transform/cli optimize in.gltf out.glb --texture-compress webp --texture-size 512 --compress meshopt
  ```
- **Textures** (`frontend/public/textures/`): herringbone_parquet,
  painted_plaster_wall, oak_veneer_01, knitted_fleece, poly_wool_herringbone,
  at 1k. `_diff` and `_nor` are WebP. `_arm` packs AO in the red channel and
  roughness in green, which is what three.js reads for aoMap/roughnessMap
  (see `scene/pbr.js`).
- **HDRI** (`frontend/public/env/hotel_room_1k.hdr`): used for lighting and
  reflections only, at low intensity.

The Poly Haven API rejects Python's default user agent, so send your own.
