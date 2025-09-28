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
