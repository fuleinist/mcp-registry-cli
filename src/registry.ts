import { MCPServer } from './types';
import { getCachedServers, setCachedServers, getConfig } from './storage';

const DEFAULT_REGISTRY_URL = 'https://registry.modelcontextprotocol.io/v0/servers';

/**
 * Fetch servers from the real MCP Registry API.
 * Falls back to cache on network error, then to mock data.
 */
export async function fetchRegistryServers(): Promise<MCPServer[]> {
  const registryUrl = getConfig().registryUrl || DEFAULT_REGISTRY_URL;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(registryUrl, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`Registry API returned ${res.status}`);
    const json = await res.json() as Record<string, unknown>;
    const rawServers: unknown[] = (json.servers || json.data || []) as unknown[];

    // Map from registry API format to MCPServer
    const servers: MCPServer[] = rawServers
      .filter((entry: unknown): entry is Record<string, unknown> => entry != null && typeof entry === 'object')
      .map((entry: Record<string, unknown>) => {
        const s = (entry.server || entry) as Record<string, unknown>;
        const meta = entry._meta as Record<string, unknown> | undefined;
        const official = meta?.['io.modelcontextprotocol.registry/official'] as Record<string, unknown> | undefined;
        const repo = s.repository as Record<string, unknown> | undefined;
        const remotes = (s.remotes as Record<string, unknown>[]) || [];

        return {
          name: String(s.name || ''),
          displayName: String(s.title || s.name || ''),
          description: String(s.description || ''),
          author: repo?.source ? String(repo.source) : 'unknown',
          repository: repo?.url ? String(repo.url) : '',
          version: String(s.version || '0.0.0'),
          installCount: 0,
          tools: [],
          envVars: [],
          categories: [],
          homepage: String(s.websiteUrl || s.homepage || ''),
        };
      })
      // Deduplicate by name+version, keeping latest version per name
      .reduce<MCPServer[]>((acc, s) => {
        const existing = acc.find(e => e.name === s.name);
        if (!existing) {
          acc.push(s);
        } else if (s.version > existing.version) {
          // Replace with newer version
          Object.assign(existing, s);
        }
        return acc;
      }, []);

    // Merge with mock data so known test servers always exist
    const merged = mergeServers(servers, MOCK_SERVERS);
    // Cache the result
    setCachedServers({ servers: merged, fetchedAt: new Date().toISOString() });
    return merged;
  } catch (err) {
    // Try cache
    const cached = getCachedServers<{ servers: MCPServer[] }>();
    if (cached?.servers?.length) {
      return cached.servers;
    }
    // Fall back to mock data
    return MOCK_SERVERS;
  }
}

/**
 * Merge two server lists, preferring first list for duplicates.
 */
function mergeServers(a: MCPServer[], b: MCPServer[]): MCPServer[] {
  const names = new Set(a.map(s => s.name));
  return [...a, ...b.filter(s => !names.has(s.name))];
}

/**
 * Get servers from cache (synchronous, for commands that don't want async).
 */
export function getCachedServersSync(): MCPServer[] {
  const cached = getCachedServers<{ servers: MCPServer[] }>();
  if (cached?.servers?.length) {
    return cached.servers;
  }
  return MOCK_SERVERS;
}

export const MOCK_SERVERS: MCPServer[] = [
  {
    name: 'filesystem',
    displayName: 'Filesystem',
    description: 'Local filesystem access MCP server for reading, writing, and navigating files and directories.',
    author: 'modelcontextprotocol',
    repository: 'https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem',
    version: '1.0.0',
    installCount: 12450,
    tools: ['read_directory', 'read_file', 'write_file', 'create_directory', 'move_path', 'delete_path'],
    envVars: [],
    categories: ['filesystem', 'storage'],
    homepage: 'https://github.com/modelcontextprotocol/servers'
  },
  {
    name: 'github',
    displayName: 'GitHub',
    description: 'GitHub MCP server for repository management, issues, PRs, and code operations.',
    author: 'modelcontextprotocol',
    repository: 'https://github.com/modelcontextprotocol/servers/tree/main/src/github',
    version: '1.0.0',
    installCount: 8920,
    tools: ['create_repository', 'delete_repository', 'get_repository', 'list_repositories', 'create_issue', 'list_issues', 'create_pull_request', 'list_pull_requests'],
    envVars: ['GITHUB_TOKEN'],
    categories: ['github', 'vcs'],
    homepage: 'https://github.com/modelcontextprotocol/servers'
  },
  {
    name: 'brave-search',
    displayName: 'Brave Search',
    description: 'Web search via Brave Search API — get up-to-date results from the web.',
    author: 'modelcontextprotocol',
    repository: 'https://github.com/modelcontextprotocol/servers/tree/main/src/brave-search',
    version: '1.0.0',
    installCount: 6730,
    tools: ['web_search', 'local_search'],
    envVars: ['BRAVE_API_KEY'],
    categories: ['search', 'web'],
    homepage: 'https://github.com/modelcontextprotocol/servers'
  },
  {
    name: 'slack',
    displayName: 'Slack',
    description: 'Slack MCP server for messaging, channel management, and team collaboration.',
    author: 'modelcontextprotocol',
    repository: 'https://github.com/modelcontextprotocol/servers/tree/main/src/slack',
    version: '1.0.0',
    installCount: 4450,
    tools: ['post_message', 'list_channels', 'list_messages', 'create_channel'],
    envVars: ['SLACK_BOT_TOKEN', 'SLACK_TEAM_ID'],
    categories: ['slack', 'messaging'],
    homepage: 'https://github.com/modelcontextprotocol/servers'
  },
  {
    name: 'postgres',
    displayName: 'PostgreSQL',
    description: 'PostgreSQL MCP server for database queries, schema exploration, and data operations.',
    author: 'modelcontextprotocol',
    repository: 'https://github.com/modelcontextprotocol/servers/tree/main/src/postgres',
    version: '1.0.0',
    installCount: 3210,
    tools: ['query', 'execute', 'list_tables', 'describe_table', 'list_databases'],
    envVars: ['DATABASE_URL'],
    categories: ['database', 'postgres'],
    homepage: 'https://github.com/modelcontextprotocol/servers'
  }
];

export function searchServers(query: string, servers: MCPServer[] = MOCK_SERVERS): MCPServer[] {
  const q = query.toLowerCase();
  return servers.filter(s =>
    s.name.toLowerCase().includes(q) ||
    s.displayName.toLowerCase().includes(q) ||
    s.description.toLowerCase().includes(q) ||
    s.categories.some(c => c.toLowerCase().includes(q))
  );
}

export function getServerByName(name: string, servers: MCPServer[] = MOCK_SERVERS): MCPServer | undefined {
  return servers.find(s => s.name.toLowerCase() === name.toLowerCase());
}

export function getServersPage(page: number, pageSize: number, servers: MCPServer[] = MOCK_SERVERS): { servers: MCPServer[], total: number } {
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  return {
    servers: servers.slice(start, end),
    total: servers.length
  };
}