import { randomUUID } from 'node:crypto';

import { Injectable, Logger, NotFoundException } from '@nestjs/common';

import {
  BlobQuotaExceeded,
  type FileUpload,
  readableToBuffer,
} from '../../base';
import { Models } from '../../models';
import { QuotaService } from '../quota';
import { WorkspaceFileStorage } from '../storage';
import { WorkspaceFileType } from './types';

/**
 * WorkspaceFilesService
 *
 * Orchestrates upload / list / get / rename / delete of files stored in a
 * workspace "working folder". All binary operations go through
 * `WorkspaceFileStorage`; metadata goes through the `WorkspaceFileModel`.
 * Access control is enforced by the GraphQL resolver before these methods run.
 */
@Injectable()
export class WorkspaceFilesService {
  protected logger = new Logger(WorkspaceFilesService.name);

  constructor(
    private readonly storage: WorkspaceFileStorage,
    private readonly quota: QuotaService,
    private readonly models: Models
  ) {}

  async upload(
    workspaceId: string,
    files: FileUpload[],
    userId: string,
    parentId?: string | null
  ): Promise<WorkspaceFileType[]> {
    const checkExceeded =
      await this.quota.getWorkspaceQuotaCalculator(workspaceId);

    if (parentId) {
      const parent = await this.models.workspaceFile.get(parentId);
      if (!parent || parent.workspaceId !== workspaceId || !parent.isFolder) {
        throw new NotFoundException('Parent folder not found');
      }
    }

    const uploaded: WorkspaceFileType[] = [];
    for (const file of files) {
      const buffer = await readableToBuffer(file.createReadStream());
      const exceeded = checkExceeded(buffer.length);
      if (exceeded?.blobQuotaExceeded || exceeded?.storageQuotaExceeded) {
        throw new BlobQuotaExceeded();
      }

      const fileId = randomUUID();
      const record = await this.storage.put(
        workspaceId,
        fileId,
        file.filename ?? fileId,
        buffer,
        userId,
        parentId ?? null
      );
      uploaded.push(this.toType(record, workspaceId));
    }
    return uploaded;
  }

  async createFolder(
    workspaceId: string,
    name: string,
    userId: string,
    parentId?: string | null
  ): Promise<WorkspaceFileType> {
    if (parentId) {
      const parent = await this.models.workspaceFile.get(parentId);
      if (!parent || parent.workspaceId !== workspaceId || !parent.isFolder) {
        throw new NotFoundException('Parent folder not found');
      }
    }
    const folder = await this.models.workspaceFile.createFolder(
      workspaceId,
      name,
      userId,
      parentId ?? null
    );
    return this.toType(folder, workspaceId);
  }

  async list(workspaceId: string, parentId?: string | null): Promise<WorkspaceFileType[]> {
    const files = await this.models.workspaceFile.list(
      workspaceId,
      parentId ?? null
    );
    return files.map(file => this.toType(file, workspaceId));
  }

  async move(
    id: string,
    workspaceId: string,
    parentId: string | null
  ): Promise<WorkspaceFileType> {
    const file = await this.models.workspaceFile.move(id, workspaceId, parentId);
    return this.toType(file, workspaceId);
  }

  async get(id: string): Promise<WorkspaceFileType> {
    const file = await this.models.workspaceFile.get(id);
    if (!file) {
      throw new NotFoundException('Workspace file not found');
    }
    return this.toType(file, file.workspaceId);
  }

  async rename(id: string, name: string): Promise<WorkspaceFileType> {
    const file = await this.models.workspaceFile.get(id);
    if (!file) {
      throw new NotFoundException('Workspace file not found');
    }
    const updated = await this.models.workspaceFile.rename(id, name);
    return this.toType(updated, file.workspaceId);
  }

  async remove(id: string): Promise<boolean> {
    const file = await this.models.workspaceFile.get(id);
    if (!file) {
      throw new NotFoundException('Workspace file not found');
    }
    await this.models.workspaceFile.delete(id);
    // remove the binary payload from the object storage
    await this.storage.delete(file.workspaceId, id);
    return true;
  }

  /**
   * Returns the raw persisted record for a file id.
   * Useful for the resolver to resolve the owning workspace before running
   * permission checks. Throws if the file does not exist.
   */
  async getById(id: string) {
    const file = await this.models.workspaceFile.get(id);
    if (!file) {
      throw new NotFoundException('Workspace file not found');
    }
    return file;
  }

  private toType(
    file: {
      id: string;
      name: string;
      mime: string;
      size: number;
      parentId: string | null;
      isFolder: boolean;
      createdAt: Date;
      createdBy: string;
    },
    workspaceId: string
  ): WorkspaceFileType {
    return {
      id: file.id,
      name: file.name,
      mime: file.mime,
      size: file.size,
      parentId: file.parentId,
      isFolder: file.isFolder,
      url: file.isFolder
        ? ''
        : this.storage.getUrl(workspaceId, file.id),
      createdAt: file.createdAt,
      createdBy: file.createdBy,
    };
  }
}