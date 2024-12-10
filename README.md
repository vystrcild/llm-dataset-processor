LLM Dataset Processor is an [Apify Actor](https://docs.apify.com/platform/actors) that allows you to process **whole dataset with single LLM prompt**. It's useful if you need to enrich data, summarize content, extract specific information, or manipulate data in a structured way using AI.

Just choose specific dataset to process, select LLM, provide API token and craft your prompt template. You could output responses as single column or JSON-structured multi-column format.

Actor supports **models from multiple LLM providers** such as OpenAI, Anthropic, and Google. Currently available models are:
- GPT-4o-mini
- GPT-4o
- Claude 3.5 Haiku
- Claude 3.5 Sonnet
- Claude 3 Opus
- Gemini 1.5 Flash
- Gemini 1.5 Flash-8B
- Gemini 1.5 Pro

## Main features
- 📊 Process entire datasets with **customizable prompt with {{placeholders}}**
- 🎯 **Multiple output formats** (single column or JSON-structured multi-column)
- 🔌 Standalone Actor or as a **Actor-to-Actor integration**
- 🤖 Support for **multiple LLM providers** (OpenAI, Anthropic, Google)
- ⚡ Built-in rate limiting and error handling
- 🔄 Automatic retries for failed requests
- ✅ JSON validation for structured outputs


## Placeholders
You can specify columns of input dataset in your prompt. For example, if you have a dataset with columns `title` and `content`, you can use placeholders like `{{title}}` and `{{content}}` to access their values in the prompt.

Nested fields are also supported, e.g., `{{metadata.title}}` to access the title field within the `metadata` object.

You could use multiple placeholders in a single prompt.

## Single column output
New dataset is created and output is stored in a single column named `llmresponse`.

### Sentiment Analysis
```
Decide if this Instagram post is positive or negative:
{{content.text}}

Don't explaing anything, just return words "positive" or "negative".
```

### Summarization
```
Summarize provided text. Include also url, title and keywords at the end.

Text: {{text}} 
URL: {{url}}
Title: {{metadata.title}}
Keywords: {{metadata.keywords}}
```

### Translation
```
Translate this text to English:
{{text}}
```

## Using multi-column output
New dataset is created and output is stored in multiple columns. To use this feature, make sure your prompt contains the names and descriptions of the desired columns in output. 

Note that column structure and names are created by LLM based on input prompt. We highly recommend to test your prompt first by enabling `Test Prompt Mode`. In case that output structure does not match your expectations, please adjust your prompt and be more specific (using JSON structure or better description of columns).

Column structure is created with the first call and then it's validated for each item. If validation fails 3 times, the item in dataset is skipped. If validation fails frequently, please adjust your prompt and be more specific (using JSON structure or better description of columns).

### Extract contact information
```
Extract contact information from provided text.

Data should be parsed in this specific format:
- name
- email: If any otherwise put "null"
- phone: If any otherwise put "null"
- country_code: International country code
- address: Full address

Don't explaing anything, just return valid JSON for specified fields. 

Here's input text: {{text}}
```

### Extract key points from article
```
Read provided text and create these:
- summary: simple summary of the content in few sentences
- key_points: key thoughts and points
- conclusion: conclusion and action steps

{{text}}
```

## Skip items if one or more {{field}} are empty
In case that one or more fields are empty, prompt is still sent to LLM and could generate unintended response. To prevent this, you can enable this option.

## Which model to choose & Pricing
For cost-effective processing, we recommend to use `GPT-4o-mini` and `Claude 3.5 Haiku`. For higher quality results, we recommend to use `GPT-4o` and `Claude 3.5 Sonnet`.

Be aware that costs could grow very quickly with larger datasets. We recommend to test your prompt first by enabling `Test Prompt Mode`.

Be sure that you've got sufficient credits in you LLM provider account.


## Limitations
- API rate limits is set to 500 requests per minute.
- Maximum token limits vary by model. Please check your LLM provider documentation for details.
- JSON validation for multiple columns may require prompt adjustments.


