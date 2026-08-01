import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { RESOURCES, isResource } from './resources';

/**
 * Guards the invariant that broke record-level authorization once already:
 * the backend's canonical resource vocabulary and the frontend's grantable
 * PERMISSION_REGISTRY must name the same resources.
 *
 * When they diverge, one of two silent failures follows:
 *  - a resource the backend enforces but the registry omits is ungrantable, so
 *    only `*` holders can reach it (this happened to leads/warehouses/activities);
 *  - a resource name used for scoping that no permission can match resolves to
 *    no scope at all (this happened to finance/sales/procurement).
 */
describe('canonical resource vocabulary', () => {
  const registrySource = readFileSync(
    join(__dirname, '../../../frontend/src/config/permissions.ts'),
    'utf8',
  );

  const registryKeys = (() => {
    const body = registrySource.slice(
      registrySource.indexOf('PERMISSION_REGISTRY = {'),
      registrySource.indexOf('} as const;'),
    );
    return [...body.matchAll(/^\s*"?([a-z-]+)"?:\s*\[/gm)].map((m) => m[1]);
  })();

  it('parses the frontend registry (guards this test itself)', () => {
    expect(registryKeys.length).toBeGreaterThan(15);
  });

  it('every frontend-grantable resource exists in the backend vocabulary', () => {
    const missing = registryKeys.filter((k) => !isResource(k));
    expect(missing).toEqual([]);
  });

  it('every backend resource is grantable in the frontend registry', () => {
    const missing = RESOURCES.filter((r) => !registryKeys.includes(r));
    expect(missing).toEqual([]);
  });

  it('rejects the legacy alias names that silently disabled scoping', () => {
    for (const alias of ['finance', 'sales', 'procurement']) {
      expect(isResource(alias)).toBe(false);
    }
  });

  // The strongest form of this guard: derive the truth from what the backend
  // ACTUALLY enforces via @RequirePermission, rather than from a hand-kept list.
  // Any new guarded route whose resource/action is not grantable fails here.
  describe('against permissions actually enforced by @RequirePermission', () => {
    const enforced = (() => {
      const found: string[] = [];
      const walk = (dir: string) => {
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
          const p = join(dir, entry.name);
          if (entry.isDirectory()) walk(p);
          else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.spec.ts')) {
            const src = readFileSync(p, 'utf8');
            for (const m of src.matchAll(/@RequirePermission\('([^']+)'\)/g)) found.push(m[1]);
          }
        }
      };
      walk(join(__dirname, '..'));
      return [...new Set(found)].sort();
    })();

    const registryActions = (() => {
      const body = registrySource.slice(
        registrySource.indexOf('PERMISSION_REGISTRY = {'),
        registrySource.indexOf('} as const;'),
      );
      const map = new Map<string, string[]>();
      for (const m of body.matchAll(/^\s*"?([a-z-]+)"?:\s*\[([^\]]*)\]/gm)) {
        map.set(m[1], [...m[2].matchAll(/"([a-z]+)"/g)].map((a) => a[1]));
      }
      return map;
    })();

    it('found the enforced permissions (guards this test itself)', () => {
      expect(enforced.length).toBeGreaterThan(50);
    });

    it('every enforced permission is grantable through the Roles UI', () => {
      const ungrantable = enforced.filter((perm) => {
        const [resource, action] = perm.split(':');
        return !(registryActions.get(resource) ?? []).includes(action);
      });
      expect(ungrantable).toEqual([]);
    });

    it('every enforced resource is in the canonical vocabulary', () => {
      const unknown = [...new Set(enforced.map((p) => p.split(':')[0]))].filter((r) => !isResource(r));
      expect(unknown).toEqual([]);
    });
  });
});
