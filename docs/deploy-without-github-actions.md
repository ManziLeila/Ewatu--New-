# Deploy on your own server (no GitHub Actions)

GitHub Actions is optional. You already push to **GitHub**; your **server** pulls and deploys. No card, no PayPal, no Actions minutes.

## Branch → server mapping

| Branch on GitHub | Typical server |
|------------------|----------------|
| **UAT** | Staging / UAT (test before go-live) |
| **main** | Production |

**development** stays on developers’ laptops; merge to **UAT** when ready to deploy to staging.

## Option A — Coolify (recommended if you use it)

Coolify pulls from Git and rebuilds — **no GitHub Actions**.

1. Install [Coolify](https://coolify.io) on your VPS.
2. **+ New** → **Docker Compose** → connect repo  
   `https://github.com/ManziLeila/e-watu-hr`
3. **Two apps** (optional but matches your flow):
   - **UAT app** → branch **UAT** → domain e.g. `uat.erp.yourcompany.com`
   - **Production app** → branch **main** → domain e.g. `erp.yourcompany.com`
4. Compose file: follow root **[COOLIFY.md](../COOLIFY.md)** and [`coolify/env.example`](../coolify/env.example). Beginner walkthrough: **[deploy-step-by-step.md](./deploy-step-by-step.md)**.
5. After each merge to **UAT** or **main**, click **Deploy** in Coolify (or enable **Auto Deploy** on webhook from GitHub).

GitHub **webhooks** (Settings → Webhooks → push events) can trigger Coolify redeploy; that does **not** use GitHub Actions.

## Option B — SSH + deploy script

On the **server** (Ubuntu/Debian), once:

```bash
sudo apt update && sudo apt install -y git
# Install Node 20: https://nodejs.org/  OR: curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt install -y nodejs
# Install Docker if you use compose: https://docs.docker.com/engine/install/

sudo adduser deploy
sudo mkdir -p /var/www/e-watu
sudo chown deploy:deploy /var/www/e-watu
sudo -u deploy git clone https://github.com/ManziLeila/e-watu-hr.git /var/www/e-watu
```

Copy production `.env` files into each `services/*/`. See `COOLIFY.md` / service READMEs for variables.

**Each deploy** (UAT or production):

```bash
sudo -u deploy bash /var/www/e-watu/scripts/deploy-on-server.sh UAT
# or
sudo -u deploy bash /var/www/e-watu/scripts/deploy-on-server.sh main
```

From your **Windows PC** after merging on GitHub:

```powershell
ssh deploy@YOUR_SERVER_IP "bash /var/www/e-watu/scripts/deploy-on-server.sh UAT"
```

## Option C — Two folders on one server

```text
/var/www/e-watu-uat   →  git checkout UAT
/var/www/e-watu-prod  →  git checkout main
```

Run `deploy-on-server.sh` in each folder with the matching branch name.

## What replaces CI?

Run before you merge to **UAT** (on your PC):

```powershell
npm run check:architecture
npm run db:generate:all
npm run build:web
```

Or add **GitLab CI** on gitlab.com (free tier) mirroring the same repo — still no GitHub billing.

## Summary

| Step | Where |
|------|--------|
| Code + push | GitHub `development` |
| Promote | Merge PR → **UAT** → **main** |
| Deploy | **Coolify** auto/manual **or** SSH + `scripts/deploy-on-server.sh` |
| GitHub Actions | Not required |
