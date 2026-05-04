# MCP Registry CLI

A CLI tool to discover, install, and manage MCP (Model Context Protocol) servers from a community registry — with the same speed and ergonomics as `npm install` or `brew install`.

## Installation

```bash
npm install -g mcp-registry-cli
```

Or run directly with npx:
```bash
npx mcp-registry-cli --help
```

## Usage

```bash
# Search for MCP servers
mcpr search filesystem

# List all available servers
mcpr list

# Get detailed info about a server
mcpr info github

# Install a server
mcpr install github

# List installed servers
mcpr installed

# Update installed servers
mcpr update

# Uninstall a server
mcpr uninstall github
```

## Commands

| Command | Description |
|---------|-------------|
| `mcpr search <query>` | Search for MCP servers in the registry |
| `mcpr list [--page N] [--limit N]` | List all available MCP servers (paginated) |
| `mcpr info <name>` | Show detailed information about an MCP server |
| `mcpr install <name>` | Install an MCP server to `~/.mcpr/servers/` |
| `mcpr installed` | List all locally installed MCP servers |
| `mcpr uninstall <name>` | Uninstall a locally installed MCP server |
| `mcpr update [name]` | Update an installed MCP server (or all if no name given) |

## Configuration

- Registry URL: defaults to `https://registry.modelcontextprotocol.dev`
- Override with `MCPR_REGISTRY_URL` environment variable

## License

MIT