import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface Config {
  registryUrl: string;
}

const DEFAULT_CONFIG: Config = {
  registryUrl: process.env.MCPR_REGISTRY_URL || 'https://registry.modelcontextprotocol.dev'
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

export function isInstalled(name: string): boolean {
  const serversDir = getServersDir();
  return fs.existsSync(path.join(serversDir, name));
}

export function installServer(name: string, serverData: { version: string, repository: string }): void {
  const serversDir = getServersDir();
  ensureDir(serversDir);
  
  const serverDir = path.join(serversDir, name);
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
}

export function uninstallServer(name: string): void {
  const serverDir = path.join(getServersDir(), name);
  if (fs.existsSync(serverDir)) {
    fs.rmSync(serverDir, { recursive: true, force: true });
  }
}

export function updateServer(name: string, newVersion: string): void {
  const manifestPath = path.join(getServersDir(), name, 'manifest.json');
  if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    manifest.version = newVersion;
    manifest.updatedAt = new Date().toISOString();
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  }
}