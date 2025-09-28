import React from 'react';
import { Sandpack } from '@codesandbox/sandpack-react';
import type { ProjectModel } from '@/utils/chat-formatter';

function remapFiles(files: ProjectModel['files']) {
  const sandpackFiles: Record<string, string> = {};

  files.forEach((f) => {
    // Only include frontend files
    if (
      f.path.endsWith('.tsx') ||
      f.path.endsWith('.jsx') ||
      f.path.endsWith('.ts') ||
      f.path.endsWith('.js') ||
      f.path.endsWith('.css') ||
      f.path.endsWith('.html')
    ) {
      const path = f.path.startsWith('/') ? f.path : `/${f.path}`;
      sandpackFiles[path] = f.content;
    }
  });

  return sandpackFiles;
}

export default function WebAppPreView({
  files,
}: {
  files: ProjectModel['files'];
}) {
  const preparedFiles = remapFiles(files);
  const pkgJson = files.find((f) => f.path === 'package.json');
  const dependencies = pkgJson
    ? Object.keys(JSON.parse(pkgJson.content).dependencies).reduce(
        (acc, key) => {
          acc[key] = JSON.parse(pkgJson.content).dependencies[key];
          return acc;
        },
        {} as Record<string, string>
      )
    : {};

  return (
    <Sandpack
      template="vite-react"
      files={preparedFiles}
      customSetup={{ dependencies }}
      options={{
        showConsole: true,
        showNavigator: false,
        editorHeight: 500,
      }}
    />
  );
}
