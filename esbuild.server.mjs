import { build } from 'esbuild';
import fs from 'fs';

const outDir = 'dist/server';
if (fs.existsSync(outDir)) {
  fs.rmSync(outDir, { recursive: true });
}
fs.mkdirSync(outDir, { recursive: true });

const shared = {
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'esm',
  sourcemap: false,
  minify: true,
  external: [
    'node-pty',
    'better-sqlite3',
  ],
  banner: {
    js: `
import { createRequire as __createRequire } from 'module';
const require = __createRequire(import.meta.url);
`.trim(),
  },
};

await Promise.all([
  build({
    ...shared,
    entryPoints: ['server/index.ts'],
    outfile: 'dist/server/index.js',
  }),
  build({
    ...shared,
    entryPoints: ['server/mcp-stdio-bridge.ts'],
    outfile: 'dist/server/mcp-stdio-bridge.js',
  }),
]);

console.log('Server bundled successfully');
