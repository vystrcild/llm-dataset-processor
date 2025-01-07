export interface Input {
    inputDatasetId: string;
    defaultDatasetId: string;
    llmProviderApiKey: string;
    prompt: string;
    model: string;
    temperature: string;
    maxTokens: number;
    skipItemIfEmpty?: boolean;
    multipleColumns?: boolean;
    testPrompt?: boolean;
    testItemsCount?: number;
    payload: Payload | null;
}

export interface Payload {
    resource: Resource;
}

export interface Resource {
    defaultDatasetId: string;
}

export interface OutputItem extends Record<string, any> {
    LLMResponse: string | null;
}

export interface LLMProvider {
    call(promptText: string, model: string, temperature: number, maxTokens: number): Promise<string>;
}
