import * as React from 'react';
import { GalleryVerticalEnd } from 'lucide-react';

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
} from '@/components/ui/sidebar';
import { Chat } from './chat';
import { useQuery } from '@tanstack/react-query';
import { getChatQueryKey } from './chat.utils';
import { getProjectDetails } from '@/services';
import { useParams } from 'react-router';
import { getFormattedMessage } from '@/utils/chat-formatter';
import { Role } from '@monorepo/shared';

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { id } = useParams<{ id: string }>();
  const { data } = useQuery({
    queryKey: getChatQueryKey(id!),
    queryFn: () => getProjectDetails({ projectId: id! }),
    enabled: !!id,
  });
  const lastAssistantMessage = data?.messages
    ?.slice()
    .reverse()
    .find((msg) => msg.role === Role.AIMessage);
  const project = getFormattedMessage(lastAssistantMessage?.content || '');

  return (
    <Sidebar variant="floating" {...props}>
      <SidebarHeader className="flex items-center flex-row gap-4 border-b">
        <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
          <GalleryVerticalEnd className="size-4" />
        </div>
        <div className="flex flex-col gap-0.5 leading-none">
          <span className="font-semibold">{project.name}</span>
          <span className="text-sm">v {project.version}</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <Chat />
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
