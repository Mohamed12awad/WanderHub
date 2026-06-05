import { SetMetadata } from '@nestjs/common';

export const MODULE_KEY = 'required_module';

/**
 * Marks a controller (or handler) as belonging to a toggleable workspace module.
 * Combined with ModuleGuard, requests are rejected when an admin has disabled
 * that module in workspace settings — enforcing the toggle at the API, not just
 * hiding it in the nav.
 */
export const RequireModule = (module: string) => SetMetadata(MODULE_KEY, module);
