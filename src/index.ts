#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Command } from 'commander';
import { searchServers, getServerByName, getServersPage, MOCK_SERVERS, fetchRegistryServers } from './registry';
import { getInstalledServers, isInstalled, installServer, uninstallServer, updateServer } from './storage';
import chalk from 'chalk';
import ora from 'ora';

const program = new Command();

program
  .name('mcpr')
  .description('CLI to discover, install, and manage MCP servers from a community registry')
  .version('1.0.0');

program
  .command('search <query>')
  .description('Search for MCP servers in the registry')
  .option('-j, --json', 'Output as JSON')
  .action((query, options) => {
    const spinner = ora('Searching registry...').start();
    const results = searchServers(query);
    spinner.stop();

    if (options.json) {
      console.log(JSON.stringify({ query, count: results.length, results }, null, 2));
      return;
    }

    if (results.length === 0) {
      console.log(chalk.yellow(`No servers found matching "${query}"`));
      return;
    }

    console.log(chalk.bold(`\nFound ${results.length} server(s):\n`));
    results.forEach(server => {
      console.log(chalk.cyan(`  ${server.displayName} (${server.name})`));
      console.log(`    ${server.description}`);
      console.log(`    ${chalk.gray('installs:')} ${server.installCount.toLocaleString()}  ${chalk.gray('version:')} ${server.version}`);
      console.log();
    });
  });

program
  .command('list')
  .description('List all available MCP servers (paginated)')
  .option('-p, --page <number>', 'Page number', '1')
  .option('-l, --limit <number>', 'Results per page', '10')
  .option('-j, --json', 'Output as JSON')
  .action((options) => {
    const page = parseInt(options.page, 10);
    const limit = parseInt(options.limit, 10);
    const spinner = ora('Fetching server list...').start();
    const { servers, total } = getServersPage(page, limit);
    spinner.stop();

    if (options.json) {
      console.log(JSON.stringify({ servers, total, page, limit }, null, 2));
      return;
    }

    console.log(chalk.bold(`\nMCP Server Registry (${total} total)\n`));
    servers.forEach(server => {
      console.log(chalk.cyan(`  ${server.displayName} (${server.name})`));
      console.log(`    ${server.description}`);
      console.log(`    ${chalk.gray('installs:')} ${server.installCount.toLocaleString()}  ${chalk.gray('version:')} ${server.version}`);
      console.log();
    });

    const totalPages = Math.ceil(total / limit);
    if (totalPages > 1) {
      console.log(chalk.gray(`Page ${page} of ${totalPages}. Use --page to navigate.`));
    }
  });

program
  .command('info <name>')
  .description('Show detailed information about an MCP server')
  .option('-j, --json', 'Output as JSON')
  .action((name, options) => {
    const server = getServerByName(name);
    if (!server) {
      console.log(chalk.red(`Server "${name}" not found in registry.`));
      process.exit(1);
    }

    const installed = isInstalled(server.name);

    if (options.json) {
      console.log(JSON.stringify({ ...server, installed }, null, 2));
      return;
    }

    console.log(chalk.bold(`\n${server.displayName}\n`));
    console.log(chalk.cyan(`  Name:`), server.name);
    console.log(chalk.cyan(`  Author:`), server.author);
    console.log(chalk.cyan(`  Version:`), server.version);
    console.log(chalk.cyan(`  Description:`), server.description);
    console.log(chalk.cyan(`  Install Count:`), server.installCount.toLocaleString());
    console.log(chalk.cyan(`  Categories:`), server.categories.join(', '));
    console.log(chalk.cyan(`  Tools:`), server.tools.join(', '));
    if (server.envVars.length > 0) {
      console.log(chalk.yellow(`  Required Env Vars:`), server.envVars.join(', '));
    }
    console.log(chalk.cyan(`  Repository:`), server.repository);
    console.log(chalk.cyan(`  Status:`), installed ? chalk.green('Installed') : chalk.gray('Not installed'));
    console.log();
  });

program
  .command('install <name>')
  .description('Install an MCP server to ~/.mcpr/servers/')
  .option('-v, --target-version <version>', 'Specific version to install')
  .option('-j, --json', 'Output as JSON')
  .action(async (name, options) => {
    const servers = await fetchRegistryServers();
    const server = getServerByName(name, servers);
    if (!server) {
      console.log(chalk.red(`Server "${name}" not found in registry.`));
      process.exit(1);
    }

    if (isInstalled(name)) {
      if (options.json) {
        const existing = getInstalledServers().find(s => s.name === name);
        console.log(JSON.stringify({ ...existing, alreadyInstalled: true }, null, 2));
        return;
      }
      console.log(chalk.yellow(`Server "${name}" is already installed.`));
      return;
    }

    const installedVersion = options.targetVersion || server.version;

    if (options.json) {
      try {
        installServer(server.name, { version: installedVersion, repository: server.repository });
      } catch (err) {
        console.log(chalk.red(`Failed to install ${name}: ${err}`));
        process.exit(1);
      }
      console.log(JSON.stringify({
        name: server.name,
        displayName: server.displayName,
        version: installedVersion,
        repository: server.repository,
        installPath: path.join(os.homedir(), '.mcpr', 'servers', server.name),
        installedAt: new Date().toISOString(),
      }, null, 2));
      return;
    }

    const spinner = ora(`Installing ${server.displayName}...`).start();
    try {
      installServer(server.name, {
        version: installedVersion,
        repository: server.repository
      });
      spinner.succeed(chalk.green(`Installed ${server.displayName} to ~/.mcpr/servers/${name}/`));
    } catch (err) {
      spinner.fail(chalk.red(`Failed to install ${name}: ${err}`));
      process.exit(1);
    }
  });

