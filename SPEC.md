# MCP Registry CLI — SPEC

## 1. Concept & Vision

A sleek CLI tool that lets developers discover, browse, install, and manage MCP (Model Context Protocol) servers from a community registry — with the same speed and ergonomics as `npm install` or `brew install`. No more hunting through GitHub issues or Discord threads to find the right MCP server.

## 2. Core Features

- **Search** — `mcpr search <query>` queries the registry API and returns matching MCP servers with name, description, and install count
- **Browse** — `mcpr list` shows top/recommended servers with pagination
- **Info** — `mcpr info <name>` shows full details: description, author, repo, tools, installation instructions, required environment variables
- **Install** — `mcpr install <name>` clones or downloads the MCP server and installs it to `~/.mcpr/servers/`
- **List Installed** — `mcpr installed` shows all locally installed servers with their versions
- **Uninstall** — `mcpr uninstall <name>` removes an installed server
- **Update** — `mcpr update <name>` pulls the latest version

## 3. Technical Approach

- **Runtime:** Node.js 20+, TypeScript
- **CLI Framework:** Commander.js
- **Registry API:** JSON-based registry (mock at first with real API structure)
- **Install destination:** `~/.mcpr/servers/<server-name>/`
- **Registry URL:** configurable via `MCPR_REGISTRY_URL` env var; default to community registry
- **No external runtime deps** — the CLI itself installs as an npm package

## 4. Command Interface

```
mcpr --version
mcpr --help

mcpr search <query>           # search registry
mcpr list [--page N] [--limit N]  # browse with pagination
mcpr info <name>              # show server details
mcpr install <name> [--version <v>]  # install to ~/.mcpr/servers/
mcpr installed                # list installed servers
mcpr uninstall <name>         # remove installed server
mcpr update [name]            # update installed server(s)
```

## 5. Data Model

### Registry Server Entry
```json
{
  "name": "filesystem",
  "displayName": "Filesystem",
  "description": "Local filesystem access MCP server",
  "author": "modelcontextprotocol",
  "repository": "https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem",
  "version": "1.0.0",
  "installCount": 12450,
  "tools": ["read_directory", "read_file", "write_file", "edit_file"],
  "envVars": [],
  "categories": ["filesystem", "storage"],
  "homepage": "https://github.com/modelcontextprotocol/servers"
}
```

### Local Config
- `~/.mcpr/config.json` — registry URL, settings
- `~/.mcpr/servers/` — installed server directories

## 6. Acceptance Criteria

1. `mcpr --version` prints the version
2. `mcpr search <query>` returns matching servers from the registry
3. `mcpr info <name>` shows full server details
4. `mcpr install <name>` installs a server to `~/.mcpr/servers/`
5. `mcpr installed` lists all installed servers
6. `mcpr uninstall <name>` removes an installed server
7. `mcpr update <name>` updates a server to latest
8. Commands exit with useful error messages for missing args, network errors, not-found servers
9. `mcpr --help` shows all commands with descriptions
10. Full test suite with unit tests for core logic

## 7. Scope for Day 1 MVP

Build the CLI with hardcoded mock registry data (3-5 servers). Wire up all commands. Make it installable. Tests pass. Then add real API integration in a follow-up.