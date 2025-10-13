// import { DynamicStructuredTool } from '@langchain/core/tools';
// import { z } from 'zod';
import { TavilySearch } from '@langchain/tavily';

export const tavilySearch = new TavilySearch({
  maxResults: 3,
});

// @ts-ignore
// export const webSearchTool = new DynamicStructuredTool({
//   name: 'web_search',
//   description: 'Search the web for up-to-date information.',
//   schema: z.object({
//     query: z.string().describe('Search query to look up on the web'),
//   }) as z.Schema<{ query: string }>,
//   func: async ({ query }) => {
//     const { results = [] } = await tavilySearch.invoke({ query });
//     // Tavily returns { results: [{title, url, content}, ...] }
//     console.log(results, 'Tavily returns');
//     // `• ${r.title}\n${r.url}\n${r.content.slice(0, 300)}…`
//     const res = results
//       .map(
//         (r: any) => `
//         •Title: ${r.title}
//         •URL: ${r.url}
//         •Content:${r.content}`
//       )
//       .join('\n\n');
//     console.log(res, 'res----------------------------');
//     return res;
//   },
// });
