import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { searchServers, getServerByName, getServersPage } from '../registry';

function rmCache() {
  const p = path.join(os.homedir(), '.mcpr', 'cache.json');
  if (fs.existsSync(p)) fs.unlinkSync(p);
}

function writeCache(servers: unknown[]) {
  const dir = path.join(os.homedir(), '.mcpr');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'cache.json'),
    JSON.stringify({ servers, fetchedAt: new Date().toISOString() }, null, 2)
  );
}

describe('registry', () => {
  describe('searchServers', () => {
    it('finds servers by name', () => {
      const results = searchServers('filesystem');
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('filesystem');
    });

    it('finds servers by category', () => {
      const results = searchServers('database');
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('postgres');
    });

    it('finds servers by description', () => {
      const results = searchServers('github');
      expect(results.length).toBeGreaterThan(0);
    });

    it('returns empty array for no matches', () => {
      const results = searchServers('nonexistent');
      expect(results).toHaveLength(0);
    });
  });

  describe('getServerByName', () => {
    it('returns server for exact name', () => {
      const server = getServerByName('github');
      expect(server).toBeDefined();
      expect(server!.name).toBe('github');
    });

    it('returns server case-insensitively', () => {
      const server = getServerByName('GITHUB');
      expect(server).toBeDefined();
    });

    it('returns undefined for unknown name', () => {
      const server = getServerByName('nonexistent');
      expect(server).toBeUndefined();
    });
  });

  describe('getServersPage', () => {
    it('returns paginated results', () => {
      const result = getServersPage(1, 2);
      expect(result.servers).toHaveLength(2);
      expect(result.total).toBe(5);
    });

    it('returns empty array for out of range page', () => {
      const result = getServersPage(99, 10);
      expect(result.servers).toHaveLength(0);
    });
  });

  describe('default server source (cache preferred over mocks)', () => {
    afterEach(() => rmCache());

    it('searchServers uses cached servers when cache exists', () => {
      writeCache([{
        name: 'custom-server', displayName: 'Custom', description: 'cached only',
        author: 'me', repository: '', version: '1.0.0', installCount: 0,
        tools: [], envVars: [], categories: [], homepage: '',
      }]);
      const results = searchServers('custom');
      expect(results.map(s => s.name)).toEqual(['custom-server']);
    });

    it('getServerByName uses cached servers when cache exists', () => {
      writeCache([{
        name: 'cached-only', displayName: 'Cached Only', description: '',
        author: '', repository: '', version: '1.0.0', installCount: 0,
        tools: [], envVars: [], categories: [], homepage: '',
      }]);
      const server = getServerByName('cached-only');
      expect(server).toBeDefined();
      expect(server!.name).toBe('cached-only');
    });

    it('getServersPage uses cached servers when cache exists', () => {
      const cached = Array.from({ length: 7 }, (_, i) => ({
        name: `cached-${i}`, displayName: `Cached ${i}`, description: '',
        author: '', repository: '', version: '1.0.0', installCount: 0,
        tools: [], envVars: [], categories: [], homepage: '',
      }));
      writeCache(cached);
      const result = getServersPage(1, 5);
      expect(result.total).toBe(7);
      expect(result.servers).toHaveLength(5);
      expect(result.servers[0].name).toBe('cached-0');
    });
  });
});