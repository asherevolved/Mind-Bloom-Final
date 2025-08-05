import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Insert text + embedding
export const addDoc = mutation({
  args: { text: v.string(), meta: v.optional(v.any()) },
  handler: async ({ db }) => {
    // Pseudocode: if you set OPENAI_API_KEY in Convex env, you can generate embeddings here
    // const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
    // const emb = await openai.embeddings.create({ model: "text-embedding-3-small", input: text });
    // await db.insert("docs", { text, embedding: emb.data[0].embedding, meta, createdAt: Date.now() });
    return true;
  },
});

// Vector search (works once embeddings are stored)
export const search = query({
  args: { vector: v.array(v.number()), limit: v.optional(v.number()) },
  handler: async ({ db }, { vector, limit = 5 }) => {
    // return await db.vectorSearch("docs", "embedding", { vector, limit });
    return [];
  },
});
