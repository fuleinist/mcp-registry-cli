import { execSync } from 'child_process';
import * as path from 'path';

const CLI = path.join(__dirname, '..', 'index.ts');

function runCli(args: string): string {
  return execSync(`npx ts-node ${CLI} ${args}`, {
    encoding: 'utf-8',
  });
}

describe('mcpr status --json', () => {
  it('outputs JSON with version, registryUrl, cache, and installedCount', () => {
    const out = runCli('status --json');
    const parsed = JSON.parse(out);

    expect(typeof parsed.version).toBe('string');
    expect(parsed.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(typeof parsed.registryUrl).toBe('string');
    expect(parsed.registryUrl).toMatch(/^https?:\/\//);
    expect(parsed.cache).toEqual(
      expect.objectContaining({
        exists: expect.any(Boolean),
      }),
    );
    expect(typeof parsed.installedCount).toBe('number');
    expect(parsed.installedCount).toBeGreaterThanOrEqual(0);
  });

  it('reports installedCount as a number even when nothing is installed', () => {
    const out = runCli('status --json');
    const parsed = JSON.parse(out);
    expect(Number.isInteger(parsed.installedCount)).toBe(true);
  });
});
