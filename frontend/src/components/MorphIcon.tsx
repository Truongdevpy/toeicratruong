import React from 'react';
import { MorphIcon as CoreMorphIcon, MorphIconProps } from 'morphicons/react';
import { Play, Pause, Volume2, VolumeX, Menu, X, Check, Bookmark } from 'lucide';

export { CoreMorphIcon as MorphIcon };

export interface MorphPlayPauseProps extends Omit<MorphIconProps, 'icon'> {
  isPlaying: boolean;
  size?: number | string;
}

export const MorphPlayPause: React.FC<MorphPlayPauseProps> = ({
  isPlaying,
  size = 20,
  spring = 'snappy',
  className = '',
  ...props
}) => {
  return (
    <CoreMorphIcon
      icon={isPlaying ? Pause : Play}
      size={size}
      spring={spring}
      className={className}
      {...props}
    />
  );
};

export interface MorphVolumeProps extends Omit<MorphIconProps, 'icon'> {
  isMuted: boolean;
  size?: number | string;
}

export const MorphVolume: React.FC<MorphVolumeProps> = ({
  isMuted,
  size = 18,
  spring = 'snappy',
  className = '',
  ...props
}) => {
  return (
    <CoreMorphIcon
      icon={isMuted ? VolumeX : Volume2}
      size={size}
      spring={spring}
      className={className}
      {...props}
    />
  );
};

export interface MorphMenuCloseProps extends Omit<MorphIconProps, 'icon'> {
  isOpen: boolean;
  size?: number | string;
}

export const MorphMenuClose: React.FC<MorphMenuCloseProps> = ({
  isOpen,
  size = 20,
  spring = 'snappy',
  className = '',
  ...props
}) => {
  return (
    <CoreMorphIcon
      icon={isOpen ? X : Menu}
      size={size}
      spring={spring}
      className={className}
      {...props}
    />
  );
};

export interface MorphBookmarkProps extends Omit<MorphIconProps, 'icon'> {
  isSaved: boolean;
  size?: number | string;
}

export const MorphBookmark: React.FC<MorphBookmarkProps> = ({
  isSaved,
  size = 18,
  spring = 'bouncy',
  className = '',
  ...props
}) => {
  return (
    <CoreMorphIcon
      icon={isSaved ? Check : Bookmark}
      size={size}
      spring={spring}
      className={className}
      {...props}
    />
  );
};
