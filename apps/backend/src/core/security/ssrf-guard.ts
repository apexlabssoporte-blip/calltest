import { URL } from "url";
import net from "net";

export class SsrfGuard {
  private static readonly BLOCKED_HOSTS = new Set([
    "localhost",
    "127.0.0.1",
    "0.0.0.0",
    "::1",
    "metadata.google.internal",
    "169.254.169.254",
  ]);

  /**
   * Validates that a target URL is safe to request from the backend and not pointing to internal/private infrastructure.
   */
  public static isSafeUrl(
    rawUrl: string,
    allowedHosts?: string[],
  ): { isSafe: boolean; reason?: string; parsedUrl?: URL } {
    try {
      const parsed = new URL(rawUrl);

      // 1. Protocol Check (HTTPS preferred, HTTP allowed only if specified)
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
        return { isSafe: false, reason: "INVALID_PROTOCOL" };
      }

      const rawHostname = parsed.hostname.toLowerCase();
      const hostname = rawHostname.replace(/^\[|\]$/g, "");

      // 2. Blocked specific hosts / metadata endpoints
      if (
        this.BLOCKED_HOSTS.has(hostname) ||
        this.BLOCKED_HOSTS.has(rawHostname) ||
        hostname.endsWith(".local") ||
        hostname.endsWith(".internal")
      ) {
        return { isSafe: false, reason: "BLOCKED_INTERNAL_HOST" };
      }

      // 3. Private IP Range Check (IPv4 and IPv6)
      if (net.isIP(hostname)) {
        if (this.isPrivateIp(hostname)) {
          return { isSafe: false, reason: "BLOCKED_PRIVATE_IP" };
        }
      }

      // 4. Hostname Allowlists if enforced
      if (allowedHosts && allowedHosts.length > 0) {
        const matchesAllowed = allowedHosts.some(
          (allowed) => hostname === allowed || hostname.endsWith(`.${allowed}`),
        );
        if (!matchesAllowed) {
          return { isSafe: false, reason: "HOST_NOT_ALLOWED" };
        }
      }

      return { isSafe: true, parsedUrl: parsed };
    } catch {
      return { isSafe: false, reason: "MALFORMED_URL" };
    }
  }

  private static isPrivateIp(ip: string): boolean {
    // IPv4 Checks
    if (net.isIPv4(ip)) {
      const parts = ip.split(".").map((n) => parseInt(n, 10));
      if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
        return true;
      }
      // 0.0.0.0/8
      if (parts[0] === 0) return true;
      // 10.0.0.0/8
      if (parts[0] === 10) return true;
      // 100.64.0.0/10 (Carrier-grade NAT)
      if (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) return true;
      // 127.0.0.0/8 (Loopback)
      if (parts[0] === 127) return true;
      // 169.254.0.0/16 (Link-local / Cloud metadata)
      if (parts[0] === 169 && parts[1] === 254) return true;
      // 172.16.0.0/12
      if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
      // 192.0.0.0/24 (IETF Protocol Assignments)
      if (parts[0] === 192 && parts[1] === 0 && parts[2] === 0) return true;
      // 192.0.2.0/24 (TEST-NET-1)
      if (parts[0] === 192 && parts[1] === 0 && parts[2] === 2) return true;
      // 192.168.0.0/16
      if (parts[0] === 192 && parts[1] === 168) return true;
      // 198.18.0.0/15 (Benchmark testing)
      if (parts[0] === 198 && (parts[1] === 18 || parts[1] === 19)) return true;
      // 198.51.100.0/24 (TEST-NET-2)
      if (parts[0] === 198 && parts[1] === 51 && parts[2] === 100) return true;
      // 203.0.113.0/24 (TEST-NET-3)
      if (parts[0] === 203 && parts[1] === 0 && parts[2] === 113) return true;
      // 224.0.0.0/4 (Multicast) & 240.0.0.0/4 (Reserved)
      if (parts[0] >= 224) return true;
    }

    // IPv6 Checks
    if (net.isIPv6(ip)) {
      const lower = ip.toLowerCase();
      if (
        lower === "::1" ||
        lower === "::" ||
        lower.startsWith("fe80:") ||
        lower.startsWith("fc00:") ||
        lower.startsWith("fd00:") ||
        lower.startsWith("ff00:") ||
        lower.startsWith("2001:db8:")
      ) {
        return true;
      }
    }

    return false;
  }
}
