import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Group pages must be crawlable for their noindex header to be read.
      disallow: "/api/",
    },
  };
}