program
  .command('installed')
  .description('List all locally installed MCP servers')
  .option('-j, --json', 'Output as JSON')
  .action((options) => {
    const installed = getInstalledServers();
    
    if (options.json) {
      console.log(JSON.stringify(installed, null, 2));
      return;
    }
    
    if (installed.length === 0) {
      console.log(chalk.yellow('\nNo MCP servers installed yet.\n'));
      console.log(`Run ${chalk.cyan('mcpr install <name>')} to install a server.`);
      console.log();
      return;
    }

    console.log(chalk.bold(`\nInstalled MCP Servers (${installed.length})\n`));
    installed.forEach(server => {
      console.log(chalk.cyan(`  ${server.name}`));
      console.log(`    Version: ${server.version}`);
      console.log(`    Path: ${server.installPath}`);
      console.log(`    Installed: ${server.installedAt}`);
      console.log();
    });
  });

program
  .command('uninstall <name>')
  .description('Uninstall a locally installed MCP server')
  .action((name) => {
    if (!isInstalled(name)) {
      console.log(chalk.red(`Server "${name}" is not installed.`));
      process.exit(1);
    }

    const spinner = ora(`Uninstalling ${name}...`).start();
    try {
      uninstallServer(name);
      spinner.succeed(chalk.green(`Uninstalled ${name}`));
    } catch (err) {
      spinner.fail(chalk.red(`Failed to uninstall ${name}: ${err}`));
      process.exit(1);
    }
  });

program
  .command('update [name]')
  .description('Update an installed MCP server (or all if no name given)')
  .action(async (name) => {
    const installed = getInstalledServers();
    
    if (installed.length === 0) {
      console.log(chalk.yellow('\nNo MCP servers installed to update.\n'));
      return;
    }

    const servers = await fetchRegistryServers();

    if (name) {
      const server = installed.find(s => s.name === name);
      if (!server) {
        console.log(chalk.red(`Server "${name}" is not installed.`));
        process.exit(1);
      }
      const registryServer = getServerByName(name, servers);
      const newVersion = registryServer ? registryServer.version : server.version;
      const spinner = ora(`Updating ${name}...`).start();
      updateServer(name, newVersion);
      spinner.succeed(chalk.green(`Updated ${name} to ${newVersion}`));
    } else {
      console.log(chalk.bold('\nUpdating all installed servers...\n'));
      for (const server of installed) {
        const registryServer = getServerByName(server.name, servers);
        const newVersion = registryServer ? registryServer.version : server.version;
        const spinner = ora(`Updating ${server.name}...`).start();
        updateServer(server.name, newVersion);
        spinner.succeed(chalk.green(`Updated ${server.name} to ${newVersion}`));
      }
    }
  });

program
  .command('refresh')
  .description('Clear local registry cache (forces re-fetch on next list/search)')
  .action(async () => {
    const { clearCache } = await import('./storage');
    clearCache();
    console.log(chalk.green('Registry cache cleared.'));
  });

program
  .command('status')
  .description('Show CLI version, registry URL, cache status, and installed server count')
  .option('-j, --json', 'Output as JSON')
  .action((options) => {
    const config = { registryUrl: process.env.MCPR_REGISTRY_URL || 'https://registry.modelcontextprotocol.io/v0/servers' };
    const cachePath = path.join(os.homedir(), '.mcpr', 'cache.json');
    const installed = getInstalledServers();
    const cacheAge = fs.existsSync(cachePath)
      ? Math.round((Date.now() - fs.statSync(cachePath).mtimeMs) / 60000)
      : null;

    if (options.json) {
      console.log(JSON.stringify({
        version: '1.0.0',
        registryUrl: config.registryUrl,
        cache: {
          exists: cacheAge !== null,
          ageMinutes: cacheAge,
        },
        installedCount: installed.length,
      }, null, 2));
      return;
    }

    console.log(chalk.bold('\nMCP Registry CLI — Status\n'));
    console.log(chalk.cyan('  Version:'), '1.0.0');
    console.log(chalk.cyan('  Registry:'), config.registryUrl);
    console.log(chalk.cyan('  Cache:'), cacheAge !== null
      ? `cached (${cacheAge}m ago)`
      : chalk.gray('not cached'));
    console.log(chalk.cyan('  Installed:'), installed.length > 0
      ? `${installed.length} server(s)`
      : chalk.gray('none'));
    console.log();
  });

program.parse();