import fs from 'node:fs';
import path from 'node:path';
import { deriveBaseHrefFromLinkBase } from './derive-base-href.mjs';
import { frontendRoot, readEnvVar } from './read-env.mjs';

const appConfigLocalPath = path.join(frontendRoot, 'src', 'assets', 'app-config.local.js');

function syncLocalApiKeys() {
  const hereApiKey = readEnvVar('HERE_API_KEY');
  const cartoApiKey = readEnvVar('CARTO_API_KEY');
  const localConfigContent = `// Локальний runtime-конфіг (генерується автоматично, не комітити).
window.__APP_CONFIG__ = {
  ...(window.__APP_CONFIG__ || {}),
  hereApiKey: ${JSON.stringify(hereApiKey)},
  cartoApiKey: ${JSON.stringify(cartoApiKey)}
};
`;
  fs.writeFileSync(appConfigLocalPath, localConfigContent, 'utf8');
}

function validateLinkBases() {
  const verificationLinkBase = readEnvVar('EMAIL_VERIFICATION_LINK_BASE');
  const resetLinkBase = readEnvVar('PASSWORD_RESET_LINK_BASE');

  const verificationBaseHref = deriveBaseHrefFromLinkBase(verificationLinkBase);
  const resetBaseHref = deriveBaseHrefFromLinkBase(resetLinkBase);

  if (verificationLinkBase && resetLinkBase && verificationBaseHref !== resetBaseHref) {
    console.warn(
      `[sync-from-env] Увага: base-href з EMAIL_VERIFICATION_LINK_BASE (${verificationBaseHref}) ` +
        `не збігається з PASSWORD_RESET_LINK_BASE (${resetBaseHref}).`
    );
  }

  if (verificationLinkBase) {
    console.log(
      `[sync-from-env] Frontend base-href (з EMAIL_VERIFICATION_LINK_BASE): ${verificationBaseHref}`
    );
  }

  return verificationBaseHref;
}

syncLocalApiKeys();
validateLinkBases();
