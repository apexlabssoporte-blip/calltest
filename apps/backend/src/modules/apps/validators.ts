/**
 * Validates Android package names according to Google Play and Java package naming rules:
 * - Must have at least two dot-separated segments (e.g. com.example)
 * - Each segment must start with a letter and contain only letters, numbers, and underscores
 * - Cannot start or end with a dot
 */
export function isValidAndroidPackageName(packageName: string): boolean {
  if (!packageName || typeof packageName !== "string") {
    return false;
  }

  const trimmed = packageName.trim();
  if (trimmed.length < 3 || trimmed.length > 255) {
    return false;
  }

  const regex = /^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)+$/;
  return regex.test(trimmed);
}
