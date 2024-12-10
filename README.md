## Description

Process your datasets with Large Language Models including GPT-4o, Claude, and Gemini. This Actor allows you to send dataset items through various LLM providers and collect the responses in a structured format.

Useful for enriching your datasets with LLM-generated content, summarization, translation, sentiment analysis, and more.

## Features

- 🤖 Support for multiple LLM providers (OpenAI, Anthropic, Google)
- 📊 Process entire datasets with customizable prompts
- 🎯 Multiple output formats (single column or JSON-structured multi-column)
- ⚡ Built-in rate limiting and error handling
- 🔄 Automatic retries for failed requests
- ✅ JSON validation for structured outputs



## Usage

1. **Prepare Your Dataset**
   - Ensure your input dataset is available on the Apify platform
   - Note down the Dataset ID

2. **Configure the Actor**
   - Set the required input parameters
   - Choose your preferred LLM provider and model
   - Configure the prompt template using placeholders (e.g., {{field_name}})

3. **Run the Actor**
   - The Actor will process each item in your dataset
   - Results will be saved to a new dataset

### Prompt Template Examples

Single column output:

```
Analyze the sentiment of the following text: {{text}}
```

Multiple column output (with multipleColumns enabled):

```
Analyze the following product review and return a JSON object with these fields:

sentiment: (positive/negative/neutral)
rating: (1-5)
key_points: (array of main points)
Review: {{review_text}}
```

## Output
The Actor creates a new dataset with the processed results. If `multipleColumns` is disabled, responses are stored in a single column. If enabled, responses are parsed as JSON and stored in multiple columns.

## Limitations
- API rate limits apply based on your LLM provider's restrictions
- Maximum token limits vary by model
- JSON validation for multiple columns may require prompt adjustments

## Cost Considerations
Costs vary depending on the chosen LLM provider and model:
- GPT-4o-mini and Claude 3.5 Haiku are recommended for cost-effective processing
- GPT-4o and Claude 3 Opus offer higher quality at increased cost
- Token usage is monitored and logged during processing

## Tips for Best Results
- Start with a small test dataset using testPrompt: true
- Adjust temperature based on needed response consistency
- Use structured prompts with clear instructions
- Monitor token usage to optimize costs
- Consider using cheaper models for initial testing