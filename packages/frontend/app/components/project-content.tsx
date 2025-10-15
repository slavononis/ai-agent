import { TreeView } from './tree-view';
import { Link, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { getChatQueryKey } from './chat.utils';
import { getProjectDetails } from '@/services/project';
import { Role } from '@monorepo/shared';
import { chatRoles, getFormattedMessage } from '@/utils/chat-formatter';
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
import { Code, PlusIcon, Search } from 'lucide-react';
import { FileBtn } from './file-btn';
import { Input } from './ui/input';
import { Mode } from '@/routes/home';
import { RoutesPath } from '@/utils/routes.config';

export const ProjectContent = () => {
  const { id } = useParams<{ id: string }>();
  const [searchQuery, setSearchQuery] = useState('');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [activeFile, setActiveFile] = useState<string>('');
  const [headerButtons, setHeaderButtons] = useState<string[]>([]);
  const { data, isLoading } = useQuery({
    queryKey: getChatQueryKey(id!, Mode.Code),
    queryFn: () => getProjectDetails({ projectId: id! }),
    enabled: !!id,
  });

  const lastAssistantMessage = data?.messages
    ?.slice()
    .reverse()
    .find((msg) => chatRoles.includes(msg.role));

  const project = getFormattedMessage(
    Array.isArray(lastAssistantMessage?.content)
      ? ''
      : lastAssistantMessage?.content || ''
  );

  const filePaths = (project.files || [])
    .map((file) => file.path)
    .filter((v) => v.toLowerCase().includes(searchQuery.toLowerCase()));

  const activeFileContent =
    project.files?.find((file) => file.path === activeFile)?.content || '';

  // Ensure we always have an active file if tabs exist
  useEffect(() => {
    if (!activeFile && headerButtons.length > 0) {
      setActiveFile(headerButtons[0]);
    }
  }, [activeFile, headerButtons]);

  // Ensure first file gets set if project updates
  useEffect(() => {
    if (!activeFile && filePaths.length > 0) {
      setActiveFile(filePaths[0]);
      setHeaderButtons([filePaths[0]]);
    }
  }, [filePaths]);

  return (
    <SidebarInset className="overflow-hidden">
      <header className="bg-background border-b group-data-[variant=floating]:border z-50 sticky top-0 flex h-14 shrink-0 items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" />
        <Button
          variant={isPreviewOpen ? 'default' : 'secondary'}
          size="icon"
          className={cn('size-7')}
          onClick={() => setIsPreviewOpen(!isPreviewOpen)}
        >
          <Code />
          <span className="sr-only">Toggle Code</span>
        </Button>
        <Link to={RoutesPath.Home} replace className="ml-auto">
          <Button size={'sm'}>
            <PlusIcon />
            New Project
          </Button>
        </Link>
      </header>

      {!isLoading && (
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel defaultSize={25}>
            <div className="bg-background flex items-center p-2 sticky top-0 z-40">
              <div className="relative w-full">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.currentTarget.value)}
                  placeholder="Search..."
                  className="pl-8" // push text right so it doesn't overlap icon
                />
              </div>
            </div>
            <TreeView
              filePaths={filePaths}
              activeFile={activeFile}
              onFileSelect={(active) => {
                setActiveFile(active);
                if (!headerButtons.includes(active)) {
                  setHeaderButtons((prev) => [...prev, active]);
                }
                setIsPreviewOpen(false);
              }}
            />
          </ResizablePanel>
          <ResizableHandle />
          <ResizablePanel defaultSize={75}>
            {isPreviewOpen ? (
              <WebAppPreView key={project.version} files={project.files} />
            ) : (
              <>
                <div className="overflow-x-auto flex items-center h-6 sticky top-0 bg-background z-10 scrollbar-none">
                  {headerButtons.map((file) => (
                    <FileBtn
                      key={file}
                      title={file}
                      action={(v) => {
                        const remaining = headerButtons.filter((f) => f !== v);
                        if (headerButtons.length === 1) {
                          return;
                        }
                        setHeaderButtons(remaining);

                        if (v === activeFile) {
                          if (remaining.length > 0) {
                            setActiveFile(remaining[remaining.length - 1]);
                            setIsPreviewOpen(false);
                          }
                        }
                      }}
                      onSelect={(value) => {
                        setActiveFile(value);
                        setIsPreviewOpen(false);
                      }}
                      active={file === activeFile}
                    />
                  ))}
                </div>

                <MarkdownCode content={activeFileContent} />
              </>
            )}
          </ResizablePanel>
        </ResizablePanelGroup>
      )}
    </SidebarInset>
  );
};
