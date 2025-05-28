// main.ts

import { Actor, log } from 'apify';
import { OpenAIProvider, AnthropicProvider, GoogleProvider, getProvider } from './providers/index.js';
import { Input, OutputItem, ValidatedInput } from './types.js';
import { parseCustomPreprocessingFunction } from './utils.js';

// Rate limits for OpenAI API lowest tier
const RATE_LIMIT_PER_MINUTE = 500;
const REQUEST_INTERVAL_MS = Math.ceil(60000 / RATE_LIMIT_PER_MINUTE); // Interval between requests in ms

await Actor.init();

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
function hasEmptyFields(promptStr: string, item: any): boolean {
    const fieldMatches = promptStr.match(/\$\{([^}]+)\}/g) || [];
    return fieldMatches.some((match) => {
        const field = match.slice(2, -1).trim(); // Remove ${ and }
        const value = getNestedValue(item, field);
        return isEmpty(value);
    });
}

// Helper function to replace field placeholders in prompt with actual values
function replacePlaceholders(promptStr: string, item: any): string {
    return promptStr.replace(/\$\{([^}]+)\}/g, (_match, fieldName: string) => {
        const value = getNestedValue(item, fieldName.trim());
        return value !== undefined ? String(value) : '';
    });
}

async function validateInput(): Promise<ValidatedInput> {
    const input = await Actor.getInput() as Input;
    if (!input) {
        throw new Error('No input provided. Please provide the necessary input parameters.');
    }

    const {
        llmProviderApiKey,
        prompt,
        model,
        temperature,
        maxTokens,
        skipItemIfEmpty,
        multipleColumns = false,
        testPrompt = false,
        testItemsCount = 3,
    } = input;

    const inputDatasetId = input?.inputDatasetId || input?.payload?.resource?.defaultDatasetId;

    if (!inputDatasetId) {
        throw new Error('No inputDatasetId provided. Please provide the necessary input parameters.');
    }

    const preprocessingFunction = parseCustomPreprocessingFunction(input.preprocessingFunction);

    return {
        inputDatasetId,
        llmProviderApiKey,
        prompt,
        model,
        temperature,
        maxTokens,
        skipItemIfEmpty: skipItemIfEmpty ?? false,
        multipleColumns,
        testPrompt,
        testItemsCount,
        preprocessingFunction,
    };
}

async function fetchDatasetItems(inputDatasetId: string, testPrompt: boolean, testItemsCount: number): Promise<OutputItem[]> {
    try {
        const dataset = await Actor.apifyClient.dataset(inputDatasetId).get();
        if (!dataset) {
            throw new Error(`Dataset with ID ${inputDatasetId} does not exist`);
        }

        const inputDataset = await Actor.openDataset<OutputItem>(inputDatasetId, { forceCloud: true });
        const { items: fetchedItems } = await inputDataset.getData();

        if (testPrompt) {
            const itemCount = Math.min(testItemsCount, fetchedItems.length);
            const items = fetchedItems.slice(0, itemCount);
            log.info(`Test mode enabled - processing ${itemCount} items out of ${fetchedItems.length}`);
            return items;
        }

        log.info(`Fetched ${fetchedItems.length} items from the input dataset.`);
        return fetchedItems;
    } catch (error) {
        if (error instanceof Error) {
            log.error(`Error accessing dataset: ${error.message}`);
        } else {
            log.error('Error accessing dataset: Unknown error occurred');
        }
        throw error;
    }
}

async function processItems(
    items: OutputItem[],
    providers: Record<string, OpenAIProvider | AnthropicProvider | GoogleProvider>,
    config: ValidatedInput,
): Promise<void> {
    const temperatureNum = parseFloat(config.temperature);
    const { preprocessingFunction } = config;

    for (let i = 0; i < items.length; i++) {
        const item = preprocessingFunction(items[i]);

        try {
            if (config.skipItemIfEmpty && hasEmptyFields(config.prompt, item)) {
                log.info(`Skipping item ${i + 1} due to empty fields`);
                continue;
            }

            const finalPrompt = replacePlaceholders(buildFinalPrompt(config.prompt, config.multipleColumns), item);
            log.info(`Processing item ${i + 1}/${items.length}`, { prompt: finalPrompt });

            const provider = getProvider(config.model);
            const llmresponse = await providers[provider].call(
                finalPrompt,
                config.model,
                temperatureNum,
                config.maxTokens,
            );

            log.info(`Item ${i + 1} response:`, { response: llmresponse });

            await handleItemResponse(item, llmresponse, config.multipleColumns, {
                provider,
                model: config.model,
                temperature: temperatureNum,
                maxTokens: config.maxTokens,
                providers,
                finalPrompt,
            });

            await new Promise((resolve) => setTimeout(resolve, REQUEST_INTERVAL_MS));
        } catch (error) {
            if (error instanceof Error) {
                log.error(`Error processing item ${i + 1}: ${error.message}`);
            } else {
                log.error(`Error processing item ${i + 1}: Unknown error occurred`);
            }
            throw error;
        }
    }
}

