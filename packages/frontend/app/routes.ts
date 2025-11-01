import { type RouteConfig, index, route } from '@react-router/dev/routes';

export default [
  route('login', 'routes/login.tsx'),
  route('register', 'routes/register.tsx'),
  index('routes/home.tsx'),
  route('project/:id', 'routes/project.tsx'),
  route('chat/:id', 'routes/chat.tsx'),
] satisfies RouteConfig;
