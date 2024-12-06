export interface Input {
    inputDatasetId: string;
    llmApiToken: string;
    prompt: string;
    model: string;
    temperature: string;
    maxTokens: number;
    skipItemIfEmpty?: boolean;
    provider?: 'openai' | 'anthropic' | 'google';
}

export interface OutputItem extends Record<string, any> {
    LLMResponse: string | null;
}

export interface LLMProvider {
    call(promptText: string, model: string, temperature: number, maxTokens: number): Promise<string>;
}