async function handleItemResponse(
    item: any,
    llmresponse: string,
    multipleColumns: boolean,
    config: {
        provider: string;
        model: string;
        temperature: number;
        maxTokens: number;
        providers: Record<string, OpenAIProvider | AnthropicProvider | GoogleProvider>;
        finalPrompt: string;
    },
): Promise<void> {
    if (multipleColumns) {
        let parsedData: any;
        let attemptsLeft = 2;
        let currentResponse = llmresponse;
        let success = false;

        while (attemptsLeft >= 0) {
            try {
                parsedData = JSON.parse(currentResponse);
                success = true;
                break;
            } catch (err) {
                if (attemptsLeft > 0) {
                    log.warning(`Failed to parse JSON. Retrying...`);
                    const retryPrompt = `${config.finalPrompt}\n\nThe last response was not valid JSON. Please return valid JSON this time.`;
                    currentResponse = await config.providers[config.provider].call(
                        retryPrompt,
                        config.model,
                        config.temperature,
                        config.maxTokens,
                    );
                    attemptsLeft--;
                } else {
                    log.error(`Failed to parse JSON after multiple attempts. Using raw response as single column.`);
                    break;
                }
            }
        }

        if (success && typeof parsedData === 'object' && parsedData !== null) {
            const outputItem: Record<string, unknown> = { ...item };
            for (const key of Object.keys(parsedData)) {
                outputItem[key] = parsedData[key];
            }
            await Actor.pushData(outputItem);
        } else {
            const fallbackItem = { ...item, llmresponse: currentResponse };
            await Actor.pushData(fallbackItem);
        }
    } else {
        item.llmresponse = llmresponse;
        await Actor.pushData(item);
    }
}

function buildFinalPrompt(promptText: string, multipleColumns: boolean): string {
    if (!multipleColumns) {
        return promptText;
    }

    return `${promptText}

Important: Return only a strict JSON object with the requested fields as keys. No extra text or explanations, no markdown, just JSON.`;
}

async function validateJsonFormat(testItem: any, config: {
    providers: Record<string, OpenAIProvider | AnthropicProvider | GoogleProvider>;
    model: string;
    temperature: string;
    maxTokens: number;
    prompt: string;
}): Promise<boolean> {
    const provider = getProvider(config.model);
    let finalPrompt = replacePlaceholders(buildFinalPrompt(config.prompt, true), testItem);

    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            const testResponse = await config.providers[provider].call(
                finalPrompt,
                config.model,
                parseFloat(config.temperature),
                config.maxTokens,
            );

            // First check if we got an empty response
            if (!testResponse) {
                log.error('Empty response received from the API');
                await Actor.fail('Empty response received from the API');
                return false;
            }

            // Try parsing as JSON:
            try {
                JSON.parse(testResponse);
                return true; // JSON parsed successfully
            } catch (jsonError) {
                if (attempt < 3) {
                    log.warning(`JSON validation attempt ${attempt} failed. Retrying...`);
                    log.debug('Response that failed JSON parsing:', { response: testResponse });
                    finalPrompt = `${finalPrompt}\n\nThe last response was not valid JSON. Please return valid JSON this time.`;
                    // Continue to next attempt
                } else {
                    // No attempts left
                    log.error('JSON validation attempts exhausted. The prompt may not produce valid JSON.');
                    log.debug('Final response that failed JSON parsing:', { response: testResponse });
                    return false;
                }
            }
        } catch (apiError: any) {
            // Log the full error for debugging
            log.error('API call failed:', {
                error: apiError.message,
                type: apiError.type,
                code: apiError.code,
                param: apiError.param,
            });

            // Rethrow API errors immediately instead of retrying
            throw apiError;
        }
    }
    return false; // Ensure we always return a boolean
}

async function run(): Promise<void> {
    try {
        const validatedInput = await validateInput();

        // Log configuration details
        const configDetails = {
            datasetId: validatedInput.inputDatasetId,
            model: validatedInput.model,
            promptTemplate: validatedInput.prompt,
            multipleColumns: validatedInput.multipleColumns,
        };
        log.info('Configuration details:', configDetails);

        const items = await fetchDatasetItems(
            validatedInput.inputDatasetId,
            validatedInput.testPrompt,
            validatedInput.testItemsCount,
        );

        const providers = {
            openai: new OpenAIProvider(validatedInput.llmProviderApiKey),
            anthropic: new AnthropicProvider(validatedInput.llmProviderApiKey),
            google: new GoogleProvider(validatedInput.llmProviderApiKey),
        };

        if (items.length > 0 && validatedInput.multipleColumns) {
            const firstItem = validatedInput.preprocessingFunction(items[0]);
            const validationResult = await validateJsonFormat(firstItem, {
                providers,
                model: validatedInput.model,
                temperature: validatedInput.temperature,
                maxTokens: validatedInput.maxTokens,
                prompt: validatedInput.prompt,
            });

            if (!validationResult) {
                throw new Error('Failed to produce valid JSON after multiple attempts. Please adjust your prompt or disable multiple columns.');
            }
        }

        await processItems(items, providers, validatedInput);

        log.info('Actor finished successfully');
        await Actor.exit();
    } catch (error) {
        if (error instanceof Error) {
            log.error('Actor failed:', { error: error.message });
            await Actor.fail(error.message);
        } else {
            log.error('Actor failed with unknown error');
            await Actor.fail('Unknown error occurred');
        }
    }
}

await run();
