import { CohereClient } from "cohere-ai";

if (!process.env.COHERE_API_KEY) {
  throw new Error("COHERE_API_KEY environment variable is not configured");
}

const cohere = new CohereClient({
  token: process.env.COHERE_API_KEY,
});

export interface QueryResult {
  response: string;
  tokensUsed?: number;
}

export async function queryCohere(prompt: string): Promise<QueryResult> {
  try {
    const response = await cohere.chat({
      model: "command-a-03-2025",
      message: prompt,
      temperature: 0.3,
      maxTokens: 1024,
    });

    return {
      response: response.text,
      tokensUsed: response.meta?.tokens?.outputTokens,
    };
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("rate limit") || error.message.includes("429")) {
        throw new Error("API rate limit exceeded. Please try again in a few minutes.");
      }

      if (error.message.includes("invalid") || error.message.includes("401")) {
        throw new Error("API authentication failed. Please check configuration.");
      }

      throw new Error(`AI query failed: ${error.message}`);
    }

    throw new Error("Unknown error occurred while querying AI model");
  }
}

export async function detectHallucination(
  companyName: string,
  websiteUrl: string
): Promise<string> {
  const prompt = `You are a helpful assistant answering a user's question about a company. Answer naturally as if you're having a conversation with someone who is researching this company.

User question: "Tell me about ${companyName}. What do they do, and what are their main products or services?"

Please provide a brief, factual response based on what you know. If you're not certain about specific details, say so. Keep your response under 100 words.`;

  const result = await queryCohere(prompt);
  return result.response;
}

export async function analyzePricingHallucination(
  companyName: string,
  actualPricing: string | null
): Promise<string> {
  const prompt = actualPricing
    ? `User question: "What is the pricing for ${companyName}?"

Please provide pricing information if you know it. If you're not certain, say so. Keep your response brief and factual.`
    : `User question: "Does ${companyName} have public pricing information available?"

Answer briefly based on what you know.`;

  const result = await queryCohere(prompt);
  return result.response;
}