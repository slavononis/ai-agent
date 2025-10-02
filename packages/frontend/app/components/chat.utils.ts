import type { Mode } from '@/routes/home';

export const getChatQueryKey = (thread_id: string, mode: Mode) => [
  mode,
  'details',
  thread_id,
];
