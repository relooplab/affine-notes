import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import GraphQLUpload from 'graphql-upload/GraphQLUpload.mjs';

import { type FileUpload } from '../../base';
import { CurrentUser } from '../auth/session';
import { PermissionAccess } from '../permission';
import { UserType } from '../user';
import { WorkspaceFilesService } from './service';
import { WorkspaceFileType } from './types';

@Resolver(() => WorkspaceFileType)
export class WorkspaceFilesResolver {
  constructor(
    private readonly service: WorkspaceFilesService,
    private readonly ac: PermissionAccess
  ) {}

  @Query(() => [WorkspaceFileType])
  async workspaceFiles(
    @CurrentUser() me: UserType,
    @Args('workspaceId') workspaceId: string,
    @Args('parentId', { nullable: true }) parentId?: string | null
  ): Promise<WorkspaceFileType[]> {
    await this.ac
      .user(me.id)
      .workspace(workspaceId)
      .assert('Workspace.Blobs.List');
    return this.service.list(workspaceId, parentId ?? null);
  }

  @Query(() => WorkspaceFileType, { nullable: true })
  async workspaceFile(
    @CurrentUser() me: UserType,
    @Args('id') id: string
  ): Promise<WorkspaceFileType | null> {
    const record = await this.service.getById(id);
    await this.ac
      .user(me.id)
      .workspace(record.workspaceId)
      .assert('Workspace.Blobs.Read');
    return this.service.get(id);
  }

  @Mutation(() => [WorkspaceFileType])
  async uploadWorkspaceFiles(
    @CurrentUser() me: UserType,
    @Args('workspaceId') workspaceId: string,
    @Args({ name: 'files', type: () => [GraphQLUpload] })
    files: FileUpload[],
    @Args('parentId', { nullable: true }) parentId?: string | null
  ): Promise<WorkspaceFileType[]> {
    await this.ac
      .user(me.id)
      .workspace(workspaceId)
      .assert('Workspace.Blobs.Write');
    return this.service.upload(workspaceId, files, me.id, parentId ?? null);
  }

  @Mutation(() => WorkspaceFileType)
  async createWorkspaceFolder(
    @CurrentUser() me: UserType,
    @Args('workspaceId') workspaceId: string,
    @Args('name') name: string,
    @Args('parentId', { nullable: true }) parentId?: string | null
  ): Promise<WorkspaceFileType> {
    await this.ac
      .user(me.id)
      .workspace(workspaceId)
      .assert('Workspace.Blobs.Write');
    return this.service.createFolder(workspaceId, name, me.id, parentId ?? null);
  }

  @Mutation(() => WorkspaceFileType)
  async moveWorkspaceFile(
    @CurrentUser() me: UserType,
    @Args('id') id: string,
    @Args('parentId', { nullable: true }) parentId?: string | null
  ): Promise<WorkspaceFileType> {
    const record = await this.service.getById(id);
    await this.ac
      .user(me.id)
      .workspace(record.workspaceId)
      .assert('Workspace.Blobs.Write');
    return this.service.move(id, record.workspaceId, parentId ?? null);
  }

  @Mutation(() => Boolean)
  async deleteWorkspaceFile(
    @CurrentUser() me: UserType,
    @Args('id') id: string
  ): Promise<boolean> {
    const record = await this.service.getById(id);
    await this.ac
      .user(me.id)
      .workspace(record.workspaceId)
      .assert('Workspace.Blobs.Write');
    return this.service.remove(id);
  }

  @Mutation(() => WorkspaceFileType)
  async renameWorkspaceFile(
    @CurrentUser() me: UserType,
    @Args('id') id: string,
    @Args('name') name: string
  ): Promise<WorkspaceFileType> {
    const record = await this.service.getById(id);
    await this.ac
      .user(me.id)
      .workspace(record.workspaceId)
      .assert('Workspace.Blobs.Write');
    return this.service.rename(id, name);
  }
}