import { ConvexReactClient } from "convex/react";

const url =
  process?.env?.NEXT_PUBLIC_CONVEX_URL ??
  "https://third-seal-891.convex.cloud";

export const convex = new ConvexReactClient(url);
