export * from './openai.js';
export * from './anthropic.js';
export * from './google.js';

export const getProvider = (model: string, explicitProvider?: string): 'openai' | 'anthropic' | 'google' => {
    if (explicitProvider) {
        return explicitProvider as 'openai' | 'anthropic' | 'google';
    }
    if (model.startsWith('claude')) return 'anthropic';
    if (model.startsWith('gemini')) return 'google';
    return 'openai';
};
