import { Service } from '@toeverything/infra';

import type { GraphQLService } from '../../cloud';
import { WorkspaceFilesStore } from '../stores/workspace-files';

/**
 * WorkspaceFilesService
 *
 * Facade over the workspace files store, scoped to the current workspace.
 * The workspace id is provided by the caller (obtained from the active
 * workspace scope).
 */
export class WorkspaceFilesService extends Service {
  constructor(
    private readonly gqlService: GraphQLService,
    private readonly store: WorkspaceFilesStore
  ) {
    super();
  }

  list(workspaceId: string, parentId?: string | null) {
    return this.store.list(workspaceId, parentId ?? null);
  }

  upload(workspaceId: string, files: File[], parentId?: string | null) {
    return this.store.upload(workspaceId, files, parentId ?? null);
  }

  createFolder(workspaceId: string, name: string, parentId?: string | null) {
    return this.store.createFolder(workspaceId, name, parentId ?? null);
  }

  move(id: string, parentId: string | null) {
    return this.store.move(id, parentId);
  }

  delete(id: string) {
    return this.store.delete(id);
  }

  rename(id: string, name: string) {
    return this.store.rename(id, name);
  }
}