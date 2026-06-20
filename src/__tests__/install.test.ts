import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const CLI = path.join(__dirname, '..', 'index.ts');
const INSTALLED_DIR = path.join(os.homedir(), '.mcpr', 'servers', 'github');

function runCli(args: string): string {
  return execSync(`npx ts-node ${CLI} ${args}`, {
    encoding: 'utf-8',
  });
}

function cleanup() {
  if (fs.existsSync(INSTALLED_DIR)) {
    fs.rmSync(INSTALLED_DIR, { recursive: true, force: true });
  }
}

describe('mcpr install --json', () => {
  beforeEach(cleanup);
  afterEach(cleanup);
  afterAll(cleanup);

  it('outputs JSON with installed server info on success', () => {
    const out = runCli('install github --json');
    const parsed = JSON.parse(out);

    expect(parsed.name).toBe('github');
    expect(parsed.displayName).toBe('GitHub');
    expect(parsed.version).toBe('1.0.0');
    expect(parsed.repository).toContain('github');
    expect(parsed.installPath).toBe(INSTALLED_DIR);
    expect(typeof parsed.installedAt).toBe('string');
    expect(Number.isNaN(Date.parse(parsed.installedAt))).toBe(false);
    expect(parsed.alreadyInstalled).toBeUndefined();
  });

  it('respects -v version override in JSON output', () => {
    const out = runCli('install github -v 2.5.0 --json');
    const parsed = JSON.parse(out);

    expect(parsed.version).toBe('2.5.0');
    expect(parsed.installPath).toBe(INSTALLED_DIR);
  });

  it('reports alreadyInstalled:true on second install', () => {
    runCli('install github --json');
    const out = runCli('install github --json');
    const parsed = JSON.parse(out);

    expect(parsed.name).toBe('github');
    expect(parsed.alreadyInstalled).toBe(true);
    expect(parsed.installPath).toBe(INSTALLED_DIR);
    expect(typeof parsed.installedAt).toBe('string');
  });

  it('exits non-zero for unknown server even with --json', () => {
    try {
      runCli('install definitely-no-such-server-xyzzy --json');
      throw new Error('expected non-zero exit');
    } catch (err: any) {
      expect(err.status).not.toBe(0);
    }
  });
});
