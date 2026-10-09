import { ProviderWorkspaceRegistry } from '../../../core/providers/ProviderWorkspaceRegistry';
import type {
  ProviderWorkspaceRegistration,
  ProviderWorkspaceServices,
} from '../../../core/providers/types';
import type { VaultFileAdapter } from '../../../core/storage/VaultFileAdapter';
import { AntigravitySkillCatalog } from '../commands/AntigravitySkillCatalog';
import { AntigravityCliResolver } from '../runtime/AntigravityCliResolver';
import { ANTIGRAVITY_PROVIDER_ID } from '../runtime/AntigravityLaunchSpec';
import { antigravitySettingsTabRenderer } from '../ui/AntigravitySettingsTab';

export type AntigravityWorkspaceServices = ProviderWorkspaceServices;

/**
 * Skill discovery only reads vault files. Runtime command loading and tab
 * warmup remain absent so opening a tab does not launch `agy`.
 */
export async function createAntigravityWorkspaceServices(
  vaultAdapter: VaultFileAdapter,
): Promise<AntigravityWorkspaceServices> {
  return {
    cliResolver: new AntigravityCliResolver(),
    commandCatalog: new AntigravitySkillCatalog(vaultAdapter),
    settingsTabRenderer: antigravitySettingsTabRenderer,
  };
}

export const antigravityWorkspaceRegistration: ProviderWorkspaceRegistration<AntigravityWorkspaceServices> = {
  initialize: async ({ vaultAdapter }) => createAntigravityWorkspaceServices(vaultAdapter),
};

export function maybeGetAntigravityWorkspaceServices(): AntigravityWorkspaceServices | null {
  return ProviderWorkspaceRegistry.getServices(ANTIGRAVITY_PROVIDER_ID);
}
