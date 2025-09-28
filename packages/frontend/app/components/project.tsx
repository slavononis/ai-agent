import { AppSidebar } from '@/components/app-sidebar';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { TreeView } from './tree-view';
import { useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { getChatQueryKey } from './chat.utils';
import { getProjectDetails } from '@/services';
import { Role } from '@monorepo/shared';
import { getFormattedMessage } from '@/utils/chat-formatter';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { useState } from 'react';
import { MarkdownCode } from './markdown-code';
import WebAppPreView from './web-app-preview';
export const Project = () => {
  const [activeFile, setActiveFile] = useState<string>(
    'src/components/Button.tsx'
  );
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
  const filePaths = (project.files || []).map((file) => file.path);

  const activeFileContent =
    project.files?.find((file) => file.path === activeFile)?.content || '';
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="overflow-hidden">
        <header className="bg-background border-b group-data-[variant=floating]:border z-50 sticky top-0 flex h-14 shrink-0 items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
        </header>
        {/* <div className="flex flex-col gap-2 p-4"></div> */}
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel defaultSize={25}>
            <TreeView
              filePaths={filePaths}
              activeFile={activeFile}
              onFileSelect={setActiveFile}
            />
          </ResizablePanel>
          <ResizableHandle />
          <ResizablePanel defaultSize={75}>
            <MarkdownCode content={activeFileContent} />
            {/* <WebAppPreView files={project.files} /> */}
          </ResizablePanel>
        </ResizablePanelGroup>
      </SidebarInset>
    </SidebarProvider>
  );
};
