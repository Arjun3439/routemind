import axios from "axios";
import { supabase } from "./supabase.client";

// HF Inference API — all-mpnet-base-v2 produces 768-dim vectors (same as Gemini text-embedding-004)
const HF_API_KEY = process.env.EXPO_PUBLIC_HF_API_KEY || "";
const HF_EMBED_URL =
  "https://api-inference.huggingface.co/models/sentence-transformers/all-mpnet-base-v2";

// In-memory cache to avoid duplicate API calls for identical text
const embeddingCache = new Map<string, number[]>();

export const embeddingService = {
  /**
   * Generates a 768-dimensional embedding using Hugging Face
   * sentence-transformers/all-mpnet-base-v2 (schema-compatible with Gemini text-embedding-004)
   */
  async generateEmbedding(text: string): Promise<number[]> {
    if (!text || !text.trim()) {
      throw new Error("Cannot generate embedding for empty text");
    }

    const cleanText = text.trim();

    // Check cache first
    if (embeddingCache.has(cleanText)) {
      return embeddingCache.get(cleanText)!;
    }

    try {
      const response = await axios.post(
        HF_EMBED_URL,
        { inputs: cleanText },
        {
          headers: {
            "Content-Type": "application/json",
            // API key is optional — anonymous access is rate-limited but works
            ...(HF_API_KEY ? { Authorization: `Bearer ${HF_API_KEY}` } : {}),
          },
          // HF cold-starts can take up to 20s on free tier
          timeout: 30000,
        }
      );

      // HF returns [[...768 values...]] for a single-input batch
      const raw = response.data;
      const embedding: number[] = Array.isArray(raw[0]) ? raw[0] : raw;

      if (!embedding || !Array.isArray(embedding)) {
        throw new Error("Invalid response from Hugging Face embedding API");
      }

      // Cache the result
      embeddingCache.set(cleanText, embedding);

      return embedding;
    } catch (error: any) {
      console.error("Error generating embedding:", error?.response?.data || error?.message);
      throw error;
    }
  },

  /**
   * Generates and stores the embedding for a single review in Supabase
   */
  async embedReview(reviewId: string): Promise<void> {
    // 1. Fetch review text
    const { data: review, error: fetchError } = await supabase
      .from("community_reviews")
      .select("review_text")
      .eq("id", reviewId)
      .single();

    if (fetchError || !review) {
      console.error("Failed to fetch review for embedding:", fetchError);
      return;
    }

    // 2. Generate embedding
    try {
      const embedding = await this.generateEmbedding(review.review_text);

      // 3. Store embedding in Supabase using string representation format for pgvector '[1,2,...]'
      const embeddingString = `[${embedding.join(",")}]`;
      
      const { error: updateError } = await supabase
        .from("community_reviews")
        .update({ embedding: embeddingString })
        .eq("id", reviewId);

      if (updateError) {
        console.error("Failed to store embedding for review:", updateError);
      }
    } catch (error) {
      console.error("Failed to embed review:", error);
    }
  },

  /**
   * Batch processes reviews that are missing embeddings.
   * Returns the number of reviews successfully embedded.
   */
  async embedAllUnembeddedReviews(limit = 50): Promise<number> {
    // Fetch reviews without embeddings
    const { data: reviews, error } = await supabase
      .from("community_reviews")
      .select("id, review_text")
      .is("embedding", null)
      .limit(limit);

    if (error || !reviews || reviews.length === 0) {
      return 0;
    }

    let successCount = 0;
    
    // Process sequentially to respect rate limits
    for (const review of reviews) {
      try {
        const embedding = await this.generateEmbedding(review.review_text);
        const embeddingString = `[${embedding.join(",")}]`;

        const { error: updateError } = await supabase
          .from("community_reviews")
          .update({ embedding: embeddingString })
          .eq("id", review.id);

        if (!updateError) {
          successCount++;
        }
        
        // Small delay to avoid API limits
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (err) {
        console.warn(`Failed to process unembedded review ${review.id}`);
      }
    }

    return successCount;
  },
};
