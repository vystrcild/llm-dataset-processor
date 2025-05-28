import Anthropic from '@anthropic-ai/sdk';
import { LLMProvider } from '../types.js';

export class AnthropicProvider implements LLMProvider {
    private client: Anthropic;

    constructor(apiKey: string) {
        this.client = new Anthropic({ apiKey });
    }

    async call(promptText: string, model: string, temperature: number, maxTokens: number): Promise<string> {
        const message = await this.client.messages.create({
            model,
            max_tokens: maxTokens,
            temperature,
            messages: [{ role: 'user', content: promptText }],
        });

        if (!message.content || message.content.length === 0) {
            return '';
        }

        const textContent = message.content.find((c) => c.type === 'text');
        return textContent?.text || '';
    }
}
