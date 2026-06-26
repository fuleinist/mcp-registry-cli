import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';

export interface Config {
  registryUrl: string;
}

const DEFAULT_CONFIG: Config = {
  registryUrl: process.env.MCPR_REGISTRY_URL || 'https://registry.modelcontextprotocol.io/v0/servers'
};

function getMcprDir(): string {
  return path.join(os.homedir(), '.mcpr');
}

function getServersDir(): string {
  return path.join(getMcprDir(), 'servers');
}

function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

export function getCachePath(): string {
  return path.join(getMcprDir(), 'cache.json');
}

export function getCachedServers<T>(): T | null {
  const cachePath = getCachePath();
  if (!fs.existsSync(cachePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
  } catch {
    return null;
  }
}

export function setCachedServers<T>(data: T): void {
  ensureDir(getMcprDir());
  fs.writeFileSync(getCachePath(), JSON.stringify(data, null, 2));
}

export function clearCache(): void {
  const cachePath = getCachePath();
  if (fs.existsSync(cachePath)) {
    fs.unlinkSync(cachePath);
  }
}

export function getConfig(): Config {
  ensureDir(getMcprDir());
  const configPath = path.join(getMcprDir(), 'config.json');
  if (fs.existsSync(configPath)) {
    try {
      return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    } catch {
      return DEFAULT_CONFIG;
    }
  }
  return DEFAULT_CONFIG;
}

export function saveConfig(config: Config): void {
  ensureDir(getMcprDir());
  const configPath = path.join(getMcprDir(), 'config.json');
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

export interface InstalledServerInfo {
  name: string;
  version: string;
  installPath: string;
  installedAt: string;
}

export function getInstalledServers(): InstalledServerInfo[] {
  const serversDir = getServersDir();
  ensureDir(serversDir);
  
  const entries = fs.readdirSync(serversDir, { withFileTypes: true });
  const installed: InstalledServerInfo[] = [];
  
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const manifestPath = path.join(serversDir, entry.name, 'manifest.json');
      if (fs.existsSync(manifestPath)) {
        try {
          const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
          installed.push({
            name: entry.name,
            version: manifest.version || 'unknown',
            installPath: path.join(serversDir, entry.name),
            installedAt: manifest.installedAt || 'unknown'
          });
        } catch {
          installed.push({
            name: entry.name,
            version: 'unknown',
            installPath: path.join(serversDir, entry.name),
            installedAt: 'unknown'
          });
        }
      }
    }
  }
  
  return installed.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Resolve a server name to an absolute directory under serversDir, refusing
 * any name that would escape it. Returns null if the name is unsafe.
 *
 * Unsafe names contain path separators, null bytes, or `..` segments, or
 * resolve to a path outside serversDir.
 */
function safeServerPath(name: string, serversDir: string = getServersDir()): string | null {
  if (typeof name !== 'string' || name.length === 0) return null;
  if (name.includes('/') || name.includes('\\') || name.includes('\0')) return null;
  if (name === '.' || name === '..' || name.split(/[\\/]/).includes('..')) return null;

  const resolved = path.resolve(serversDir, name);
  const root = path.resolve(serversDir) + path.sep;
  if (!(resolved + path.sep).startsWith(root)) return null;
  return resolved;
}

export function isInstalled(name: string): boolean {
  const dir = safeServerPath(name);
  return dir !== null && fs.existsSync(dir);
}

/**
 * Parse a GitHub repository URL into owner, repo, branch, and subdirectory.
 * Handles:
 *   - https://github.com/owner/repo
 *   - https://github.com/owner/repo/tree/branch/path
 *   - https://github.com/owner/repo.git
 */
export function parseRepoUrl(url: string): { owner: string; repo: string; branch: string; subdir: string } | null {
  try {
    const u = new URL(url);
    if (u.hostname !== 'github.com') return null;

    const parts = u.pathname.replace(/\.git$/, '').split('/').filter(Boolean);
    if (parts.length < 2) return null;

    const owner = parts[0];
    const repo = parts[1];
    let branch = 'HEAD';
    let subdir = '';

    if (parts[2] === 'tree' && parts[3]) {
      branch = parts[3];
      subdir = parts.slice(4).join('/');
    }

    return { owner, repo, branch, subdir };
  } catch {
    return null;
  }
}

/**
 * Download server source code from a GitHub repository URL.
 * Clones with --depth 1. For monorepo URLs (containing /tree/),
 * extracts only the relevant subdirectory.
 *
 * Fail-soft: if git is unavailable or the clone fails, the server
 * directory still contains the manifest and README.
 */
export function downloadServerCode(serverDir: string, repository: string): void {
  // Allow tests to skip network-heavy clone
  if (process.env.MCPR_SKIP_DOWNLOAD) return;

  const parsed = parseRepoUrl(repository);
  if (!parsed) return;

  const cloneUrl = `https://github.com/${parsed.owner}/${parsed.repo}.git`;
  const cloneDir = path.join(os.tmpdir(), `mcpr-clone-${Date.now()}`);

  try {
    execSync(`git clone --depth 1 --branch ${parsed.branch} "${cloneUrl}" "${cloneDir}"`, {
      stdio: 'pipe',
      timeout: 60000,
    });

    const sourceDir = parsed.subdir ? path.join(cloneDir, parsed.subdir) : cloneDir;

    if (fs.existsSync(sourceDir)) {
      const entries = fs.readdirSync(sourceDir);
      for (const entry of entries) {
        if (entry === '.git') continue;
        const src = path.join(sourceDir, entry);
        const dst = path.join(serverDir, entry);
        // Don't overwrite manifest.json or README.md
        if (entry === 'manifest.json' || entry === 'README.md') continue;
        if (fs.existsSync(dst)) {
          fs.rmSync(dst, { recursive: true, force: true });
        }
        fs.renameSync(src, dst);
      }
    }

    // Install production dependencies if package.json exists
    const pkgPath = path.join(serverDir, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        execSync('npm install --production --no-audit --no-fund', {
          cwd: serverDir,
          stdio: 'pipe',
          timeout: 120000,
        });
      } catch {
        // Non-fatal: user can run npm install manually
      }
    }
  } catch {
    // Non-fatal: server is registered even if code download fails
  } finally {
    if (fs.existsSync(cloneDir)) {
      fs.rmSync(cloneDir, { recursive: true, force: true });
    }
  }
}

