// src/components/ThemedCard.tsx
import { X } from 'lucide-react';
import React from 'react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

interface ThemedCardProps {
  title: string;
  action?: (value: string) => void;
  active?: boolean;
  onSelect?: (value: string) => void;
}

export const FileBtn: React.FC<ThemedCardProps> = ({
  title,
  action,
  active,
  onSelect,
}) => {
  const fileName = title.split('/').pop() || title;
  return (
    <div
      onClick={() => {
        console.log('first');
        onSelect?.(title);
      }}
      className={cn(
        'h-6 bg-card/30 text-card-foreground border-r border-b p-1 max-w-40 min-w-40 flex items-center justify-between gap-2 group relative',
        {
          'bg-card text-card-foreground': active,
        }
      )}
    >
      <span className="text-xs font-semibold truncate">{title}</span>
      {action && (
        <Button
          onClick={(e) => {
            e.stopPropagation();
            action(title);
          }}
          className="p-0.5 rounded-full size-3.5 opacity-0 group-hover:opacity-100 transition-opacity absolute right-1"
          size={'icon'}
        >
          <X className="size-2.5" />
        </Button>
      )}
    </div>
  );
};
