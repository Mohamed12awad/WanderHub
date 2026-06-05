import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { WorkspaceConfigService } from './workspace-config.service';
import { MODULE_KEY } from './require-module.decorator';

/**
 * Blocks requests to a controller whose workspace module has been explicitly
 * disabled (`moduleSettings[].enabled === false`). Modules default to enabled
 * when unset, mirroring the frontend `isModuleEnabled`. Never applied to
 * settings/auth/users/roles controllers so an admin can always re-enable.
 */
@Injectable()
export class ModuleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly workspaceConfig: WorkspaceConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string>(MODULE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required) return true;

    const config = await this.workspaceConfig.get();
    const settings = config.moduleSettings as unknown as { module: string; enabled: boolean }[];
    const setting = Array.isArray(settings)
      ? settings.find((s) => s?.module === required)
      : undefined;

    if (setting && setting.enabled === false) {
      throw new ForbiddenException(`Module "${required}" is disabled.`);
    }
    return true;
  }
}
