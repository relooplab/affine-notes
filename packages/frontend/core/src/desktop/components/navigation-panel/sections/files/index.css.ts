import { cssVar } from '@toeverything/theme';
import { style } from '@vanilla-extract/css';

export const fileList = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  padding: '4px 0',
});

export const fileItem = style({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '6px 8px',
  borderRadius: 8,
  fontSize: 14,
  lineHeight: '20px',
  color: cssVar('textPrimaryColor'),
  cursor: 'pointer',
  userSelect: 'none',
  selectors: {
    '&:hover': {
      background: cssVar('hoverColor'),
    },
  },
});

export const fileMeta = style({
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  minWidth: 0,
  flex: 1,
});

export const fileName = style({
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  flex: 1,
});

export const fileSize = style({
  fontSize: 12,
  color: cssVar('textSecondaryColor'),
  whiteSpace: 'nowrap',
});

export const icon = style({
  color: cssVar('iconColor'),
  flexShrink: 0,
});

export const errorText = style({
  color: cssVar('errorColor'),
  fontSize: 12,
  padding: '4px 8px',
});