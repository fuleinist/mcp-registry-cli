export interface MCPServer {
  name: string;
  displayName: string;
  description: string;
  author: string;
  repository: string;
  version: string;
  installCount: number;
  tools: string[];
  envVars: string[];
  categories: string[];
  homepage: string;
}

export interface RegistryResponse {
  servers: MCPServer[];
  total: number;
  page: number;
  pageSize: number;
}

export interface InstalledServer {
  name: string;
  version: string;
  installPath: string;
  installedAt: string;
}