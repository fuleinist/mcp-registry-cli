import { execSync } from 'child_process';
import * as path from 'path';

const CLI = path.join(__dirname, '..', 'index.ts');

function runCli(args: string): string {
  return execSync(`npx ts-node ${CLI} ${args}`, {
    encoding: 'utf-8',
  });
}

describe('mcpr search --json', () => {
  it('outputs JSON containing the query, count, and matching servers', () => {
    const out = runCli('search filesystem --json');
    // ts-node may print a "Searching registry..." spinner line; strip it.
    const json = out.replace(/^- Searching registry\.\.\.\n/m, '');
    const parsed = JSON.parse(json);

    expect(parsed.query).toBe('filesystem');
    expect(parsed.count).toBe(1);
    expect(parsed.results).toHaveLength(1);
    expect(parsed.results[0].name).toBe('filesystem');
  });

  it('returns an empty results array for no matches', () => {
    const out = runCli('search definitely-no-such-server-xyzzy --json');
    const json = out.replace(/^- Searching registry\.\.\.\n/m, '');
    const parsed = JSON.parse(json);

    expect(parsed.query).toBe('definitely-no-such-server-xyzzy');
    expect(parsed.count).toBe(0);
    expect(parsed.results).toEqual([]);
  });
});
