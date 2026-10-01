/** Real Shiro browser acceptance, replacing the old hard-coded coverage matrix.
 * Requires a production build, local blog_studio DB, and installed Chrome.
 * Usage: E2E_PORT=3100 node --import tsx tests/e2e/runner.ts
 */
import { spawnSync } from 'node:child_process'
const run = (args: string[]) =>
  spawnSync(process.execPath, args, { stdio: 'inherit', env: process.env }).status ?? 1
let status = run(['--import', 'tsx', 'scripts/shiro-test-fixture.ts'])
if (status === 0) {
  try {
    status = run([
      'node_modules/@playwright/test/cli.js',
      'test',
      'shiro-migration.e2e.spec.ts',
      '--workers=1',
    ])
  } finally {
    const cleanup = run(['--import', 'tsx', 'scripts/shiro-test-fixture.ts', '--cleanup'])
    if (cleanup !== 0) status = cleanup
  }
}
process.exit(status)
