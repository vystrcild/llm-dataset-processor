## 💡 What is LLM Dataset Processor?
LLM Dataset Processor is an [Apify Actor](https://docs.apify.com/platform/actors) that allows you to process a **output of other Actors or stored dataset with a single LLM prompt**. It's useful when you need to enrich data, summarize content, extract specific information, or manipulate data in a structured way using AI.

Choose a specific dataset to process, select an LLM, provide an API token, and craft your prompt template. You can output responses as a single column or in a JSON-structured multi-column format.

## 🔧 Main features
- 📊 Process entire datasets with **customizable prompt with ${placeholders}**
- 🎯 **Multiple output formats** (single column or JSON-structured multi-column)
- 🔌 Standalone Actor or as a **Actor-to-Actor integration**
- 🤖 Support for **multiple LLM providers** (OpenAI, Anthropic, Google)
- ⚡ Built-in rate limiting and error handling
- 🔄 Automatic retries for failed requests
- ✅ JSON validation for structured outputs

## ⚙️ Models
The Actor supports **models from multiple LLM providers** such as OpenAI, Anthropic, and Google. Currently available models are:
- GPT-4o-mini
- GPT-4o
- Claude 3.5 Haiku
- Claude 3.5 Sonnet
- Claude 3 Opus
- Gemini 1.5 Flash
- Gemini 1.5 Flash-8B
- Gemini 1.5 Pro

## 📝 Placeholders
You can specify columns of the input dataset in your prompt. For example, if you have a dataset with columns `title` and `content`, you can use placeholders like ${title} and ${content} to access their values in the prompt.

Nested fields are also supported, e.g., ${metadata.title} to access the title field within the `metadata` object.

You can use multiple placeholders in a single prompt.

Placeholders are replaced with exact values from the input dataset for each item, so be careful when crafting your prompt.

✅ **Good practice:**
```
Evaluate this post and label it as "positive", "negative" or "neutral". Don't explain anything and don't add any unnecessary text, generate only the label. 
Here's the post: ${text}
```
will resolve to:
```
Evaluate this post and label it as "positive", "negative" or "neutral". Don't explain anything and don't add any unnecessary text, generate only the label. 
Here's the post: Congratulations to your victory!!! 🥳
```

❌ **Bad practice:**
```
Take a look at all the values of the ${text} field in the dataset and do a sentiment analysis - write  \"positive\" \"negative\" or \"neutral\"
```
will resolve to:
```
Take a look at all the values of the Congratulations to your victory!!! 🥳 field in the dataset and do a sentiment analysis - write  "positive" "negative" or "neutral"
```

## 📊 Single column output
A new dataset is created and the output is stored in a single column named `llmresponse`.

Example of *input* dataset:

| crawl    | markdown                              | metadata |
| -------- | ------------------------------------- | -------- |
| 5 fields | Congratulations to your victory!!! 🥳 | 4 fields |

Example of *output* dataset:

| crawl    | markdown                              | metadata | llmresponse |
| -------- | ------------------------------------- | -------- | ----------- |
| 5 fields | Congratulations to your victory!!! 🥳 | 4 fields | positive    |


### 😊 Sentiment Analysis
Input prompt:
```
Decide if this Instagram post is positive or negative:
${content.text}

Don't explain anything, just return words "positive" or "negative".
```

### 📝 Summarization
Input prompt:
```
Summarize provided text and also include url, title and keywords at the end.

Text: ${text} 
URL: ${url}
Title: ${metadata.title}
Keywords: ${metadata.keywords}
```

### 🌐 Translation
Input prompt:
```
Translate this text to English:
${text}
```

## 📊 Using multi-column output
A new dataset is created and the output is stored in multiple columns. To use this feature, make sure your prompt contains the names and descriptions of the desired output columns.

Example of *input* dataset:

| crawl    | text                                                               | metadata |
| -------- | ------------------------------------------------------------------ | -------- |
| 5 fields | Contact Us We'd love to hear from you to see how Apify can help... | 4 fields |

Example of *output* dataset:

| crawl    | text                                                             | metadata | phone           | country_code | address                                                                                                  |
| -------- | ---------------------------------------------------------------- | -------- | --------------- | ------------ | -------------------------------------------------------------------------------------------------------- |
| 5 fields | Contact Us We'd love to hear from you to see how Apify can help... | 4 fields | No phone found. | CZE          | Apify Technologies s.r.o.  <br>**Lucerna Palace**  <br>Vodickova 704/36, 110 00 Prague 1, Czech Republic |


Note that the column structure and names are created by the LLM based on the input prompt. We highly recommend testing your prompt first by enabling `Test Prompt Mode`. If the output structure does not match your expectations, prompt should be adjusted to be more specific (using JSON structure or better column descriptions).

The column structure is created with the first call and then validated for each item. If validation fails three times, the item in the dataset is skipped. If this leads to a large number of skipped items, please adjust your prompt to be more specific.

### 📇 Extract contact information
Input prompt:
```
Extract contact information from provided text.

Data should be parsed in this specific format:
- name
- email: If any otherwise put "null"
- phone: If any otherwise put "null"
- country_code: International country code
- address: Full address

Don't explain anything, just return valid JSON for specified fields. 

Here's input text: ${text}
```

### 📝 Extract key points from article
Input prompt:
```
Read provided text and create these:
- summary: simple summary of the content in few sentences
- key_points: key thoughts and points
- conclusion: conclusion and action steps

${text}
```

## 🚫 Skip items if one or more ${fields} are empty
If one or more fields are empty, the prompt is still sent to the LLM and could generate an unintended response. To prevent this, you should keep this option enabled.

## 🤔 Which model to choose?
For cost-effective processing, we recommend using `GPT-4o-mini` and `Claude 3.5 Haiku`. For higher quality results, we recommend using `GPT-4o` and `Claude 3.5 Sonnet`.

Be aware that LLM costs can grow very quickly with larger datasets. We recommend testing your prompt first by enabling `Test Prompt Mode`.

Example of processing and creating summaries of 100 blog articles with Claude 3.5. Sonnet:

- 1.555.827 input tokens: $4.67
- 1.44.926 output tokens: $0.67
- Apify Usage: $0.434
**Total Costs**: $5.77

Make sure you have sufficient credits in your LLM provider account.


## 🤝 Actor-to-Actor integration
You can use LLM Dataset Processor as an Actor-to-Actor integration. This allows you to process a datasets from other Actors.

Create task in **Saved tasks** and choose LLM Dataset Processor as Integration. In configuration, keep the **Input dataset ID** empty since it will be provided by the previous Actor.

## ❗️ Limitations
- The API rate limit is set to 500 requests per minute.
- Maximum token limits vary by model. Please check your LLM provider's documentation for details.
- JSON validation for multiple columns may require prompt adjustments.
