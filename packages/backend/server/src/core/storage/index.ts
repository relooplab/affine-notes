import './config';

import { Module } from '@nestjs/common';

import { StorageRuntimeModule } from '../storage-runtime';
import { StorageBlobJob } from './blob-job';
import { BlobUploadCleanupJob } from './job';
import { R2UploadController } from './r2-proxy';
import {
  AvatarStorage,
  CommentAttachmentStorage,
  WorkspaceBlobStorage,
  WorkspaceFileStorage,
} from './wrappers';

@Module({
  imports: [StorageRuntimeModule],
  controllers: [R2UploadController],
  providers: [
    WorkspaceBlobStorage,
    AvatarStorage,
    CommentAttachmentStorage,
    WorkspaceFileStorage,
    StorageBlobJob,
    BlobUploadCleanupJob,
  ],
  exports: [
    WorkspaceBlobStorage,
    AvatarStorage,
    CommentAttachmentStorage,
    WorkspaceFileStorage,
    StorageBlobJob,
  ],
})
export class StorageModule {}

export { StorageBlobJob } from './blob-job';
export {
  AvatarStorage,
  CommentAttachmentStorage,
  WorkspaceBlobStorage,
  WorkspaceFileStorage,
};
