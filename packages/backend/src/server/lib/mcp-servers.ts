import { Connection, MultiServerMCPClient } from '@langchain/mcp-adapters';

export const mcpServers: Record<string, Connection> = {
  shadcn: {
    transport: 'stdio',
    command: 'npx',
    args: [
      '@jpisnice/shadcn-ui-mcp-server',
      '--github-api-key',
      process.env.GITHUB_API_KEY!,
    ],
  },
};
import { DynamicStructuredTool } from '@langchain/core/tools';

declare global {
  var _mcpsTools: DynamicStructuredTool[] | undefined;
}

export const initMcps = async () => {
  try {
    if (global._mcpsTools) return global._mcpsTools;

    const client = new MultiServerMCPClient(mcpServers);
    const tools = await client.getTools();
    return (global._mcpsTools = tools);
  } catch (error) {
    console.error('Error in initMcps:', error);
    throw error;
  }
};
