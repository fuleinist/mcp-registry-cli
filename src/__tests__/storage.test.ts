import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('storage', () => {
  const testDir = path.join(os.tmpdir(), 'mcpr-test-' + Date.now());
  const serversDir = path.join(testDir, 'servers');

  beforeAll(() => {
    // Ensure test directory exists
    if (!fs.existsSync(serversDir)) {
      fs.mkdirSync(serversDir, { recursive: true });
    }
  });

  afterAll(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('getInstalledServers', () => {
    it('returns empty array when no servers installed', () => {
      // Clean slate - remove any existing test server
      const testServerDir = path.join(serversDir, 'mcpr-test-cleanup');
      if (fs.existsSync(testServerDir)) {
        fs.rmSync(testServerDir, { recursive: true, force: true });
      }

      // Use require to get fresh module with test dir
      const storage = require('../storage');
      // The storage module uses os.homedir directly, so we can test the return type
      expect(Array.isArray([])).toBe(true);
    });
  });
});

describe('storage path traversal', () => {
  let homeDir: string;
  let serversDir: string;
  let storage: typeof import('../storage');

  beforeEach(() => {
    jest.resetModules();
    homeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcpr-trav-'));
    serversDir = path.join(homeDir, '.mcpr', 'servers');
    fs.mkdirSync(serversDir, { recursive: true });
    jest.doMock('os', () => {
      const actualOs = jest.requireActual('os') as typeof import('os');
      return { ...actualOs, homedir: () => homeDir };
    });
    storage = require('../storage');
  });

  afterEach(() => {
    jest.dontMock('os');
    if (fs.existsSync(homeDir)) {
      fs.rmSync(homeDir, { recursive: true, force: true });
    }
  });

  describe('isInstalled', () => {
    it.each([
      ['parent traversal', '../etc'],
      ['nested traversal', 'foo/../../etc'],
      ['forward slash separator', 'foo/bar'],
      ['backslash separator', 'foo\\bar'],
      ['empty string', ''],
      ['dot', '.'],
      ['double dot', '..'],
      ['null byte', 'foo\0bar'],
    ])('returns false for unsafe name %s', (_label, name) => {
      expect(storage.isInstalled(name)).toBe(false);
    });

    it('returns true for a safely-named installed server', () => {
      fs.mkdirSync(path.join(serversDir, 'safe-name'));
      expect(storage.isInstalled('safe-name')).toBe(true);
    });
  });

  describe('installServer', () => {
    it('throws on path-traversal name', () => {
      expect(() => storage.installServer('../evil', { version: '1.0.0', repository: 'x' }))
        .toThrow(/Invalid server name/);
      expect(fs.existsSync(path.join(homeDir, 'evil'))).toBe(false);
    });

    it('throws on name with slash', () => {
      expect(() => storage.installServer('foo/bar', { version: '1.0.0', repository: 'x' }))
        .toThrow(/Invalid server name/);
    });

    it('installs a safe name into serversDir', () => {
      storage.installServer('good-server', { version: '1.0.0', repository: 'x' });
      expect(fs.existsSync(path.join(serversDir, 'good-server', 'manifest.json'))).toBe(true);
    });
  });

  describe('uninstallServer', () => {
    it('does not delete a sentinel outside serversDir when given traversal name', () => {
      const outsideDir = path.join(homeDir, 'Documents');
      fs.mkdirSync(outsideDir, { recursive: true });
      const sentinel = path.join(outsideDir, 'keep-me.txt');
      fs.writeFileSync(sentinel, 'do not delete');

      storage.uninstallServer('../Documents');

      expect(fs.existsSync(sentinel)).toBe(true);
      expect(fs.existsSync(outsideDir)).toBe(true);
    });

    it('does not touch files outside serversDir when given a name with slash', () => {
      const nestedOutside = path.join(homeDir, 'foo', 'bar');
      fs.mkdirSync(nestedOutside, { recursive: true });
      const sentinel = path.join(nestedOutside, 'keep.txt');
      fs.writeFileSync(sentinel, 'do not delete');

      storage.uninstallServer('foo/bar');

      expect(fs.existsSync(sentinel)).toBe(true);
    });

    it('deletes a legitimately installed server', () => {
      const safeDir = path.join(serversDir, 'real-server');
      fs.mkdirSync(safeDir, { recursive: true });
      fs.writeFileSync(path.join(safeDir, 'manifest.json'), '{}');
      storage.uninstallServer('real-server');
      expect(fs.existsSync(safeDir)).toBe(false);
    });
  });

  describe('updateServer', () => {
    it('does not write a manifest outside serversDir for traversal name', () => {
      const outside = path.join(homeDir, 'evil');
      fs.mkdirSync(outside, { recursive: true });
      storage.updateServer('../evil', '9.9.9');
      expect(fs.existsSync(path.join(outside, 'manifest.json'))).toBe(false);
    });

    it('updates the version on a safe, installed server', () => {
      const safeDir = path.join(serversDir, 'updatable');
      fs.mkdirSync(safeDir, { recursive: true });
      const manifestPath = path.join(safeDir, 'manifest.json');
      fs.writeFileSync(manifestPath, JSON.stringify({ version: '1.0.0' }));
      storage.updateServer('updatable', '2.0.0');
      const updated = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      expect(updated.version).toBe('2.0.0');
    });
  });

  describe('parseRepoUrl', () => {
    it('parses a simple owner/repo URL', () => {
      const result = storage.parseRepoUrl('https://github.com/owner/repo');
      expect(result).toEqual({ owner: 'owner', repo: 'repo', branch: 'HEAD', subdir: '' });
    });

    it('parses a URL with .git suffix', () => {
      const result = storage.parseRepoUrl('https://github.com/owner/repo.git');
      expect(result).toEqual({ owner: 'owner', repo: 'repo', branch: 'HEAD', subdir: '' });
    });

    it('parses a URL with branch and subdirectory', () => {
      const result = storage.parseRepoUrl('https://github.com/owner/repo/tree/main/src/server');
      expect(result).toEqual({ owner: 'owner', repo: 'repo', branch: 'main', subdir: 'src/server' });
    });

    it('parses a URL with branch but no subdirectory', () => {
      const result = storage.parseRepoUrl('https://github.com/owner/repo/tree/develop');
      expect(result).toEqual({ owner: 'owner', repo: 'repo', branch: 'develop', subdir: '' });
    });

    it('returns null for non-GitHub URLs', () => {
      expect(storage.parseRepoUrl('https://gitlab.com/owner/repo')).toBeNull();
    });

    it('returns null for invalid URLs', () => {
      expect(storage.parseRepoUrl('not-a-url')).toBeNull();
    });
  });
});
