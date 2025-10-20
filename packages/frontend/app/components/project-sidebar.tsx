import * as React from 'react';

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
} from '@/components/ui/sidebar';
import { Chat } from './chat';
import { chatRoles, getFormattedMessage } from '@/utils/chat-formatter';
import { Mode } from '@/routes/home';
import { ProjectList } from './project-list';
import { useChatData } from '@/hooks/use-chat';

export function ProjectSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const { data } = useChatData({ mode: Mode.Code });
  const lastAssistantMessage = data?.messages
    ?.slice()
    .reverse()
    .find((msg) => chatRoles.includes(msg.role));
  const project = getFormattedMessage(
    Array.isArray(lastAssistantMessage?.content)
      ? ''
      : lastAssistantMessage?.content || ''
  );

  return (
    <Sidebar variant="floating" {...props}>
      <SidebarHeader className="flex items-center flex-row gap-4 border-b">
        <div className="flex items-center justify-center">
          <ProjectList />
        </div>
        <div className="flex flex-col gap-0.5 leading-none">
          <span hidden={!project.name} className="font-semibold">
            {project.name}
          </span>
          <span hidden={!project.version} className="text-sm">
            v {project.version}
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <Chat mode={Mode.Code} />
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
