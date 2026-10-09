import * as childProcess from 'node:child_process';

import { ProviderWorkspaceRegistry } from '@/core/providers/ProviderWorkspaceRegistry';
import type { VaultFileAdapter } from '@/core/storage/VaultFileAdapter';
import {
  antigravityWorkspaceRegistration,
  createAntigravityWorkspaceServices,
  maybeGetAntigravityWorkspaceServices,
} from '@/providers/antigravity/app/AntigravityWorkspaceServices';
import { AntigravitySkillCatalog } from '@/providers/antigravity/commands/AntigravitySkillCatalog';
import { AntigravityCliResolver } from '@/providers/antigravity/runtime/AntigravityCliResolver';
import { antigravitySettingsTabRenderer } from '@/providers/antigravity/ui/AntigravitySettingsTab';

jest.mock('node:child_process', () => ({
  spawn: jest.fn(),
  spawnSync: jest.fn(),
  exec: jest.fn(),
  execSync: jest.fn(),
  execFile: jest.fn(),
  execFileSync: jest.fn(),
}));

const spawnSpies = [
  childProcess.spawn,
  childProcess.spawnSync,
  childProcess.exec,
  childProcess.execSync,
  childProcess.execFile,
  childProcess.execFileSync,
] as unknown as jest.Mock[];

describe('AntigravityWorkspaceServices', () => {
  const vaultAdapter = {} as VaultFileAdapter;
  afterEach(() => {
    ProviderWorkspaceRegistry.clear();
    jest.clearAllMocks();
  });

  it('initializes the CLI resolver, skill catalog, and settings tab renderer', async () => {
    const services = await createAntigravityWorkspaceServices(vaultAdapter);

    expect(services.cliResolver).toBeInstanceOf(AntigravityCliResolver);
    expect(services.settingsTabRenderer).toBe(antigravitySettingsTabRenderer);
    expect(services.commandCatalog).toBeInstanceOf(AntigravitySkillCatalog);
    expect(Object.keys(services).sort()).toEqual(['cliResolver', 'commandCatalog', 'settingsTabRenderer']);
  });

  it('omits the workspace services the provider cannot honestly serve', async () => {
    const services = await createAntigravityWorkspaceServices(vaultAdapter);

    // Runtime commands, agent mentions, MCP, model discovery, and tab warmup
    // are all unsupported: each would either expose a feature the provider has
    // no capability for, or launch `agy` without a user turn.
    for (const unsupported of [
      'agentMentionProvider',
      'mcpServerManager',
      'prepareSettings',
      'refreshAgentMentions',
      'refreshModelCatalog',
      'runtimeCommandLoader',
      'tabWarmupPolicy',
    ]) {
      expect(unsupported in services).toBe(false);
    }
  });

  it('reports the skill catalog through the workspace registry', async () => {
    ProviderWorkspaceRegistry.setServices('antigravity', await createAntigravityWorkspaceServices(vaultAdapter));

    expect(ProviderWorkspaceRegistry.getCliResolver('antigravity')).toBeInstanceOf(AntigravityCliResolver);
    expect(ProviderWorkspaceRegistry.getSettingsTabRenderer('antigravity')).toBe(antigravitySettingsTabRenderer);
    expect(ProviderWorkspaceRegistry.getCommandCatalog('antigravity')).toBeInstanceOf(AntigravitySkillCatalog);
    expect(ProviderWorkspaceRegistry.getAgentMentionProvider('antigravity')).toBeNull();
    expect(ProviderWorkspaceRegistry.getRuntimeCommandLoader('antigravity')).toBeNull();
    expect(ProviderWorkspaceRegistry.getMcpServerManager('antigravity')).toBeNull();
    // A null warmup policy resolves to 'none', so opening a tab never launches the CLI.
    expect(ProviderWorkspaceRegistry.getTabWarmupPolicy('antigravity')).toBeNull();
  });

  it('returns null until the workspace services are initialized', async () => {
    expect(maybeGetAntigravityWorkspaceServices()).toBeNull();

    const services = await createAntigravityWorkspaceServices(vaultAdapter);
    ProviderWorkspaceRegistry.setServices('antigravity', services);

    expect(maybeGetAntigravityWorkspaceServices()).toBe(services);
  });

  it('registers a workspace entry point that builds the same services', async () => {
    const services = await antigravityWorkspaceRegistration.initialize({ vaultAdapter } as never);

    expect(services.cliResolver).toBeInstanceOf(AntigravityCliResolver);
    expect(services.settingsTabRenderer).toBe(antigravitySettingsTabRenderer);
  });

  it('never launches the CLI while initializing its services', async () => {
    await createAntigravityWorkspaceServices(vaultAdapter);

    for (const spawnSpy of spawnSpies) {
      expect(spawnSpy).not.toHaveBeenCalled();
    }
  });
});
