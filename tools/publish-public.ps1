Write-Host "Syncing and publishing public esl-sim release..." -ForegroundColor Cyan

# 1. Switch to public-release branch
git checkout public-release

# 2. Merge changes from main
git merge main --strategy-option=theirs --no-commit

# 3. Clean out private IP and services
git rm -r --ignore-unmatch apps/api apps/dashboard apps/gateway-hub apps/sync-engine packages/config packages/db docker-compose*.yml docs/SPEC.md docs/MECHANICS.md tools

# 4. Commit and push
git commit -m "chore: sync public release with latest main"
git push public-sim public-release:main

# 5. Switch back to full private monorepo
git checkout main
pnpm install

Write-Host "Public release successfully synced to https://github.com/bhadrasuman/esl-sim!" -ForegroundColor Green
