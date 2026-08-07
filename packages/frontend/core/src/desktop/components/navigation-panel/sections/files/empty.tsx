import { Button } from '@affine/component';
import { useI18n } from '@affine/i18n';
import { FolderIcon } from '@blocksuite/icons/rc';

import { NavigationPanelEmptySection } from '../../layouts/empty-section';

export const RootEmpty = ({
  onClickUpload,
  onClickCreateFolder,
  inSubfolder,
}: {
  onClickUpload?: () => void;
  onClickCreateFolder?: () => void;
  inSubfolder?: boolean;
}) => {
  const t = useI18n();

  return (
    <NavigationPanelEmptySection
      icon={FolderIcon}
      message={
        inSubfolder
          ? t['com.affine.rootAppSidebar.workspace-files.empty-folder.message']()
          : t['com.affine.rootAppSidebar.workspace-files.empty.message']()
      }
      messageTestId="slider-bar-workspace-files-empty-message"
      actionText={t['com.affine.rootAppSidebar.workspace-files.empty.upload-button']()}
      onActionClick={onClickUpload}
    >
      {inSubfolder && onClickCreateFolder ? (
        <Button onClick={onClickCreateFolder}>
          {t['com.affine.rootAppSidebar.workspace-files.new-folder-tooltip']()}
        </Button>
      ) : null}
    </NavigationPanelEmptySection>
  );
};