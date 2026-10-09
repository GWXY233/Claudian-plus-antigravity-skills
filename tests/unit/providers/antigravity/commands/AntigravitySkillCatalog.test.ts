import type { VaultFileAdapter } from '@/core/storage/VaultFileAdapter';
import { AntigravitySkillCatalog } from '@/providers/antigravity/commands/AntigravitySkillCatalog';

function adapter(files: Record<string, string>): VaultFileAdapter {
  return {
    exists: jest.fn(async (path: string) => path in files
      || Object.keys(files).some(key => key.startsWith(`${path}/`))),
    read: jest.fn(async (path: string) => {
      if (!(path in files)) throw new Error('Unreadable skill');
      return files[path];
    }),
    listFolders: jest.fn(async (root: string) => [...new Set(Object.keys(files)
      .filter(key => key.startsWith(`${root}/`))
      .map(key => `${root}/${key.slice(root.length + 1).split('/')[0]}`))]),
    write: jest.fn(),
    delete: jest.fn(),
  } as unknown as VaultFileAdapter;
}

function skill(name: string, description = 'A test skill'): string {
  return `---\nname: ${name}\ndescription: ${description}\n---\nFollow the skill instructions.\n`;
}

describe('AntigravitySkillCatalog', () => {
  it('lists vault skills as native slash invocations without expanding their content', async () => {
    const catalog = new AntigravitySkillCatalog(adapter({
      '.agents/skills/obsidian-markdown/SKILL.md': skill('obsidian-markdown'),
    }));

    expect(catalog.getDropdownConfig()).toEqual({
      providerId: 'antigravity', triggerChars: ['/'],
      builtInPrefix: '/', skillPrefix: '/', commandPrefix: '/',
    });
    expect(await catalog.listDropdownEntries({ includeBuiltIns: true })).toEqual([
      expect.objectContaining({
        providerId: 'antigravity', kind: 'skill', name: 'obsidian-markdown',
        description: 'A test skill', scope: 'vault', content: '', source: 'user',
        displayPrefix: '/', insertPrefix: '/', isEditable: false, isDeletable: false,
      }),
    ]);
  });

  it('deduplicates legacy skills with the current root taking precedence and sorts by name', async () => {
    const catalog = new AntigravitySkillCatalog(adapter({
      '.agents/skills/zeta/SKILL.md': skill('zeta', 'Current skill'),
      '.agent/skills/zeta/SKILL.md': skill('zeta', 'Legacy skill'),
      '.agent/skills/alpha/SKILL.md': skill('alpha'),
      '.claude/skills/claude-only/SKILL.md': skill('claude-only'),
    }));
    const entries = await catalog.listDropdownEntries({ includeBuiltIns: false });
    expect(entries.map(entry => entry.name)).toEqual(['alpha', 'zeta']);
    expect(entries[1].description).toBe('Current skill');
  });

  it('skips missing, malformed, and non-invocable skills without hiding valid skills', async () => {
    const catalog = new AntigravitySkillCatalog(adapter({
      '.agents/skills/valid/SKILL.md': skill('valid'),
      '.agents/skills/broken/SKILL.md': 'Invalid frontmatter',
      '.agents/skills/missing/README.md': 'No skill',
      '.agents/skills/hidden/SKILL.md': skill('hidden').replace('---\nFollow', 'user-invocable: false\n---\nFollow'),
    }));
    expect((await catalog.listDropdownEntries({ includeBuiltIns: false }))
      .map(entry => entry.name)).toEqual(['valid']);
    expect(await new AntigravitySkillCatalog(adapter({})).listVaultEntries()).toEqual([]);
  });

  it('rescans changed files and does not write or delete skill files', async () => {
    const files = { '.agents/skills/first/SKILL.md': skill('first') } as Record<string, string>;
    const storage = adapter(files);
    const catalog = new AntigravitySkillCatalog(storage);
    const [entry] = await catalog.listVaultEntries();
    files['.agents/skills/second/SKILL.md'] = skill('second');
    await catalog.refresh();
    expect((await catalog.listVaultEntries()).map(item => item.name)).toEqual(['first', 'second']);
    await expect(catalog.saveVaultEntry(entry)).rejects.toThrow('read-only');
    await expect(catalog.deleteVaultEntry(entry)).rejects.toThrow('read-only');
    expect(storage.write).not.toHaveBeenCalled();
    expect(storage.delete).not.toHaveBeenCalled();
  });

  it('keeps the legacy root available when the current root cannot be listed', async () => {
    const storage = adapter({ '.agent/skills/legacy/SKILL.md': skill('legacy') });
    (storage.listFolders as jest.Mock).mockRejectedValueOnce(new Error('Offline folder'));
    const catalog = new AntigravitySkillCatalog(storage);
    expect((await catalog.listVaultEntries()).map(entry => entry.name)).toEqual(['legacy']);
  });
});
