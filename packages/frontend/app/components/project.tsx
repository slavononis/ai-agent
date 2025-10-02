import { ProjectSidebar } from '@/components/project-sidebar';
import { SidebarProvider } from '@/components/ui/sidebar';

import { ProjectContent } from './project-content';

export const Project = () => {
  return (
    <SidebarProvider>
      <ProjectSidebar />
      <ProjectContent />
    </SidebarProvider>
  );
};
