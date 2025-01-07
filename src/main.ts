// main.ts

import { Actor, log } from 'apify';
import { OpenAIProvider, AnthropicProvider, GoogleProvider, getProvider } from './providers/index.js';
import { Input, OutputItem } from './types.js';

// Rate limits for OpenAI API lowest tier
const RATE_LIMIT_PER_MINUTE = 500;
const REQUEST_INTERVAL_MS = Math.ceil(60000 / RATE_LIMIT_PER_MINUTE); // Interval between requests in ms

await Actor.init();

async function run(): Promise<void> {
    try {
        // Get the input
        const input: Input | null = await Actor.getInput();

        if (!input) {
            await Actor.fail('No input provided. Please provide the necessary input parameters.');
            return;
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
            await Actor.fail('No inputDatasetId provided.');
            return;
        }

        // Log configuration details
        const configDetails = {
            datasetId: inputDatasetId,
            model: model,
            promptTemplate: prompt,
            multipleColumns
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
            const fieldMatches = promptStr.match(/\$\{([^}]+)\}/g) || [];
            return fieldMatches.some(match => {
                const field = match.slice(2, -1).trim(); // Remove ${ and }
                const value = getNestedValue(item, field);
                return isEmpty(value);
            });
        }

        // Helper function to replace field placeholders in prompt with actual values
        function replacePlaceholders(promptStr: string, item: OutputItem): string {
            return promptStr.replace(/\$\{([^}]+)\}/g, (_match, fieldName: string) => {
                const value = getNestedValue(item, fieldName.trim());
                return value !== undefined ? String(value) : '';
            });
        }

        // Build the final prompt:
        // If multipleColumns is true, we instruct the LLM to return a strict JSON object.
        function buildFinalPrompt(promptText: string): string {
            if (!multipleColumns) {
                return promptText;
            }

            // Append clear instructions to return JSON only
            return `${promptText}

Important: Return only a strict JSON object with the requested fields as keys. No extra text or explanations, no markdown, just JSON.`;
        }

        // Fetch items from the input dataset
        let items: OutputItem[] = [];
        try {
            // First check if dataset exists
            const dataset = await Actor.apifyClient.dataset(inputDatasetId).get();
            if (!dataset) {
                await Actor.fail(`Dataset with ID ${inputDatasetId} does not exist`);
                return;
            }

            const inputDataset = await Actor.openDataset<OutputItem>(inputDatasetId);
            const { items: fetchedItems } = await inputDataset.getData();
            items = fetchedItems;
            
            // If test mode is enabled, limit the number of items
            if (testPrompt) {
                const itemCount = Math.min(testItemsCount, items.length);
                items = items.slice(0, itemCount);
                log.info(`Test mode enabled - processing ${itemCount} items out of ${fetchedItems.length}`);
            } else {
                log.info(`Fetched ${items.length} items from the input dataset.`);
            }
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
            openai: new OpenAIProvider(llmProviderApiKey),
            anthropic: new AnthropicProvider(llmProviderApiKey),
            google: new GoogleProvider(llmProviderApiKey),
        };

        // Convert temperature from string to number
        const temperatureNum = parseFloat(temperature);

        // If multipleColumns is true, we can do a validation step with a sample item.
        async function validateJsonFormat(testItem: OutputItem): Promise<boolean> {
            if (!multipleColumns) return true; // No need to validate if single column.

            const provider = getProvider(model);
            let finalPrompt = replacePlaceholders(buildFinalPrompt(prompt), testItem);

            for (let attempt = 1; attempt <= 3; attempt++) {
                try {
                    const testResponse = await providers[provider].call(
                        finalPrompt,
                        model,
                        temperatureNum,
                        maxTokens
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
                        param: apiError.param
                    });
                    
                    // Rethrow API errors immediately instead of retrying
                    throw apiError;
                }
            }
            return false; // Ensure we always return a boolean
        }

        if (items.length > 0) {
            const validationResult = await validateJsonFormat(items[0]);
            if (multipleColumns && !validationResult) {
                await Actor.fail('Failed to produce valid JSON after multiple attempts. Please adjust your prompt or disable multiple columns.');
                return;
            }
        }

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
                let finalPrompt = replacePlaceholders(buildFinalPrompt(prompt), item);
                log.info(`Processing item ${i + 1}/${items.length}`, { prompt: finalPrompt });

                // Determine the provider and make the API call
                const provider = getProvider(model); // returns 'openai' | 'anthropic' | 'google'
                let llmresponse = await providers[provider].call(
                    finalPrompt,
                    model,
                    temperatureNum,
                    maxTokens
                );

                log.info(`Item ${i + 1} response:`, { response: llmresponse });

                if (multipleColumns) {
                    let parsedData: any;
                    let attemptsLeft = 2; // After initial call, try parsing or retrying up to 2 times more if needed
                    let currentResponse = llmresponse;
                    let success = false;

                    while (attemptsLeft >= 0) {
                        try {
                            parsedData = JSON.parse(currentResponse);
                            success = true;
                            break;
                        } catch (err) {
                            if (attemptsLeft > 0) {
                                // Retry by asking again for correct JSON
                                log.warning(`Failed to parse JSON for item ${i + 1}. Retrying...`);
                                const retryPrompt = `${finalPrompt}\n\nThe last response was not valid JSON. Please return valid JSON this time.`;
                                const retryResponse = await providers[provider].call(
                                    retryPrompt,
                                    model,
                                    temperatureNum,
                                    maxTokens
                                );
                                currentResponse = retryResponse;
                                attemptsLeft--;
                            } else {
                                // No attempts left
                                log.error(`Failed to parse JSON after multiple attempts for item ${i + 1}. Using raw response as single column.`);
                                break;
                            }
                        }
                    }

                    if (success && typeof parsedData === 'object' && parsedData !== null) {
                        // Push multiple columns
                        const outputItem: Record<string, unknown> = { ...item };
                        for (const key of Object.keys(parsedData)) {
                            outputItem[key] = parsedData[key];
                        }
                        await Actor.pushData(outputItem);
                    } else {
                        // Fallback to single column mode if JSON parsing failed
                        const fallbackItem = { ...item, llmresponse: currentResponse };
                        await Actor.pushData(fallbackItem);
                    }
                } else {
                    // Single column mode: Just push the response
                    item.llmresponse = llmresponse;
                    await Actor.pushData(item);
                }

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
    } catch (error) {
        console.error(error);
        await Actor.fail((error as Error).message);
        return;
    }
}

await run();
