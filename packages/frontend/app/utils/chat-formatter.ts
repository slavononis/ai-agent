import { Role, type StructuredContent } from '@monorepo/shared';

export type ProjectModel = {
  name: string;
  type: string;
  description: string;
  version?: string;
  files: Array<{
    path: string;
    content: string;
  }>;
};
const errorData: ProjectModel = {
  name: 'error',
  type: 'error',
  description: 'error',
  files: [],
};
export const getFormattedMessage = (content: string): ProjectModel => {
  try {
    if (!content) return { name: '', type: '', description: '', files: [] };
    const obj: ProjectModel = JSON.parse(content);
    if (
      typeof obj.name === 'string' &&
      typeof obj.type === 'string' &&
      typeof obj.description === 'string' &&
      Array.isArray(obj.files) &&
      obj.files.every(
        (file) =>
          typeof file.path === 'string' && typeof file.content === 'string'
      )
    ) {
      return obj;
    } else {
      return errorData;
    }
  } catch (error) {
    return errorData;
  }
};

export const getStructuralContent = (
  content: string | StructuredContent[]
): string => {
  if (typeof content === 'string') return content;

  return content.reduce((acc, curr) => {
    switch (curr.type) {
      case 'text':
        acc += `${curr.text}\n\n` || '';
        break;
      case 'file':
        acc += `![${curr.filename}](internal-file)`;
        break;
      case 'image_url':
        if (curr.image_url?.url) {
          acc += `![${curr.image_url?.url}](${curr.image_url?.url})`;
        }
      default:
        break;
    }

    return acc;
  }, '');
};

export const setStructuralContent = (
  content: string,
  files?: File[]
): StructuredContent[] => {
  return [
    {
      type: 'text',
      text: content,
    },
    ...(files?.map((file): StructuredContent => {
      if (!file.type.startsWith('image/')) {
        return {
          type: 'file',
          filename: file.name,
          text: '',
        };
      }
      return {
        type: 'image_url',
        image_url: {
          url: URL.createObjectURL(file!),
        },
      };
    }) ?? []),
  ];
};

export const chatRoles = [Role.AIMessage, Role.AIMessageChunk];
