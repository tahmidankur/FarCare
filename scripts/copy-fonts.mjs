// Copies the self-hosted Nunito font out of node_modules into fonts/.
// Run after updating @fontsource-variable/nunito: npm run fonts
import { copyFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const pkgDir = dirname(require.resolve('@fontsource-variable/nunito/package.json'));
const file = 'nunito-latin-wght-normal.woff2';
mkdirSync('fonts', { recursive: true });
copyFileSync(join(pkgDir, 'files', file), join('fonts', file));
console.log('Copied', file);
