import { ChatPromptTemplate } from '@langchain/core/prompts';
import { ChatOpenAI } from '@langchain/openai';

export async function generateChatName(
  userMessage: string,
  aiResponse?: string
): Promise<string> {
  try {
    const promptContent = aiResponse
      ? `Based on this conversation, generate a short, descriptive chat title (max 5 words). User: "${userMessage.substring(0, 100)}" Assistant: "${aiResponse.substring(0, 100)}"`
      : `Generate a short, descriptive title (max 5 words) for a chat starting with: "${userMessage.substring(0, 100)}"`;

    const namingPrompt = ChatPromptTemplate.fromMessages([
      {
        role: 'system',
        content:
          'You are a helpful assistant that generates concise, descriptive chat titles. Respond with only the title, no additional text. Maximum 5 words.',
      },
      {
        role: 'user',
        content: promptContent,
      },
    ]);

    const namingLlm = new ChatOpenAI({
      model: 'gpt-3.5-turbo',
      temperature: 0.7,
    });

    const response = await namingLlm.invoke(await namingPrompt.invoke({}));
    let title = response.content.toString().trim();

    // Clean up the title
    title = title.replace(/["']/g, '').substring(0, 60);

    return title || 'New Chat';
  } catch (error) {
    console.error('Error generating chat name:', error);
    // Fallback: use first few words of user message
    const words = userMessage.split(' ').slice(0, 4).join(' ');
    return words || 'New Chat';
  }
}
