import * as cheerio from "cheerio";

interface ScrapedData {
  companyName: string;
  description: string;
  title: string;
  pricing: string | null;
  ogData: {
    title?: string;
    description?: string;
    siteName?: string;
  };
}

export async function scrapeWebsite(url: string): Promise<ScrapedData> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 7000); // 7 second timeout

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "EntityScanner/1.0 (Hallucination Detection Bot)",
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: Failed to fetch website`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Extract Open Graph metadata (most reliable source)
    const ogTitle = $('meta[property="og:title"]').attr("content");
    const ogDescription = $('meta[property="og:description"]').attr("content");
    const ogSiteName = $('meta[property="og:site_name"]').attr("content");

    // Extract standard meta tags
    const metaDescription = $('meta[name="description"]').attr("content");
    const pageTitle = $("title").text();

    // Extract company name with fallback logic
    const companyName =
      ogSiteName ||
      ogTitle ||
      pageTitle.split("|")[0].trim() ||
      pageTitle.split("-")[0].trim() ||
      "Unknown Company";

    // Extract description with fallback logic
    const description =
      ogDescription ||
      metaDescription ||
      $('meta[name="twitter:description"]').attr("content") ||
      "No description found";

    // Attempt to detect pricing signals
    const bodyText = $("body").text().toLowerCase();
    let pricing: string | null = null;

    const pricingKeywords = [
      /\$\d+\/mo/,
      /\$\d+\s*per\s*month/,
      /\$\d+\s*monthly/,
      /starting at \$\d+/,
      /from \$\d+/,
    ];

    for (const pattern of pricingKeywords) {
      const match = bodyText.match(pattern);
      if (match) {
        pricing = match[0];
        break;
      }
    }

    return {
      companyName: companyName.substring(0, 100), // Limit length
      description: description.substring(0, 300),
      title: pageTitle.substring(0, 100),
      pricing,
      ogData: {
        title: ogTitle,
        description: ogDescription,
        siteName: ogSiteName,
      },
    };
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error) {
      if (error.name === "AbortError") {
        throw new Error("Website took too long to respond (timeout after 7s)");
      }
      throw new Error(`Scraping failed: ${error.message}`);
    }

    throw new Error("Unknown scraping error occurred");
  }
}