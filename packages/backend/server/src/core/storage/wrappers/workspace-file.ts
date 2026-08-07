import { Injectable, Logger } from '@nestjs/common';

import { EventBus, metrics, OnEvent, URLHelper } from '../../../base';
import { Models } from '../../../models';
import {
  type StorageRuntimeGetObjectResult,
  StorageRuntimeProvider,
} from '../../storage-runtime';

declare global {
  interface Events {
    'workspace.file.delete': {
      workspaceId: string;
      fileId: string;
    };
  }
}

/**
 * WorkspaceFileStorage
 *
 * Handles the binary read/write/delete of workspace files against the object
 * storage backend (scope `blob`), mirroring the `CommentAttachmentStorage`
 * pattern. Because self-hosted deployments may use the filesystem provider
 * (no object-storage presigning), the get/put path always works through the
 * server (server-mediated); presigned access is used only when available.
 */
@Injectable()
export class WorkspaceFileStorage {
  private readonly logger = new Logger(WorkspaceFileStorage.name);

  constructor(
    private readonly event: EventBus,
    private readonly models: Models,
    private readonly url: URLHelper,
    private readonly rt: StorageRuntimeProvider
  ) {}

  private storageKey(workspaceId: string, fileId: string) {
    return `workspace-files/${workspaceId}/${fileId}`;
  }

  async put(
    workspaceId: string,
    fileId: string,
    name: string,
    blob: Buffer,
    userId: string,
    parentId?: string | null
  ) {
    const metadata = await this.rt.putObject(
      'blob',
      this.storageKey(workspaceId, fileId),
      blob
    );
    const mime = metadata.contentType;
    const size = metadata.contentLength;
    const record = await this.models.workspaceFile.create({
      workspaceId,
      blobId: fileId,
      name,
      mime,
      size,
      parentId: parentId ?? null,
      createdBy: userId,
    });
    // let quota reconciliations know the workspace storage changed
    this.event.emit('workspace.blobs.updated', { workspaceId });

    metrics.storage.histogram('workspace_file_size').record(size, { mime });
    metrics.storage.counter('workspace_file_total').add(1, { mime });
    this.logger.log(
      `uploaded workspace file ${workspaceId}/${fileId} size ${size} mime ${mime} name ${name} user ${userId}`
    );
    return record;
  }

  async get(
    workspaceId: string,
    fileId: string,
    signedUrl?: boolean
  ): Promise<StorageRuntimeGetObjectResult> {
    const storageKey = this.storageKey(workspaceId, fileId);
    if (signedUrl) {
      const presigned = await this.rt.presignGet('blob', storageKey);
      if (presigned) {
        return { redirectUrl: presigned.url };
      }
    }
    return this.rt.getObject('blob', storageKey);
  }

  async delete(workspaceId: string, fileId: string) {
    await this.rt.deleteObject('blob', this.storageKey(workspaceId, fileId));
    this.logger.log(`deleted workspace file binary ${workspaceId}/${fileId}`);
  }

  getUrl(workspaceId: string, fileId: string) {
    return this.url.link(`/api/workspaces/${workspaceId}/files/${fileId}`);
  }

  @OnEvent('workspace.deleted')
  async onWorkspaceDeleted({ id }: Events['workspace.deleted']) {
    const files = await this.models.workspaceFile.list(id);
    for (const file of files) {
      this.event.emit('workspace.file.delete', {
        workspaceId: id,
        fileId: file.id,
      });
    }
  }

  @OnEvent('workspace.file.delete')
  async onWorkspaceFileDelete({
    workspaceId,
    fileId,
  }: Events['workspace.file.delete']) {
    await this.delete(workspaceId, fileId);
  }
}
