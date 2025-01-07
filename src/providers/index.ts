export * from './openai.js';
export * from './anthropic.js';
export * from './google.js';

export const getProvider = (model: string): 'openai' | 'anthropic' | 'google' => {
    if (model.includes('claude-')) return 'anthropic';
    if (model.startsWith('gemini-')) return 'google';
    if (model.startsWith('gpt-')) return 'openai';
    throw new Error(`Unknown model provider for model: ${model}`);
};
