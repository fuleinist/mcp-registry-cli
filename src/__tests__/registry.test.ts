import { searchServers, getServerByName, getServersPage } from '../registry';

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
});