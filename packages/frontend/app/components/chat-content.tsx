import { TreeView } from './tree-view';
import { useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { getChatQueryKey } from './chat.utils';
import { getProjectDetails } from '@/services/project';
import { Role } from '@monorepo/shared';
import { getFormattedMessage } from '@/utils/chat-formatter';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { useEffect, useState } from 'react';
import { MarkdownCode } from './markdown-code';
import WebAppPreView from './web-app-preview';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { Code, Search } from 'lucide-react';
import { FileBtn } from './file-btn';
import { Input } from './ui/input';
import { Mode } from '@/routes/home';
import { Chat } from './chat';

export const ChatContent = () => {
  return (
    <SidebarInset className="overflow-hidden">
      <header className="bg-background border-b group-data-[variant=floating]:border z-50 sticky top-0 flex h-14 shrink-0 items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" />
      </header>

      <Chat mode={Mode.Chat} />
    </SidebarInset>
  );
};
