import { execSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const CLI = path.join(__dirname, '..', 'index.ts');

function runCli(args: string): string {
  return execSync(`npx ts-node ${CLI} ${args}`, {
    encoding: 'utf-8',
    env: { ...process.env, MCPR_REGISTRY_URL: 'http://localhost:1' },
  });
}

function readManifest(name: string): { version: string; name: string } {
  const manifestPath = path.join(os.homedir(), '.mcpr', 'servers', name, 'manifest.json');
  return JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
}

function removeServer(name: string): void {
  const dir = path.join(os.homedir(), '.mcpr', 'servers', name);
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// Use a known-good mock server for happy-path install. `filesystem` is
// listed in src/registry.ts MOCK_SERVERS.
const TEST_SERVER = 'filesystem';

describe('mcpr install --target-version flag (regression: --version shadow)', () => {
  beforeEach(() => removeServer(TEST_SERVER));
  afterEach(() => removeServer(TEST_SERVER));
  afterAll(() => removeServer(TEST_SERVER));

  it('accepts --target-version <v> and writes the specified version to the manifest', () => {
    runCli(`install --target-version 2.5.1 ${TEST_SERVER}`);
    const manifest = readManifest(TEST_SERVER);
    expect(manifest.name).toBe(TEST_SERVER);
    expect(manifest.version).toBe('2.5.1');
  });

  it('accepts short -v <v> and writes the specified version to the manifest', () => {
    runCli(`install -v 2.5.1 ${TEST_SERVER}`);
    const manifest = readManifest(TEST_SERVER);
    expect(manifest.version).toBe('2.5.1');
  });

  it('still treats --version as the global CLI flag (prints version, does not install)', () => {
    // Commander's program-level --version is exposed at the top level. After
    // this fix, `mcpr --version` (no subcommand) should print the version and
    // exit cleanly. `mcpr install --version` is no longer a valid invocation
    // for the install subcommand and should error rather than silently
    // shadowing the install path.
    const out = runCli('--version').trim();
    expect(out).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('install --help advertises --target-version, not --version', () => {
    const out = runCli('install --help');
    expect(out).toMatch(/--target-version/);
    expect(out).not.toMatch(/-v,\s+--version\b/);
  });
});
