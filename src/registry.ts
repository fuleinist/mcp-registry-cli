import { MCPServer } from './types';

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