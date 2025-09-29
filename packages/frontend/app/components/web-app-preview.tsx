import React from 'react';
import { Sandpack } from '@codesandbox/sandpack-react';
import type { ProjectModel } from '@/utils/chat-formatter';

function remapFiles(files: ProjectModel['files']) {
  const sandpackFiles: Record<string, string> = {};

  files.forEach((f) => {
    let path = f.path;

    // Remove leading slash if present for Sandpack compatibility
    if (path.startsWith('/')) {
      path = path.substring(1);
    }

    // Handle special files that need to be at root
    if (
      path === 'package.json' ||
      path === 'index.html' ||
      path === 'tailwind.config.js' ||
      path === 'postcss.config.js' ||
      path === 'vite.config.ts' ||
      path === 'tsconfig.json' ||
      path === 'tsconfig.node.json' ||
      path === '.gitignore' ||
      path === '.env.example'
    ) {
      sandpackFiles[`/${path}`] = f.content;
    } else if (path === 'public/index.html') {
      // Move public/index.html to root
      sandpackFiles['/index.html'] = f.content;
    } else {
      // All other files go in src
      sandpackFiles[`/src/${path}`] = f.content;
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

  // Extract dependencies from package.json
  const pkgJson = files.find((f) => f.path === 'package.json');
  let dependencies: Record<string, string> = {};
  let devDependencies: Record<string, string> = {};

  if (pkgJson) {
    try {
      const pkg = JSON.parse(pkgJson.content);
      dependencies = pkg.dependencies || {};
      devDependencies = pkg.devDependencies || {};
    } catch (error) {
      console.error('Error parsing package.json:', error);
    }
  }

  // Combine dependencies for Sandpack
  const allDependencies = {
    ...dependencies,
    ...devDependencies,
    // Ensure required dependencies are included
    react: dependencies.react || '^18.2.0',
    'react-dom': dependencies['react-dom'] || '^18.2.0',
    '@types/react': devDependencies['@types/react'] || '^18.0.24',
    '@types/react-dom': devDependencies['@types/react-dom'] || '^18.0.9',
  };

  return (
    <Sandpack
      template="react-ts"
      files={preparedFiles}
      customSetup={{
        dependencies: allDependencies,
        environment: 'node' as any,
      }}
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
