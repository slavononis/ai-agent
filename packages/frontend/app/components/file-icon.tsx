import React from 'react';
// @ts-ignore
import { getClassWithColor } from 'file-icons-js';
import 'file-icons-js/css/style.css';
import { File } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = {
  filename: string;
  size?: number;
};

const FileIcon: React.FC<Props> = ({ filename, size = 18 }) => {
  let className = getClassWithColor(filename); // e.g. "icon icon-javascript js-color"

  if (!className) {
    return <File />;
  }

  return (
    <i
      className={cn(className, 'not-italic')}
      style={{ fontSize: size, verticalAlign: 'middle' }}
    />
  );
};

export default FileIcon;
