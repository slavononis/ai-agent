import type { Route } from './+types/home';
import { Project } from '@/components/project';
import { ProtectedRoute } from '@/components/protected-route';

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'New React Router App' },
    { name: 'description', content: 'Welcome to React Router!' },
  ];
}

export default function ProjectPage() {
  return (
    <ProtectedRoute>
      <Project />
    </ProtectedRoute>
  );
}
