import { execSync } from 'child_process';
import * as path from 'path';

const CLI = path.join(__dirname, '..', 'index.ts');

function runCli(args: string): string {
  return execSync(`npx ts-node ${CLI} ${args}`, {
    encoding: 'utf-8',
  });
}

describe('mcpr info --json', () => {
  it('outputs JSON with all server fields plus installed flag', () => {
    const out = runCli('info github --json');
    const parsed = JSON.parse(out);

    expect(parsed.name).toBe('github');
    expect(parsed.displayName).toBe('GitHub');
    expect(parsed.author).toBe('modelcontextprotocol');
    expect(parsed.version).toBe('1.0.0');
    expect(Array.isArray(parsed.tools)).toBe(true);
    expect(Array.isArray(parsed.envVars)).toBe(true);
    expect(parsed.installed).toBe(false);
  });

  it('still produces a non-zero exit for unknown servers', () => {
    try {
      runCli('info definitely-no-such-server-xyzzy --json');
      throw new Error('expected non-zero exit');
    } catch (err: any) {
      expect(err.status).not.toBe(0);
    }
  });
});
