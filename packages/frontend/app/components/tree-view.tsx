import { ChevronRight, Folder } from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
} from '@/components/ui/sidebar';
import FileIcon from './file-icon';
// import { FileIcon, defaultStyles } from 'react-file-icon';
// Type definitions
type TreeNode = {
  [key: string]: TreeNode | null;
};

type TreeItem = string | TreeArray;
type TreeArray = [string, ...TreeItem[]];

// Convert flat file paths to nested tree structure
function buildTree(paths: string[]): TreeNode {
  const tree: TreeNode = {};

  paths.forEach((path: string) => {
    const parts: string[] = path.split('/');
    let currentLevel: TreeNode = tree;

    parts.forEach((part: string, index: number) => {
      if (!currentLevel[part]) {
        currentLevel[part] = index === parts.length - 1 ? null : {};
      }
      if (currentLevel[part] !== null) {
        currentLevel = currentLevel[part] as TreeNode;
      }
    });
  });

  return tree;
}

// Convert the tree object to the array structure expected by the Tree component
function convertToArray(tree: TreeNode): TreeItem[] {
  return Object.keys(tree)
    .sort((a, b) => {
      const aIsFolder = tree[a] !== null;
      const bIsFolder = tree[b] !== null;

      // Folders first
      if (aIsFolder && !bIsFolder) return -1;
      if (!aIsFolder && bIsFolder) return 1;

      // Alphabetical order within same type
      return a.localeCompare(b, undefined, { sensitivity: 'base' });
    })
    .map((key: string) => {
      if (tree[key] === null) {
        return key; // File
      } else {
        const children: TreeItem[] = convertToArray(tree[key] as TreeNode);
        return [key, ...children]; // Folder with children
      }
    });
}

interface TreeViewProps {
  filePaths: string[];
  activeFile?: string;
  onFileSelect?: (filePath: string) => void;
}

export function TreeView({
  filePaths,
  activeFile,
  onFileSelect,
}: TreeViewProps) {
  const treeData: TreeItem[] = convertToArray(buildTree(filePaths));

  return (
    <div className="!max-h-[calc(100vh-108px)] p-2 !overflow-auto !overflow-x-hidden">
      {treeData.map((item: TreeItem, index: number) => (
        <Tree
          key={index}
          item={item}
          activeFile={activeFile}
          onFileSelect={onFileSelect}
          currentPath=""
        />
      ))}
    </div>
  );
}

interface TreeProps {
  item: TreeItem;
  activeFile?: string;
  onFileSelect?: (filePath: string) => void;
  currentPath: string;
}

function Tree({ item, activeFile, onFileSelect, currentPath }: TreeProps) {
  const isArray = Array.isArray(item);
  const name: string = isArray ? item[0] : item;
  const items: TreeItem[] = isArray ? item.slice(1) : [];

  const fullPath = currentPath ? `${currentPath}/${name}` : name;

  if (!items.length) {
    // This is a file
    const isActive = activeFile === fullPath;

    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          isActive={isActive}
          className="data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground"
          onClick={() => onFileSelect?.(fullPath)}
        >
          <FileIcon filename={name} />

          {name}
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  // This is a folder
  return (
    <SidebarMenuItem>
      <Collapsible
        className="group/collapsible [&[data-state=open]>button>svg:first-child]:rotate-90"
        defaultOpen={name === 'src' || name === 'components'}
      >
        <CollapsibleTrigger asChild>
          <SidebarMenuButton>
            <ChevronRight className="transition-transform" />
            <Folder />
            {name}
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent className="mr-0">
          <SidebarMenuSub className="mr-0 pr-0">
            {items.map((subItem: TreeItem, index: number) => (
              <Tree
                key={index}
                item={subItem}
                activeFile={activeFile}
                onFileSelect={onFileSelect}
                currentPath={fullPath}
              />
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </Collapsible>
    </SidebarMenuItem>
  );
}
