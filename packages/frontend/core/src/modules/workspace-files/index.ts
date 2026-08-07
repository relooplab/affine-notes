import { type Framework } from '@toeverything/infra';

import { GraphQLService } from '../cloud';
import { WorkspaceScope } from '../workspace';
import { WorkspaceFilesService } from './services/workspace-files';
import { WorkspaceFilesStore } from './stores/workspace-files';

export { WorkspaceFilesService } from './services/workspace-files';
export type { WorkspaceFileType } from './stores/workspace-files';

export function configureWorkspaceFilesModule(framework: Framework) {
  framework
    .scope(WorkspaceScope)
    .service(WorkspaceFilesService, [GraphQLService, WorkspaceFilesStore])
    .store(WorkspaceFilesStore, [GraphQLService]);
}