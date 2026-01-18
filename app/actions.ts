"use server";

import { z } from "zod";
import { scrapeWebsite } from "@/lib/scraper";
import { detectHallucination, analyzePricingHallucination } from "@/lib/cohere";

const urlSchema = z.string().url().startsWith("http");

const BLOCKED_DOMAINS = [
  "localhost",
  "127.0.0.1",
  "192.168.",
  "10.",
  "172.16.",
];

export async function scanEntity(url: string) {
  const validation = urlSchema.safeParse(url);

  if (!validation.success) {
    return { error: "Invalid URL format. Must start with http:// or https://" };
  }

  const urlObj = new URL(url);
  for (const blocked of BLOCKED_DOMAINS) {
    if (urlObj.hostname.includes(blocked)) {
      return { error: "Cannot scan internal or private network addresses" };
    }
  }

  try {
    // Step 1: Scrape the target website for ground truth
    const scrapedData = await scrapeWebsite(url);

    // Step 2: Query Gemini to see what AI says about this company
    const aiGeneralResponse = await detectHallucination(
      scrapedData.companyName,
      url
    );

    // Step 3: Query about pricing specifically if we found pricing data
    let aiPricingResponse = null;
    if (scrapedData.pricing) {
      aiPricingResponse = await analyzePricingHallucination(
        scrapedData.companyName,
        scrapedData.pricing
      );
    }

    // Step 4: Analyze the responses for hallucinations
    const analysis = analyzeHallucination(
      scrapedData,
      aiGeneralResponse,
      aiPricingResponse
    );

    return {
      companyName: scrapedData.companyName,
      groundTruth: {
        tagline: scrapedData.description,
        pricing: scrapedData.pricing,
        title: scrapedData.title,
      },
      aiResponse: aiGeneralResponse,
      aiPricingResponse: aiPricingResponse,
      status: analysis.status,
      issues: analysis.issues,
      confidence: analysis.confidence,
      scrapedAt: new Date().toISOString(),
    };
  } catch (error) {
    if (error instanceof Error) {
      return { error: error.message };
    }
    return {
      error: "Failed to complete scan. Please check the URL and try again.",
    };
  }
}

interface HallucinationAnalysis {
  status: "ACCURATE" | "UNCERTAIN" | "HALLUCINATING";
  issues: string[];
  confidence: number;
}

function analyzeHallucination(
  scrapedData: any,
  aiResponse: string,
  aiPricingResponse: string | null
): HallucinationAnalysis {
  const issues: string[] = [];
  let confidenceScore = 100;

  const aiLower = aiResponse.toLowerCase();
  const companyNameLower = scrapedData.companyName.toLowerCase();
  const descriptionLower = scrapedData.description.toLowerCase();

  // Check 1: Does AI know the company exists?
  const companyMentioned = aiLower.includes(companyNameLower.split("|")[0].trim().toLowerCase());
  
  if (!companyMentioned) {
    issues.push("AI does not recognize your company name");
    confidenceScore -= 50;
  }

  // Check 2: Does AI mention relevant keywords from description?
  const descriptionKeywords = descriptionLower
    .split(" ")
    .filter((word: string) => word.length > 5)
    .slice(0, 10);

  const matchingKeywords = descriptionKeywords.filter((keyword: string) =>
    aiLower.includes(keyword)
  );

  const keywordMatchRate = matchingKeywords.length / descriptionKeywords.length;

  if (keywordMatchRate < 0.2) {
    issues.push("AI description does not match your website content");
    confidenceScore -= 30;
  }

  // Check 3: Does AI hallucinate uncertainty phrases?
  const uncertaintyPhrases = [
    "i don't have",
    "i cannot",
    "i'm not sure",
    "i don't know",
    "no information",
    "unable to find",
  ];

  const showsUncertainty = uncertaintyPhrases.some((phrase) =>
    aiLower.includes(phrase)
  );

  if (showsUncertainty) {
    issues.push("AI expresses uncertainty about your company");
    confidenceScore -= 20;
  }

  // Check 4: Pricing hallucination detection
  if (scrapedData.pricing && aiPricingResponse) {
    const pricingLower = aiPricingResponse.toLowerCase();
    const actualPrice = scrapedData.pricing.toLowerCase();

    if (!pricingLower.includes(actualPrice.replace(/[^0-9]/g, ""))) {
      issues.push("AI pricing information may be inaccurate");
      confidenceScore -= 25;
    }
  }

  // Determine final status
  let status: "ACCURATE" | "UNCERTAIN" | "HALLUCINATING";

  if (confidenceScore >= 70) {
    status = "ACCURATE";
  } else if (confidenceScore >= 40) {
    status = "UNCERTAIN";
  } else {
    status = "HALLUCINATING";
  }

  return {
    status,
    issues: issues.length > 0 ? issues : ["No significant issues detected"],
    confidence: Math.max(0, confidenceScore),
  };
}