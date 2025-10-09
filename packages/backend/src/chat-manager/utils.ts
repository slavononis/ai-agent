export const contentTypes = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/csv',
  'text/plain',
  'application/json',
] as const;

export type AppMimeType = (typeof contentTypes)[number];
export const ALLOWED_MIME_TYPES = new Set(contentTypes);
