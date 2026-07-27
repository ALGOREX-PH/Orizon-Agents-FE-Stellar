/**
 * Single source of truth for the client-side Stellar network config.
 *
 * Every `NEXT_PUBLIC_*` network read lives here so a typo'd or half-flipped
 * env can never silently ship a testnet build against mainnet: the passphrase
 * must be a known Stellar network, and the Horizon/RPC endpoints must belong
 * to the same network as the passphrase. Violations throw at module load,
 * which fails `next build` (the values are inlined at build time) instead of
 * surfacing as wrong explorer links or tx_bad_auth at signing time.
 */

const TESTNET_PASSPHRASE = "Test SDF Network ; September 2015";
const PUBLIC_PASSPHRASE = "Public Global Stellar Network ; September 2015";

const NETWORK_NAMES: Record<string, string> = {
  [PUBLIC_PASSPHRASE]: "PUBLIC",
  [TESTNET_PASSPHRASE]: "TESTNET",
  "Test SDF Future Network ; October 2022": "FUTURENET",
  "Local Sandbox Stellar Network ; September 2022": "SANDBOX",
  "Standalone Network ; February 2017": "STANDALONE",
};

export const NETWORK_PASSPHRASE =
  process.env.NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE || TESTNET_PASSPHRASE;
export const HORIZON_URL =
  process.env.NEXT_PUBLIC_HORIZON_URL || "https://horizon-testnet.stellar.org";
export const SOROBAN_RPC_URL =
  process.env.NEXT_PUBLIC_SOROBAN_RPC_URL ||
  "https://soroban-testnet.stellar.org";

const resolvedName = NETWORK_NAMES[NETWORK_PASSPHRASE];
if (!resolvedName) {
  throw new Error(
    "NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE is not a known Stellar network " +
      `passphrase: "${NETWORK_PASSPHRASE}"`,
  );
}

/** Friendly network label — "PUBLIC", "TESTNET", "FUTURENET", … */
export const NETWORK_NAME = resolvedName;
export const IS_MAINNET = NETWORK_PASSPHRASE === PUBLIC_PASSPHRASE;

// A mainnet passphrase pointing at test endpoints (or the reverse) is the
// classic half-flipped deploy — fail the build rather than sign against the
// wrong chain. Custom/self-hosted endpoints that match neither heuristic are
// left alone.
for (const [name, url] of [
  ["NEXT_PUBLIC_HORIZON_URL", HORIZON_URL],
  ["NEXT_PUBLIC_SOROBAN_RPC_URL", SOROBAN_RPC_URL],
] as const) {
  const isTestEndpoint = /testnet|futurenet/i.test(url);
  const isKnownStellarHost = /stellar\.org|sorobanrpc\.com/i.test(url);
  if (IS_MAINNET && isTestEndpoint) {
    throw new Error(
      `${name} points at a test network but the passphrase is mainnet: ${url}`,
    );
  }
  if (!IS_MAINNET && isKnownStellarHost && !isTestEndpoint) {
    throw new Error(
      `${name} points at a mainnet endpoint but the passphrase is not mainnet: ${url}`,
    );
  }
}
