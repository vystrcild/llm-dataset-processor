import { GoogleGenerativeAI } from '@google/generative-ai';
import { LLMProvider } from '../types.js';

export class GoogleProvider implements LLMProvider {
    private client: GoogleGenerativeAI;

    constructor(apiKey: string) {
        this.client = new GoogleGenerativeAI(apiKey);
    }

    async call(promptText: string, model: string, temperature: number, maxTokens: number): Promise<string> {
        const genModel = this.client.getGenerativeModel({ model });
        
        const result = await genModel.generateContent({
            contents: [{ role: 'user', parts: [{ text: promptText }] }],
            generationConfig: {
                temperature,
                maxOutputTokens: maxTokens,
            },
        });

        const response = result.response;
        return response.text();
    }
}
