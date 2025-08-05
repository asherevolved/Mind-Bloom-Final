import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Read a list
export const list = query({
  args: { table: v.string(), limit: v.optional(v.number()) },
  handler: async ({ db }, { table, limit }) => {
    const q = db.query(table).order("desc");
    return limit ? await q.take(limit) : await q.collect();
  },
});

// Read a list for a specific user
export const listByUser = query({
    args: { table: v.string(), userId: v.string() },
    handler: async ({ db }, { table, userId }) => {
        return await db
            .query(table as any)
            .withIndex("by_userId", (q) => q.eq("userId", userId))
            .collect();
    },
});


// Read by id
export const get = query({
  args: { table: v.string(), id: v.string() }, 
  handler: async ({ db }, { table, id }) => {
    // If no schema, use generic lookups by table + filtering:
    return await db.query(table).filter((q) => q.eq(q.field("_id"), id)).first();
  },
});

// Insert
export const insert = mutation({
  args: { table: v.string(), data: v.any() },
  handler: async ({ db }, { table, data }) => {
    return await db.insert(table as any, { ...data, createdAt: Date.now() });
  },
});

// Update
export const update = mutation({
  args: { table: v.string(), id: v.string(), patch: v.any() },
  handler: async ({ db }, { table, id, patch }) => {
    const doc = await db.query(table as any).filter((q) => q.eq(q.field("_id"), id)).first();
    if (!doc) return null;
    await db.patch(doc._id, patch);
    return true;
  },
});

// Delete
export const remove = mutation({
  args: { table: v.string(), id: v.string() },
  handler: async ({ db }, { table, id }) => {
    const doc = await db.query(table as any).filter((q) => q.eq(q.field("_id"), id)).first();
    if (!doc) return null;
    await db.delete(doc._id);
    return true;
  },
});