export function installServer(name: string, serverData: { version: string, repository: string }): void {
  const serversDir = getServersDir();
  ensureDir(serversDir);

  const serverDir = safeServerPath(name, serversDir);
  if (serverDir === null) {
    throw new Error(`Invalid server name: "${name}"`);
  }
  ensureDir(serverDir);
  
  // Create manifest
  const manifest = {
    name,
    version: serverData.version,
    repository: serverData.repository,
    installedAt: new Date().toISOString()
  };
  
  fs.writeFileSync(
    path.join(serverDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2)
  );
  
  // Create a placeholder README
  fs.writeFileSync(
    path.join(serverDir, 'README.md'),
    `# ${name}\n\nInstalled via mcp-registry-cli\n\nRepository: ${serverData.repository}\nVersion: ${serverData.version}\n`
  );

  // Download server source code (best-effort, non-fatal)
  downloadServerCode(serverDir, serverData.repository);
}

export function uninstallServer(name: string): void {
  const serverDir = safeServerPath(name);
  if (serverDir !== null && fs.existsSync(serverDir)) {
    fs.rmSync(serverDir, { recursive: true, force: true });
  }
}

export function updateServer(name: string, newVersion: string): void {
  const serverDir = safeServerPath(name);
  const manifestPath = serverDir !== null ? path.join(serverDir, 'manifest.json') : null;
  if (manifestPath !== null && fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    manifest.version = newVersion;
    manifest.updatedAt = new Date().toISOString();
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  }
}