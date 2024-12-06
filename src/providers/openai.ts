import OpenAI from 'openai';
import { LLMProvider } from '../types.js';

export class OpenAIProvider implements LLMProvider {
    private client: OpenAI;

    constructor(apiKey: string) {
        this.client = new OpenAI({ apiKey });
    }

    async call(promptText: string, model: string, temperature: number, maxTokens: number): Promise<string> {
        const completion = await this.client.chat.completions.create({
            messages: [{ role: 'user', content: promptText }],
            model,
            temperature,
            max_tokens: maxTokens,
        });
        return completion.choices[0]?.message?.content || '';
    }
}
