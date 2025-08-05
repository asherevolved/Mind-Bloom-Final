'use client';

import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

export default function ConvexTest() {
  const list = useQuery(api.crud.list, { table: "messages", limit: 10 }) ?? [];
  const insert = useMutation(api.crud.insert);
  return (
    <div className="p-4 space-y-2">
      <button
        onClick={() => insert({ table: "messages", data: { text: "Hello Convex!" } })}
        className="px-3 py-2 border rounded"
      >
        Add message
      </button>
      <ul>{list.map((m: any) => <li key={m._id}>{m.text}</li>)}</ul>
    </div>
  );
}
