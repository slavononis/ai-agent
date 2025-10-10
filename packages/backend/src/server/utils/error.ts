export function serializeError(err: any): {
  message: string;
  stack?: string;
  name?: string;
} {
  if (err instanceof Error) {
    return {
      message: err.message,
      stack: err.stack,
      name: err.name,
    };
  }
  return { message: String(err) };
}
