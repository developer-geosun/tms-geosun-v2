import { spawnSync } from 'node:child_process';
import { deriveBaseHrefFromLinkBase } from './derive-base-href.mjs';
import { readEnvVar } from './read-env.mjs';

const verificationLinkBase = readEnvVar('EMAIL_VERIFICATION_LINK_BASE');
const baseHref = deriveBaseHrefFromLinkBase(verificationLinkBase);

console.log(`[deploy] base-href=${baseHref} (from EMAIL_VERIFICATION_LINK_BASE)`);

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32'
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

run('npx', ['ng', 'build', '--configuration', 'production', `--base-href=${baseHref}`]);
run('npx', ['gh-pages@latest', '-d', 'dist/tms-geosun']);
