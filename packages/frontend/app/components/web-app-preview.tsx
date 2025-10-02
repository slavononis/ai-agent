import React from 'react';
import {
  Sandpack,
  SandpackLayout,
  SandpackPreview,
  SandpackProvider,
} from '@codesandbox/sandpack-react';
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
      let path = f.path.startsWith('/') ? f.path : `/${f.path}`;
      // if (path.includes('App')) {
      //   path = path.replace('/src/', '');
      //   console.log(path, 'here');
      // }
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
  const devDependencies = pkgJson
    ? Object.keys(JSON.parse(pkgJson.content).devDependencies).reduce(
        (acc, key) => {
          acc[key] = JSON.parse(pkgJson.content).devDependencies[key];
          return acc;
        },
        {} as Record<string, string>
      )
    : {};
  return (
    <SandpackProvider template="vite-vue" files={preparedFiles} theme="auto">
      <SandpackLayout style={{ border: 'none', borderRadius: 0 }}>
        <SandpackPreview
          style={{
            height: 'calc(100vh - 58px)',
            backgroundColor: 'var(--color-background)',
          }}
        />
      </SandpackLayout>
    </SandpackProvider>
  );

  return (
    <Sandpack
      template="vite-react"
      files={preparedFiles}
      // customSetup={{ dependencies }}
      // customSetup={{
      //   dependencies: {
      //     // '@codesandbox/sandpack-react': '^2.20.0',
      //   },
      // }}
      options={{
        showConsole: true,
        showNavigator: true,
        showLineNumbers: true,
        showTabs: true,
        editorHeight: 'calc(100vh - 58px)',
        externalResources: ['https://cdn.tailwindcss.com'],
      }}
      theme="auto"
    />
  );
}
