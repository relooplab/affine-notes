import {
  createWorkspaceFolderMutation,
  deleteWorkspaceFileMutation,
  listWorkspaceFilesQuery,
  moveWorkspaceFileMutation,
  renameWorkspaceFileMutation,
  uploadWorkspaceFilesMutation,
  type WorkspaceFileType,
} from '@affine/graphql';
import { Store } from '@toeverything/infra';

import type { GraphQLService } from '../../cloud';

/**
 * WorkspaceFilesStore
 *
 * Thin GraphQL-backed store for the workspace "working folder" feature.
 * All operations are performed against the self-hosted backend.
 */
export class WorkspaceFilesStore extends Store {
  constructor(private readonly gqlService: GraphQLService) {
    super();
  }

  async list(workspaceId: string, parentId?: string | null): Promise<WorkspaceFileType[]> {
    const result = await this.gqlService.gql({
      query: listWorkspaceFilesQuery,
      variables: { workspaceId, parentId: parentId ?? null },
    });
    return result.workspaceFiles ?? [];
  }

  async upload(
    workspaceId: string,
    files: File[],
    parentId?: string | null
  ): Promise<WorkspaceFileType[]> {
    const result = await this.gqlService.gql({
      query: uploadWorkspaceFilesMutation,
      variables: { workspaceId, files, parentId: parentId ?? null },
    });
    return result.uploadWorkspaceFiles ?? [];
  }

  async createFolder(
    workspaceId: string,
    name: string,
    parentId?: string | null
  ): Promise<WorkspaceFileType> {
    const result = await this.gqlService.gql({
      query: createWorkspaceFolderMutation,
      variables: { workspaceId, name, parentId: parentId ?? null },
    });
    return result.createWorkspaceFolder;
  }

  async move(id: string, parentId: string | null): Promise<WorkspaceFileType> {
    const result = await this.gqlService.gql({
      query: moveWorkspaceFileMutation,
      variables: { id, parentId },
    });
    return result.moveWorkspaceFile;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.gqlService.gql({
      query: deleteWorkspaceFileMutation,
      variables: { id },
    });
    return result.deleteWorkspaceFile;
  }

  async rename(id: string, name: string): Promise<WorkspaceFileType> {
    const result = await this.gqlService.gql({
      query: renameWorkspaceFileMutation,
      variables: { id, name },
    });
    return result.renameWorkspaceFile;
  }
}

export type { WorkspaceFileType };