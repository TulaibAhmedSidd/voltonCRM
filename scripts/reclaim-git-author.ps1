param(
    [string]$Branch = "main"
)

$ErrorActionPreference = "Stop"

$TARGET_NAME = "TulaibAhmedSidd"
$TARGET_EMAIL = "ahsidtullu@gmail.com"

Write-Host "`n==================================================" -ForegroundColor Cyan
Write-Host " Reclaiming Git Authorship for: $TARGET_NAME <$TARGET_EMAIL>" -ForegroundColor Cyan
Write-Host " Target Branch: $Branch" -ForegroundColor Cyan
Write-Host "==================================================`n" -ForegroundColor Cyan

# 1. Check clean status
$status = git status --porcelain
if ($status) {
    Write-Error "Working directory has uncommitted changes. Stash or commit them before running."
    exit 1
}

# 2. Fetch and pull
Write-Host "[1/5] Fetching and pulling latest changes from origin/$Branch..." -ForegroundColor Yellow
git fetch origin $Branch
git pull origin $Branch

# 3. Configure local user
Write-Host "[2/5] Setting local git config author details..." -ForegroundColor Yellow
git config user.name "$TARGET_NAME"
git config user.email "$TARGET_EMAIL"

# 4. Squelch warning and rewrite
Write-Host "[3/5] Rewriting all commit authors & committers to $TARGET_NAME <$TARGET_EMAIL>..." -ForegroundColor Yellow
$env:FILTER_BRANCH_SQUELCH_WARNING = "1"

$filterScript = "if [ `"`$GIT_AUTHOR_EMAIL`" != `"$TARGET_EMAIL`" ] || [ `"`$GIT_AUTHOR_NAME`" != `"$TARGET_NAME`" ]; then export GIT_AUTHOR_NAME=`"$TARGET_NAME`"; export GIT_AUTHOR_EMAIL=`"$TARGET_EMAIL`"; fi; if [ `"`$GIT_COMMITTER_EMAIL`" != `"$TARGET_EMAIL`" ] || [ `"`$GIT_COMMITTER_NAME`" != `"$TARGET_NAME`" ]; then export GIT_COMMITTER_NAME=`"$TARGET_NAME`"; export GIT_COMMITTER_EMAIL=`"$TARGET_EMAIL`"; fi;"

git filter-branch -f --env-filter $filterScript $Branch

# 5. Verify
Write-Host "`n[4/5] Verifying rewritten commit authors..." -ForegroundColor Yellow
$authors = git log $Branch --format="%an <%ae>" | Sort-Object -Unique
Write-Host "Authors on $Branch :"
foreach ($a in $authors) {
    Write-Host "  - $a" -ForegroundColor Green
}

# 6. Push
Write-Host "`n[5/5] Pushing rewritten history to origin/$Branch..." -ForegroundColor Yellow
git push origin $Branch --force

Write-Host "`n==================================================" -ForegroundColor Green
Write-Host " SUCCESS: All commits on $Branch are now owned by:" -ForegroundColor Green
Write-Host " $TARGET_NAME <$TARGET_EMAIL>" -ForegroundColor Green
Write-Host " Remote origin/$Branch updated successfully!" -ForegroundColor Green
Write-Host "==================================================`n" -ForegroundColor Green
