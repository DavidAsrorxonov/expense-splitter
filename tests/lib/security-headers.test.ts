import { describe, expect, it } from "vitest";
import { unstable_getResponseFromNextConfig } from "next/experimental/testing/server";
import nextConfig from "../../next.config";
import robots from "@/app/robots";

describe("security headers", () => {
  it.each([
    { pathname: "/", group: false },
    { pathname: "/api/health", group: false },
    { pathname: "/g/abcdefghijkl", group: true },
    { pathname: "/g/abcdefghijkl/export?archived=1", group: true },
  ])("applies the correct headers to $pathname", async ({ pathname, group }) => {
    const response = await unstable_getResponseFromNextConfig({
      url: `https://example.test${pathname}`,
      nextConfig,
    });
    const headers = response.headers;
    expect(headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(headers.get("X-Frame-Options")).toBe("DENY");
    expect(headers.get("Permissions-Policy")).toBe("camera=(), microphone=(), geolocation=()");
    expect(headers.get("Strict-Transport-Security")).toBe("max-age=31536000");
    expect(headers.get("Referrer-Policy")).toBe(group ? "no-referrer" : "strict-origin-when-cross-origin");
    expect(headers.get("X-Robots-Tag")).toBe(group ? "noindex, nofollow, noarchive" : null);
    expect(headers.has("Content-Security-Policy")).toBe(false);
  });
});

describe("robots policy", () => {
  it("allows crawlers to read group noindex headers while disallowing API crawling", () => {
    expect(robots()).toEqual({
      rules: { userAgent: "*", allow: "/", disallow: "/api/" },
    });
  });
});
