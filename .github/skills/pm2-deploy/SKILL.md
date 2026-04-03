---
name: pm2-deploy
description: Deploys WeeklyBot changes to the production server via PM2. Use this skill when asked to deploy, push to production, update the server, or ship changes.
allowed-tools: shell
---

# PM2 Production Deploy for WeeklyBot

This skill handles deploying WeeklyBot to the production server at `weeklybot.lan` using PM2's deploy system.

## Deployment Architecture

- **Host:** `weeklybot.lan`
- **User:** `raz`
- **Remote path:** `/home/raz/weeklybot`
- **Repo:** `git@github.com:raz-a/weeklybot.git`
- **Branch:** `origin/main`
- **Process manager:** PM2 (via `ecosystem.config.cjs`)
- **Post-deploy:** `npm install && npm run build && pm2 reload ecosystem.config.cjs --env production`

## Deployment Steps

Follow these steps in order. Stop and report if any step fails.

### 1. Verify the build compiles

Run the TypeScript compiler to catch errors before deploying:

```
npm run build
```

If this fails, **stop immediately** and fix the build errors before attempting to deploy. Do NOT proceed with a broken build.

### 2. Check git status

Run `git status` to see if there are uncommitted changes.

- If there are uncommitted changes, ask the user whether they want to commit them before deploying. Do not commit automatically without confirmation.
- If the working tree is clean, proceed to the next step.

### 3. Ensure changes are pushed

Check if the local `main` branch is ahead of `origin/main`:

```
git --no-pager log origin/main..HEAD --oneline
```

- If there are unpushed commits, run `git push origin main` to push them.
- If there are no unpushed commits, proceed.

### 4. Deploy via PM2

Run the PM2 deploy command:

```
pm2 deploy ecosystem.config.cjs production
```

This SSHes into the production server, pulls the latest code from `origin/main`, installs dependencies, builds, and reloads the PM2 process.

### 5. Verify deployment

After the deploy command completes, check the output for success. A successful deploy ends with a `successfully deployed` message from PM2.

If the deploy fails, report the error output to the user and suggest troubleshooting steps:
- SSH connectivity: `ssh raz@weeklybot.lan`
- PM2 process status: `pm2 deploy ecosystem.config.cjs production exec "pm2 list"`
- Remote logs: `pm2 deploy ecosystem.config.cjs production exec "pm2 logs --lines 50"`

## Important Notes

- Never deploy without a passing build.
- Never force-push or skip the build verification step.
- If the user wants to deploy a branch other than `main`, warn them that the PM2 config is set to `origin/main` and ask for confirmation.
- The `private/` directory contains secrets and is never committed or deployed via git — it lives on the server already.
