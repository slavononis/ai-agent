import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { TavilySearch } from '@langchain/tavily';

// @ts-ignore
const weatherTool2 = new DynamicStructuredTool({
  name: 'get_weather',
  description: 'Get the current weather in a given city',
  schema: z.object({
    city: z.string().describe('The name of the city to get the weather for'),
  }) as z.Schema<{ city: string }>,
  func: async ({ city }: { city: string }) => {
    // mock data (you can call a real API here)
    const fakeWeather: Record<string, string> = {
      Kyiv: 'Sunny, 21°C',
      London: 'Rainy, 14°C',
      Paris: 'Cloudy, 18°C',
    };
    return fakeWeather?.[city] || `No data for ${city}`;
  },
});

export const weatherTool = new TavilySearch({
  maxResults: 2,
  // ...
});
