import { IconButton, notify, usePromptModal } from '@affine/component';
import {
  useMutateQueryResource,
  useMutation,
} from '@affine/core/components/hooks/use-mutation';
import { useQuery } from '@affine/core/components/hooks/use-query';
import { WorkspaceService } from '@affine/core/modules/workspace';
import { useI18n } from '@affine/i18n';
import {
  createWorkspaceFolderMutation,
  deleteWorkspaceFileMutation,
  listWorkspaceFilesQuery,
  uploadWorkspaceFilesMutation,
} from '@affine/graphql';
import {
  ArrowUpIcon,
  DeleteIcon,
  FolderIcon,
  PlusIcon,
  UploadCloudIcon,
} from '@blocksuite/icons/rc';
import { useService } from '@toeverything/infra';
import { useCallback, useMemo, useRef, useState } from 'react';

import { CollapsibleSection } from '../../layouts/collapsible-section';
import { RootEmpty } from './empty';
import * as styles from './index.css';

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

type FolderCrumb = { id: string | null; name: string };

export const NavigationPanelFiles = () => {
  const t = useI18n();
  const workspace = useService(WorkspaceService).workspace;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { openPromptModal } = usePromptModal();

  // Breadcrumb stack of folders, from workspace root to the current folder.
  const [crumbs, setCrumbs] = useState<FolderCrumb[]>([{ id: null, name: '' }]);
  const currentFolderId = crumbs[crumbs.length - 1]?.id ?? null;

  const workspaceId = workspace?.id ?? '';
  const workspaceFiles = useQuery({
    query: listWorkspaceFilesQuery,
    variables: { workspaceId, parentId: currentFolderId },
  });
  const { trigger: uploadTrigger } = useMutation({
    mutation: uploadWorkspaceFilesMutation,
  });
  const { trigger: createFolderTrigger } = useMutation({
    mutation: createWorkspaceFolderMutation,
  });
  const { trigger: deleteTrigger } = useMutation({
    mutation: deleteWorkspaceFileMutation,
  });
  const revalidate = useMutateQueryResource();

  const items = workspaceFiles.data?.workspaceFiles ?? [];

  const handleUpload = useCallback(
    async (filesToUpload: FileList | null) => {
      if (!filesToUpload?.length) return;
      try {
        await uploadTrigger({
          workspaceId,
          parentId: currentFolderId,
          files: Array.from(filesToUpload),
        });
        revalidate(listWorkspaceFilesQuery);
      } catch (e) {
        notify.error({ title: t['com.affine.workspace-files.error.upload']() });
        console.error('Failed to upload workspace files', e);
      }
    },
    [currentFolderId, revalidate, t, uploadTrigger, workspaceId]
  );

  const handleCreateFolder = useCallback(() => {
    openPromptModal({
      title: t['com.affine.workspace-files.new-folder.title'](),
      label: t['com.affine.workspace-files.new-folder.name'](),
      inputOptions: {
        placeholder: t['com.affine.workspace-files.new-folder.name.placeholder'](),
      },
      confirmText: t['com.affine.workspace-files.new-folder.confirm'](),
      cancelText: t['com.affine.rootAppSidebar.workspace-files.empty.upload-button'](),
      confirmButtonOptions: {
        variant: 'primary',
      },
      onConfirm(name) {
        createFolderTrigger({
          workspaceId,
          name,
          parentId: currentFolderId,
        })
          .then(() => revalidate(listWorkspaceFilesQuery))
          .catch(e => {
            console.error('Failed to create workspace folder', e);
            notify.error({
              title: t['com.affine.workspace-files.error.create-folder'](),
            });
          });
      },
    });
  }, [
    createFolderTrigger,
    currentFolderId,
    openPromptModal,
    revalidate,
    t,
    workspaceId,
  ]);

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await deleteTrigger({ id });
        revalidate(listWorkspaceFilesQuery);
      } catch (e) {
        notify.error({ title: t['com.affine.workspace-files.error.delete']() });
        console.error('Failed to delete workspace file', e);
      }
    },
    [deleteTrigger, revalidate, t]
  );

  const handleOpenFolder = useCallback((id: string, name: string) => {
    setCrumbs(prev => [...prev, { id, name }]);
  }, []);

  const handleGoUp = useCallback(() => {
    setCrumbs(prev => (prev.length > 1 ? prev.slice(0, -1) : prev));
  }, []);

  const currentName = useMemo(
    () => crumbs[crumbs.length - 1]?.name,
    [crumbs]
  );

  // Only show for server-backed (cloud / self-hosted) workspaces.
  if (!workspace || workspace.flavour !== 'cloud') {
    return null;
  }

  const isInSubfolder = crumbs.length > 1;
  const isEmpty = items.length === 0;

  return (
    <CollapsibleSection
      path={['workspace-files']}
      testId="navigation-panel-workspace-files"
      title={
        currentFolderId
          ? (currentName ?? t['com.affine.rootAppSidebar.workspace-files']())
          : t['com.affine.rootAppSidebar.workspace-files']()
      }
      actions={
        <>
          {isInSubfolder ? (
            <IconButton
              size="16"
              tooltip={t['com.affine.rootAppSidebar.workspace-files.back-tooltip']()}
              onClick={handleGoUp}
            >
              <ArrowUpIcon />
            </IconButton>
          ) : null}
          <IconButton
            size="16"
            tooltip={t['com.affine.rootAppSidebar.workspace-files.new-folder-tooltip']()}
            onClick={handleCreateFolder}
          >
            <PlusIcon />
          </IconButton>
          <IconButton
            data-testid="navigation-panel-upload-file-button"
            size="16"
            tooltip={t['com.affine.rootAppSidebar.workspace-files.upload-tooltip']()}
            onClick={() => fileInputRef.current?.click()}
          >
            <UploadCloudIcon />
          </IconButton>
        </>
      }
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        hidden
        onChange={e => {
          void handleUpload(e.target.files);
          e.target.value = '';
        }}
      />
      {isEmpty ? (
        <RootEmpty
          onClickUpload={() => fileInputRef.current?.click()}
          onClickCreateFolder={handleCreateFolder}
          inSubfolder={isInSubfolder}
        />
      ) : (
        <div className={styles.fileList}>
          {items.map(file =>
            file.isFolder ? (
              <div key={file.id} className={styles.fileItem}>
                <div
                  className={styles.fileMeta}
                  role="button"
                  title={file.name}
                  onClick={() => handleOpenFolder(file.id, file.name)}
                >
                  <FolderIcon className={styles.icon} />
                  <span className={styles.fileName}>{file.name}</span>
                </div>
                <IconButton
                  size="16"
                  tooltip={t['com.affine.rootAppSidebar.workspace-files.delete-tooltip']()}
                  onClick={() => void handleDelete(file.id)}
                >
                  <DeleteIcon />
                </IconButton>
              </div>
            ) : (
              <div key={file.id} className={styles.fileItem}>
                <a
                  className={styles.fileMeta}
                  href={file.url}
                  target="_blank"
                  rel="noreferrer"
                  title={file.name}
                >
                  <span className={styles.fileName}>{file.name}</span>
                  <span className={styles.fileSize}>
                    {formatSize(file.size)}
                  </span>
                </a>
                <IconButton
                  size="16"
                  tooltip={t['com.affine.rootAppSidebar.workspace-files.delete-tooltip']()}
                  onClick={() => void handleDelete(file.id)}
                >
                  <DeleteIcon />
                </IconButton>
              </div>
            )
          )}
        </div>
      )}
    </CollapsibleSection>
  );
};