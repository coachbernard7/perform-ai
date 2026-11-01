/** Public deployment path only. Never place provider credentials in Expo variables. */
const configuredBase = process.env.EXPO_PUBLIC_PERFORM_BASE_PATH || "/app";
if (!/^\/[A-Za-z0-9/_-]*$/.test(configuredBase)) throw new Error("Invalid Perform AI deployment path.");
export const performBasePath = configuredBase.replace(/\/+$/, "");
export function performEndpoint(filename: string): string {
  if (!/^[a-z-]+\.php(?:\?[A-Za-z0-9=&_-]*)?$/.test(filename)) throw new Error("Invalid application endpoint.");
  return `${performBasePath}/${filename}`;
}
