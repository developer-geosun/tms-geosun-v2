import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const frontendRoot = path.resolve(__dirname, '..');
export const repoRoot = path.resolve(frontendRoot, '..');
export const envPath = path.join(repoRoot, '.env');

/**
 * Читає змінну з process.env або кореневого .env (без dotenv).
 */
export function readEnvVar(name) {
  const processValue = process.env[name];
  if (typeof processValue === 'string' && processValue.trim().length > 0) {
    return processValue.trim();
  }

  if (!fs.existsSync(envPath)) {
    return '';
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split(/\r?\n/);
  for (const line of lines) {
    if (!line || line.trim().startsWith('#')) {
      continue;
    }
    const separatorIndex = line.indexOf('=');
    if (separatorIndex < 0) {
      continue;
    }
    const key = line.slice(0, separatorIndex).trim();
    if (key !== name) {
      continue;
    }
    const rawValue = line.slice(separatorIndex + 1).trim();
    return rawValue.replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
  }

  return '';
}
