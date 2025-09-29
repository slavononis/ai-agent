import { AppSidebar } from '@/components/app-sidebar';
import { SidebarProvider } from '@/components/ui/sidebar';

import { ProjectContent } from './project-content';

export const Project = () => {
  return (
    <SidebarProvider>
      <AppSidebar />
      <ProjectContent />
    </SidebarProvider>
  );
};
