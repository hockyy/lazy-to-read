import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { generateText } from 'ai';

const STORAGE_KEY = 'openrouterApiKey';
const MODEL_KEY = 'selectedModel';
const CUSTOM_MODEL_KEY = 'customModel';

export const AVAILABLE_MODELS = [
  { id: 'anthropic/claude-4.5-sonnet', name: 'Claude 4.5 Sonnet' },
  { id: 'custom', name: 'Custom Model' },
];

async function getStoredApiKey(): Promise<string | undefined> {
  const storage = browser.storage.local;
  const items = await storage.get([STORAGE_KEY]);
  return items?.[STORAGE_KEY];
}

async function getSelectedModel(): Promise<string> {
  const storage = browser.storage.local;
  const items = await storage.get([MODEL_KEY, CUSTOM_MODEL_KEY]);
  const selectedModel = items?.[MODEL_KEY] || AVAILABLE_MODELS[0].id;
  
  if (selectedModel === 'custom') {
    const customModel = items?.[CUSTOM_MODEL_KEY]?.trim();
    if (!customModel) {
      throw new Error('Custom model ID is not set. Please configure it in the popup.');
    }
    return customModel;
  }
  
  return selectedModel;
}

export default defineBackground(() => {
  browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'BRIEF_PROBLEM') {
      (async () => {
        try {
          const apiKey = (await getStoredApiKey())?.trim();
          if (!apiKey) {
            sendResponse({ error: 'Add your OpenRouter API key in the lazy-to-read popup.' });
            return;
          }

          const modelId = await getSelectedModel();

          const openrouter = createOpenRouter({
            apiKey,
            headers: {
              'HTTP-Referer': 'https://lazy-to-read',
              'X-Title': 'lazy-to-read',
            },
          });

          const { text } = await generateText({
            model: openrouter(modelId),
            temperature: 0.2,
            prompt: [
              'You are an expert competitive programming tutor.',
              'Provide a concise brief of the problem: goal, input/output format, important constraints, and key requirements.',
              'Keep it under 180 words and do not provide solution hints.',
              'Use KaTeX/LaTeX syntax for mathematical expressions:',
              '- Inline math: $x + y$',
              '- Display math: $$\\sum_{i=1}^{n} i$$',
              'Format your response in markdown.',
              '',
              'Problem statement:',
              message.problemText,
            ].join('\n'),
          });

          const summary = text.trim();
          if (!summary) {
            sendResponse({ error: 'No summary returned. Please try again.' });
            return;
          }

          // Return raw markdown, rendering happens in content script
          sendResponse({ markdown: summary });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          sendResponse({ error: errorMessage });
        }
      })();
      return true; // Keep the message channel open for async response
    }

    if (message.type === 'GET_MODELS') {
      sendResponse({ models: AVAILABLE_MODELS });
      return false;
    }
  });
});
