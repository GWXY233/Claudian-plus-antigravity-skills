import type { ProviderCommandCatalog, ProviderCommandDropdownConfig } from '../../../core/providers/commands/ProviderCommandCatalog';
import type { ProviderCommandEntry } from '../../../core/providers/commands/ProviderCommandEntry';
import { parseAgentSkillMarkdown } from '../../../core/skills/AgentSkillCodec';
import type { VaultFileAdapter } from '../../../core/storage/VaultFileAdapter';
import type { SlashCommand } from '../../../core/types';

const SKILL_ROOTS = ['.agents/skills', '.agent/skills'];

/** Lists native CLI skills without starting a process or expanding instructions. */
export class AntigravitySkillCatalog implements ProviderCommandCatalog {
  constructor(private readonly adapter: Pick<VaultFileAdapter, 'exists' | 'listFolders' | 'read'>) {}

  getDropdownConfig(): ProviderCommandDropdownConfig {
    return {
      providerId: 'antigravity', triggerChars: ['/'],
      builtInPrefix: '/', skillPrefix: '/', commandPrefix: '/',
    };
  }

  async listDropdownEntries(_context: { includeBuiltIns: boolean }): Promise<ProviderCommandEntry[]> {
    return this.listVaultEntries();
  }

  async listVaultEntries(): Promise<ProviderCommandEntry[]> {
    const entries = new Map<string, ProviderCommandEntry>();
    for (const root of SKILL_ROOTS) {
      let folders: string[];
      try {
        folders = await this.adapter.listFolders(root);
      } catch {
        // An unavailable root must not hide skills in the other root.
        continue;
      }
      for (const folder of folders.sort()) {
        try {
          const skillPath = `${folder}/SKILL.md`;
          if (!(await this.adapter.exists(skillPath))) continue;
          const directoryName = folder.split('/').pop()!;
          const skill = parseAgentSkillMarkdown(await this.adapter.read(skillPath), directoryName);
          if (entries.has(skill.name) || skill.frontmatter['user-invocable'] === false) continue;
          entries.set(skill.name, {
            id: `antigravity-skill:${skill.name}`, providerId: 'antigravity', kind: 'skill',
            name: skill.name, description: skill.description, content: '',
            scope: 'vault', source: 'user', isEditable: false, isDeletable: false,
            displayPrefix: '/', insertPrefix: '/',
          });
        } catch {
          // Ignore incomplete or unavailable files while keeping usable skills.
        }
      }
    }
    return [...entries.values()].sort((left, right) => left.name.localeCompare(right.name));
  }

  async saveVaultEntry(_entry: ProviderCommandEntry): Promise<void> {
    throw new Error('Antigravity skill catalog is read-only');
  }

  async deleteVaultEntry(_entry: ProviderCommandEntry): Promise<void> {
    throw new Error('Antigravity skill catalog is read-only');
  }

  setRuntimeCommands(_commands: SlashCommand[]): void {}

  async refresh(): Promise<void> {
    // Each catalog read scans the filesystem; there is no catalog cache.
  }
}
