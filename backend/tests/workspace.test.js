import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const packageJson = require('../package.json');

describe('backend workspace configuration', () => {
  it('uses ES modules and exposes the initial workspace scripts', () => {
    expect(packageJson.type).toBe('module');
    expect(packageJson.scripts).toMatchObject({
      dev: 'node src/workspace-ready.js',
      lint: 'eslint .',
      test: 'vitest run',
    });
  });
});
