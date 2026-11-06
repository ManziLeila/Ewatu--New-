# Git branching and deployment (GitHub)

## Branches

| Branch | Purpose |
|--------|---------|
| **development** | Day-to-day work; push features here first. |
| **UAT** | User acceptance / staging server; merge from `development` when ready to test. |
| **main** | Production; merge from `UAT` after sign-off. |

## Promotion flow

```text
feature work  →  push to development  →  CI runs
                      ↓
              merge PR into UAT       →  CI + deploy to UAT server
                      ↓
              merge PR into main      →  CI + deploy to production server
```

Use **pull requests** for `development` → `UAT` and `UAT` → `main` so CI runs before merge.

**GitHub Actions blocked (billing)?** Deploy from your own server instead — see [deploy-without-github-actions.md](./deploy-without-github-actions.md) and [COOLIFY.md](../COOLIFY.md).

## One-time: new GitHub repository

1. On GitHub: **New repository** (empty — no README, no `.gitignore`).
   - Example name: `e-watu-hr`
   - Owner: your account or org (e.g. `shyakaalex`).

2. On your PC (PowerShell), from the project root:

```powershell
cd C:\Users\hp\e-watu

# Commit current work (including .github/workflows)
git add -A
git status
git commit -m "Add GitHub CI/CD and Prisma generate fixes"

# Point origin at the NEW repo (replace USER and REPO)
git remote set-url origin git@github.com:USER/REPO.git
# Or HTTPS: git remote set-url origin https://github.com/USER/REPO.git

# Create/update the three branches from current code
git checkout development
git merge Keza
git branch -f UAT development
git branch -f main development

# First push (all branches)
git push -u origin development
git push -u origin UAT
git push -u origin main
```

3. On GitHub → **Settings → General → Default branch**: set **development**.

4. Optional: **Settings → Branches** → protect `main` and `UAT` (require PR + passing CI).

## GitHub Actions secrets

Create two **Environments** in the repo: `uat` and `production`.

For each environment, add secrets (names must match `.github/workflows/deploy.yml`):

| Secret | Description |
|--------|-------------|
| `DEPLOY_HOST` | Server IP or hostname |
| `DEPLOY_USER` | SSH user (e.g. `deploy`) |
| `DEPLOY_SSH_KEY` | Private key (full PEM) |
| `DEPLOY_PORT` | SSH port (optional, default 22) |
| `DEPLOY_APP_DIR` | Path on server, e.g. `/var/www/e-watu` |

On the server, clone the repo once, configure `.env` files per service, Docker, and Postgres. Deploy workflow runs `git pull` + build on push to **UAT** or **main**.

## SSH key for GitHub (if push fails)

```powershell
ssh-keygen -t ed25519 -C "your-email@example.com" -f $env:USERPROFILE\.ssh\id_ed25519
Get-Content $env:USERPROFILE\.ssh\id_ed25519.pub
```

Add the public key in GitHub → **Settings → SSH and GPG keys**, then:

```powershell
ssh -T git@github.com
git push -u origin development
```

## Local daily commands

```powershell
git checkout development
git pull origin development
# ... work ...
git push origin development
```

When ready for UAT: open a PR **development → UAT** on GitHub. After UAT pass: PR **UAT → main**.
