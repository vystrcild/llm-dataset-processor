## TypeScript Crawlee & CheerioCrawler template

A template example built with [Crawlee](https://crawlee.dev/) to scrape data from a website using [Cheerio](https://cheerio.js.org/) wrapped into [CheerioCrawler](https://crawlee.dev/api/cheerio-crawler/class/CheerioCrawler).

## Included features

- **[Apify SDK](https://docs.apify.com/sdk/js)** - toolkit for building [Actors](https://apify.com/actors)
- **[Crawlee](https://crawlee.dev/)** - web scraping and browser automation library
- **[Input schema](https://docs.apify.com/platform/actors/development/input-schema)** - define and easily validate a schema for your Actor's input
- **[Dataset](https://docs.apify.com/sdk/python/docs/concepts/storages#working-with-datasets)** - store structured data where each object stored has the same attributes
- **[Cheerio](https://cheerio.js.org/)** - a fast, flexible & elegant library for parsing and manipulating HTML and XML

## How it works

This code is a TypeScript script that uses [Crawlee CheerioCrawler](https://crawlee.dev/api/cheerio-crawler/class/CheerioCrawler) framework to crawl a website and extract the data from the crawled URLs with Cheerio. It then stores the website titles in a dataset.

- The crawler starts with URLs provided from the input `startUrls` field defined by the input schema. Number of scraped pages is limited by `maxPagesPerCrawl` field from input schema.
- The crawler uses `requestHandler` for each URL to extract the data from the page with the Cheerio library and to save the title and URL of each page to the dataset. It also logs out each result that is being saved.

## Resources

- [Video tutorial](https://www.youtube.com/watch?v=yTRHomGg9uQ) on building a scraper using CheerioCrawler
- [Written tutorial](https://docs.apify.com/academy/web-scraping-for-beginners/challenge) on building a scraper using CheerioCrawler
- [Web scraping with Cheerio in 2023](https://blog.apify.com/web-scraping-with-cheerio/)
- How to [scrape a dynamic page](https://blog.apify.com/what-is-a-dynamic-page/) using Cheerio
- [TypeScript vs. JavaScript: which to use for web scraping?](https://blog.apify.com/typescript-vs-javascript-crawler/)
- [Integration with Zapier](https://apify.com/integrations), Make, Google Drive and others
- [Video guide on getting scraped data using Apify API](https://www.youtube.com/watch?v=ViYYDHSBAKM)
- A short guide on how to build web scrapers using code templates:

[web scraper template](https://www.youtube.com/watch?v=u-i-Korzf8w)


## Getting started

For complete information [see this article](https://docs.apify.com/platform/actors/development#build-actor-locally). To run the actor use the following command:

```bash
apify run
```

## Deploy to Apify

### Connect Git repository to Apify

If you've created a Git repository for the project, you can easily connect to Apify:

1. Go to [Actor creation page](https://console.apify.com/actors/new)
2. Click on **Link Git Repository** button

### Push project on your local machine to Apify

You can also deploy the project on your local machine to Apify without the need for the Git repository.

1. Log in to Apify. You will need to provide your [Apify API Token](https://console.apify.com/account/integrations) to complete this action.

    ```bash
    apify login
    ```

2. Deploy your Actor. This command will deploy and build the Actor on the Apify Platform. You can find your newly created Actor under [Actors -> My Actors](https://console.apify.com/actors?tab=my).

    ```bash
    apify push
    ```

## Documentation reference

To learn more about Apify and Actors, take a look at the following resources:

- [Apify SDK for JavaScript documentation](https://docs.apify.com/sdk/js)
- [Apify SDK for Python documentation](https://docs.apify.com/sdk/python)
- [Apify Platform documentation](https://docs.apify.com/platform)
- [Join our developer community on Discord](https://discord.com/invite/jyEM2PRvMU)
