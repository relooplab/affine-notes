import { Module } from '@nestjs/common';

import { PermissionModule } from '../permission';
import { QuotaServiceModule } from '../quota';
import { StorageModule } from '../storage';
import { WorkspaceFilesResolver } from './resolver';
import { WorkspaceFilesService } from './service';

@Module({
  imports: [PermissionModule, QuotaServiceModule, StorageModule],
  providers: [WorkspaceFilesResolver, WorkspaceFilesService],
  exports: [WorkspaceFilesService],
})
export class WorkspaceFilesModule {}
