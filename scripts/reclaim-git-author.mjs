#!/usr/bin/env node
/**
 * Automatically pulls the latest commits, rewrites all commit authors/committers
 * to TulaibAhmedSidd <ahsidtullu@gmail.com>, and pushes force-safely to origin.
 *
 * Usage:
 *   npm run git:claim
 *   npm run git:claim -- <branch>
 *   node scripts/reclaim-git-author.mjs [branch]
 */

import { execSync } from 'node:child_process'

const TARGET_NAME = 'TulaibAhmedSidd'
const TARGET_EMAIL = 'ahsidtullu@gmail.com'

const defaultShell = process.platform === 'win32' ? 'powershell.exe' : '/bin/sh'

function run(cmd, env = {}) {
  console.log(`> ${cmd}`)
  return execSync(cmd, {
    stdio: 'inherit',
    shell: defaultShell,
    env: { ...process.env, ...env },
  })
}

function runOut(cmd) {
  return execSync(cmd, { encoding: 'utf8', shell: defaultShell, stdio: ['pipe', 'pipe', 'ignore'] }).trim()
}

async function main() {
  const args = process.argv.slice(2).filter((a) => a !== '--')
  const currentBranch = runOut('git rev-parse --abbrev-ref HEAD')
  const branch = args[0] || currentBranch || 'main'

  console.log(`\n==================================================`)
  console.log(` Reclaiming Git Authorship for: ${TARGET_NAME} <${TARGET_EMAIL}>`)
  console.log(` Target Branch: ${branch}`)
  console.log(`==================================================\n`)

  // 1. Ensure working directory is clean
  const status = runOut('git status --porcelain')
  if (status) {
    console.error('Error: Working directory has uncommitted changes. Stash or commit them before running.')
    process.exit(1)
  }

  // 2. Fetch and pull latest changes from remote
  console.log(`[1/5] Fetching and pulling latest changes from origin/${branch}...`)
  try {
    run(`git fetch origin ${branch}`)
    run(`git pull origin ${branch}`)
  } catch {
    console.warn('Note: Pull encountered a notice or was already up to date.')
  }

  // 3. Configure local git config just in case
  console.log(`[2/5] Setting local git config author details...`)
  run(`git config user.name "${TARGET_NAME}"`)
  run(`git config user.email "${TARGET_EMAIL}"`)

  // 4. Remove previous filter-branch backup refs if any
  try {
    execSync('git for-each-ref --format="%(refname)" refs/original/ | xargs -r git update-ref -d', { stdio: 'ignore' })
  } catch {
    // ignore if xargs or ref not present
  }

  // 5. Rewrite history using git filter-branch
  console.log(`[3/5] Rewriting all commit authors & committers to ${TARGET_NAME} <${TARGET_EMAIL}>...`)
  const filterScript = [
    'if [ "$GIT_AUTHOR_EMAIL" != "' + TARGET_EMAIL + '" ] || [ "$GIT_AUTHOR_NAME" != "' + TARGET_NAME + '" ]; then',
    '    export GIT_AUTHOR_NAME="' + TARGET_NAME + '";',
    '    export GIT_AUTHOR_EMAIL="' + TARGET_EMAIL + '";',
    'fi;',
    'if [ "$GIT_COMMITTER_EMAIL" != "' + TARGET_EMAIL + '" ] || [ "$GIT_COMMITTER_NAME" != "' + TARGET_NAME + '" ]; then',
    '    export GIT_COMMITTER_NAME="' + TARGET_NAME + '";',
    '    export GIT_COMMITTER_EMAIL="' + TARGET_EMAIL + '";',
    'fi;',
  ].join(' ')

  run(`git filter-branch -f --env-filter '${filterScript}' ${branch}`, {
    FILTER_BRANCH_SQUELCH_WARNING: '1',
  })

  // 6. Verify authors
  console.log(`\n[4/5] Verifying rewritten commit authors...`)
  const authors = runOut(`git log ${branch} --format="%an <%ae>"`)
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
  const uniqueAuthors = Array.from(new Set(authors))
  console.log(`Authors present on branch ${branch}:`)
  for (const a of uniqueAuthors) {
    console.log(`  - ${a}`)
  }

  // 7. Push to origin
  console.log(`\n[5/5] Pushing rewritten history to origin/${branch}...`)
  run(`git push origin ${branch} --force`)

  console.log(`\n==================================================`)
  console.log(` SUCCESS: All commits on ${branch} are now owned by:`)
  console.log(` ${TARGET_NAME} <${TARGET_EMAIL}>`)
  console.log(` Remote origin/${branch} updated successfully!`)
  console.log(`==================================================\n`)
}

main().catch((err) => {
  console.error('\nError running git:claim:', err.message || err)
  process.exit(1)
})
