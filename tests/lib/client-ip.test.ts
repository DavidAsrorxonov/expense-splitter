import { describe, expect, it } from "vitest";
import { getClientIp } from "@/lib/client-ip";

describe("client IP at the Railway ingress boundary", () => {
  it.each([
    ["192.0.2.1", "192.0.2.1"],
    [" 192.0.2.1 ", "192.0.2.1"],
    ["::1", "::1"],
    ["2001:0DB8:0000:0000:0000:0000:0000:0001", "2001:db8::1"],
    ["2001:db8::1", "2001:db8::1"],
    ["::ffff:192.0.2.1", "::ffff:c000:201"],
  ])("accepts and normalizes %s", (input, expected) => {
    expect(getClientIp(new Headers({ "X-Real-IP": input }))).toBe(expected);
  });

  it.each([
    null, "", "   ", "unknown", "localhost", "999.1.2.3", "192.168.001.1",
    "192.0.2.1:3000", "[2001:db8::1]", "[2001:db8::1]:443",
    "192.0.2.1, 198.51.100.1", "2001:db8::1, 2001:db8::2",
    "fe80::1%eth0", "fe80::1%1", ":::", "x".repeat(46),
  ])("uses the unknown bucket for %s", (input) => {
    // A reader also lets us exercise raw whitespace without Headers trimming it.
    expect(getClientIp({ get: () => input })).toBe("unknown");
  });

  it("ignores spoofed forwarding headers", () => {
    const headers = new Headers({
      "x-real-ip": "192.0.2.1",
      "x-forwarded-for": "198.51.100.1, 203.0.113.1",
      forwarded: "for=198.51.100.1",
    });
    expect(getClientIp(headers)).toBe("192.0.2.1");
    headers.delete("x-real-ip");
    expect(getClientIp(headers)).toBe("unknown");
    headers.set("x-real-ip", "invalid");
    expect(getClientIp(headers)).toBe("unknown");
  });

  it("rejects duplicate X-Real-IP headers combined into a list", () => {
    const headers = new Headers({ "x-real-ip": "192.0.2.1" });
    headers.append("x-real-ip", "198.51.100.1");
    expect(getClientIp(headers)).toBe("unknown");
  });
});
