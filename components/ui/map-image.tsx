import React from 'react';
import Image from 'next/image';

interface MapImageProps {
  src: string;
  alt?: string;
  className?: string;
  grayscale?: boolean;
  blur?: boolean;
  priority?: boolean;
  style?: React.CSSProperties;
  width?: number;
  height?: number;
}

export function MapImage({
  src,
  alt = '',
  className = '',
  grayscale = false,
  blur = false,
  priority = false,
  style,
  width = 220,
  height = 120,
}: MapImageProps) {
  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={[
        'object-cover transition-all duration-700',
        grayscale ? 'grayscale blur-[1px]' : '',
        blur ? 'blur-lg scale-110 brightness-50' : '',
        className,
      ].join(' ')}
      style={style}
      priority={priority}
      draggable={false}
    />
  );
}
