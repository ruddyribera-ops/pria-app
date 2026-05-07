# GitHub Secrets Setup for PRIA v7

**Status:** Code pushed to https://github.com/ruddyribera-ops/pria-app ✅

**Manual Step Required:** Add 2 GitHub Secrets for CI/CD automation.

## How to Add Secrets via GitHub Web UI

1. **Go to Repository Settings:**
   - Navigate to https://github.com/ruddyribera-ops/pria-app/settings/secrets/actions
   
2. **Click "New repository secret"** (top right)

3. **Add Secret #1: RAILWAY_TOKEN**
   - **Name:** `RAILWAY_TOKEN`
   - **Value:** `23805029-c442-4d3f-8b27-dd7a00e343cc`
   - Click "Add secret"

4. **Add Secret #2: SLACK_WEBHOOK_URL** (Optional for Slack notifications)
   - **Name:** `SLACK_WEBHOOK_URL`
   - **Value:** `https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK`
   - Click "Add secret"

## Verify Secrets Are Set

After adding both secrets:
- Go to https://github.com/ruddyribera-ops/pria-app/settings/secrets/actions
- You should see both secrets listed with "Updated X minutes ago"

## What Happens Next

Once secrets are added:
1. **Push any commit to `main` branch** → GitHub Actions CI/CD triggers automatically
2. **test.yml workflow runs:** Backend + Frontend tests, linting, type checking
3. **deploy.yml workflow runs (if tests pass):** Docker builds pushed, deployed to Railway automatically

---

## Alternative: Using GitHub CLI (for OpenCode)

If using `gh` CLI from PowerShell:

```powershell
# Ensure authenticated
gh auth login

# Set secrets
gh secret set RAILWAY_TOKEN --body "23805029-c442-4d3f-8b27-dd7a00e343cc" --repo ruddyribera-ops/pria-app
gh secret set SLACK_WEBHOOK_URL --body "https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK" --repo ruddyribera-ops/pria-app

# Verify
gh secret list --repo ruddyribera-ops/pria-app
```

---

## Next Steps for OpenCode

Once secrets are set:

1. **Local docker-compose test** (from HANDOFF_NOTES.md, Task 2)
2. **Run E2E smoke test** (from HANDOFF_NOTES.md, Task 3)
3. **Monitor GitHub Actions deployment** (from HANDOFF_NOTES.md, Task 4)

The CI/CD pipeline is fully configured in:
- `.github/workflows/test.yml` — Backend/Frontend tests, type checking, coverage gates
- `.github/workflows/deploy.yml` — Docker build & Railway deployment

