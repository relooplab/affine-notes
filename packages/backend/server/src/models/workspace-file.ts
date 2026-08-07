import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { BaseModel } from './base';

export type CreateWorkspaceFileInput = Prisma.WorkspaceFileUncheckedCreateInput;

/**
 * WorkspaceFile Model
 *
 * Persists metadata of files uploaded into a workspace "working folder".
 * The actual binary payload lives in the object storage backend
 * (`blob` scope) under key `workspace-files/<workspaceId>/<fileId>` and is
 * exposed through the `WorkspaceFileStorage` wrapper. This table only keeps
 * metadata so it can participate in the workspace storage quota accounting.
 */
@Injectable()
export class WorkspaceFileModel extends BaseModel {
  async create(input: CreateWorkspaceFileInput) {
    const result = await this.db.workspaceFile.create({
      data: {
        workspaceId: input.workspaceId,
        blobId: input.blobId,
        name: input.name,
        mime: input.mime,
        size: input.size,
        parentId: input.parentId ?? null,
        isFolder: input.isFolder ?? false,
        createdBy: input.createdBy,
      },
    });
    await this.markQuotaStateStale(input.workspaceId);
    this.logger.log(
      `created workspace file ${input.workspaceId}/${result.id} size ${result.size}`
    );
    return result;
  }

  async createFolder(
    workspaceId: string,
    name: string,
    createdBy: string,
    parentId: string | null = null
  ) {
    const result = await this.db.workspaceFile.create({
      data: {
        workspaceId,
        blobId: '',
        name,
        mime: 'application/x-folder',
        size: 0,
        parentId,
        isFolder: true,
        createdBy,
      },
    });
    this.logger.log(`created workspace folder ${workspaceId}/${result.id}`);
    return result;
  }

  async get(id: string) {
    return this.db.workspaceFile.findFirst({
      where: { id, deletedAt: null },
    });
  }

  async list(workspaceId: string, parentId: string | null = null) {
    return this.db.workspaceFile.findMany({
      where: { workspaceId, parentId, deletedAt: null },
      orderBy: [{ isFolder: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async rename(id: string, name: string) {
    return this.db.workspaceFile.update({
      where: { id },
      data: { name },
    });
  }

  /**
   * Move a file/folder into another folder (or to the workspace root when
   * `parentId` is null). Throws if moving a folder into its own subtree.
   */
  async move(id: string, workspaceId: string, parentId: string | null) {
    const node = await this.get(id);
    if (!node || node.workspaceId !== workspaceId) {
      throw new Error('Workspace file not found');
    }
    if (parentId && parentId === id) {
      throw new Error('Cannot move a folder into itself');
    }
    if (parentId) {
      const parent = await this.get(parentId);
      if (!parent || parent.workspaceId !== workspaceId || !parent.isFolder) {
        throw new Error('Parent folder not found');
      }
      if (node.isFolder && (await this.isAncestor(parentId, id))) {
        throw new Error('Cannot move a folder into its descendant');
      }
    }
    const result = await this.db.workspaceFile.update({
      where: { id },
      data: { parentId },
    });
    return result;
  }

  private async isAncestor(
    nodeId: string,
    potentialAncestorId: string
  ): Promise<boolean> {
    const visited = new Set<string>();
    let current: string | null = nodeId;
    while (current) {
      if (visited.has(current)) {
        return false;
      }
      visited.add(current);
      if (current === potentialAncestorId) {
        return true;
      }
      const node = await this.get(current);
      current = node?.parentId ?? null;
    }
    return false;
  }

  /**
   * Soft-deletes the file/folder record.
   * @returns the deleted record (to allow the caller to clean up the blob)
   */
  async delete(id: string) {
    const result = await this.db.workspaceFile.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    await this.markQuotaStateStale(result.workspaceId);
    return result;
  }

  private async markQuotaStateStale(workspaceId: string) {
    await this.db.effectiveWorkspaceQuotaState.updateMany({
      where: { workspaceId },
      data: { stale: true },
    });
  }
}
