// main.ts

import { Actor, log } from 'apify';
import { OpenAIProvider, AnthropicProvider, GoogleProvider, getProvider } from './providers/index.js';
import { Input, OutputItem } from './types.js';

// Rate limits for OpenAI API lowest tier
const RATE_LIMIT_PER_MINUTE = 500;
const REQUEST_INTERVAL_MS = Math.ceil(60000 / RATE_LIMIT_PER_MINUTE); // Interval between requests in ms

await Actor.init();

try {
    // Get the input
    const input: Input | null = await Actor.getInput();

    if (!input) {
        throw new Error('No input provided. Please provide the necessary input parameters.');
    }

    const {
        inputDatasetId,
        llmApiToken,
        prompt,
        model,
        temperature,
        maxTokens,
        skipItemIfEmpty,
        provider: explicitProvider,
    } = input;

    if (!inputDatasetId) {
        throw new Error('No inputDatasetId provided.');
    }

    // Log configuration details
    const configDetails = {
        datasetId: inputDatasetId,
        model: model,
        promptTemplate: prompt,
    };
    log.info('Configuration details:', configDetails);

    // Helper function to get nested field value using dot notation
    function getNestedValue(obj: any, path: string): any {
        return path.split('.').reduce((current, key) => current && current[key], obj);
    }

    // Helper function to check if a value is empty
    function isEmpty(value: any): boolean {
        if (value === undefined || value === null) return true;
        if (typeof value === 'string') return value.trim() === '';
        if (Array.isArray(value)) return value.length === 0;
        if (typeof value === 'object') return Object.keys(value).length === 0;
        return false;
    }

    // Helper function to check if any placeholder field is empty
    function hasEmptyFields(promptStr: string, item: OutputItem): boolean {
        const fieldMatches = promptStr.match(/\{\{([^}]+)\}\}/g) || [];
        return fieldMatches.some(match => {
            const field = match.slice(2, -2).trim(); // Remove {{ and }}
            const value = getNestedValue(item, field);
            return isEmpty(value);
        });
    }

    // Helper function to replace field placeholders in prompt with actual values
    function replacePlaceholders(promptStr: string, item: OutputItem): string {
        return promptStr.replace(/\{\{([^}]+)\}\}/g, (_match, fieldName: string) => {
            const value = getNestedValue(item, fieldName.trim());
            return value !== undefined ? String(value) : '';
        });
    }

    // Fetch items from the input dataset
    let items: OutputItem[] = [];
    try {
        // First check if dataset exists
        const dataset = await Actor.apifyClient.dataset(inputDatasetId).get();
        if (!dataset) {
            throw new Error(`Dataset with ID ${inputDatasetId} does not exist`);
        }

        const inputDataset = await Actor.openDataset<OutputItem>(inputDatasetId);
        const { items: fetchedItems } = await inputDataset.getData();
        items = fetchedItems;
        log.info(`Fetched ${items.length} items from the input dataset.`);
    } catch (datasetError: unknown) {
        if (datasetError instanceof Error) {
            log.error(`Error accessing dataset: ${datasetError.message}`);
        } else {
            log.error('Error accessing dataset: Unknown error occurred');
        }
        throw datasetError;
    }

    // Initialize API clients
    const providers = {
        openai: new OpenAIProvider(llmApiToken),
        anthropic: new AnthropicProvider(llmApiToken),
        google: new GoogleProvider(llmApiToken),
    };

    // Convert temperature from string to number
    const temperatureNum = parseFloat(temperature);

    // Process each item
    for (let i = 0; i < items.length; i++) {
        const item = items[i];

        try {
            // Skip if any required fields are empty and skipItemIfEmpty is true
            if (skipItemIfEmpty && hasEmptyFields(prompt, item)) {
                log.info(`Skipping item ${i + 1} due to empty fields`);
                continue;
            }

            // Replace placeholders in the prompt
            const promptText = replacePlaceholders(prompt, item);
            log.info(`Processing item ${i + 1}/${items.length}`, { prompt: promptText });

            // Determine the provider and make the API call
            const provider = getProvider(model, explicitProvider); // returns 'openai' | 'anthropic' | 'google'
            const llmResponse = await providers[provider].call(
                promptText,
                model,
                temperatureNum,
                maxTokens
            );

            log.info(`Item ${i + 1} response:`, { response: llmResponse });

            // Add the response to the item
            item.LLMResponse = llmResponse;

            // Push the item to the default dataset
            await Actor.pushData(item);

            // Respect rate limits
            await new Promise(resolve => setTimeout(resolve, REQUEST_INTERVAL_MS));
        } catch (error: unknown) {
            if (error instanceof Error) {
                log.error(`Error processing item ${i + 1}: ${error.message}`);
            } else {
                log.error(`Error processing item ${i + 1}: Unknown error occurred`);
            }

            // Decide whether to continue or break. For now, we rethrow to fail the actor on error.
            throw error;
        }
    }

    log.info('Actor finished successfully');
} catch (error: unknown) {
    if (error instanceof Error) {
        log.error(`Actor failed: ${error.message}`);
    } else {
        log.error('Actor failed: Unknown error occurred');
    }
    throw error;
} finally {
    await Actor.exit();
}
