"use client";
/**
 * Multi-wallet context, powered by StellarWalletsKit.
 *
 * Yellow Belt requirement: support more than just Freighter.
 * The kit ships built-in modules for Freighter, xBull, Albedo, Lobstr,
 * Hana, and Hot Wallet, exposed via a single `authModal()` picker.
 *
 *   const { address, walletName, connect, disconnect, signXdr } = useWallet();
 *
 * The kit's API stays internal — call sites still use `useWallet()`,
 * which lets us swap implementations without touching pages.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Networks as KitNetworks } from "@creit.tech/stellar-wallets-kit";
import {
  classifyError,
  wrongNetworkError,
  type FriendlyError,
} from "@/lib/wallet-errors";

// Env-driven network config — falls back to Stellar testnet when unset.
// Exported so tx-building pages and network guards stay on the same config.
export const NETWORK_PASSPHRASE =
  process.env.NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE ||
  "Test SDF Network ; September 2015";
export const HORIZON_URL =
  process.env.NEXT_PUBLIC_HORIZON_URL || "https://horizon-testnet.stellar.org";
// Friendly label for the passphrase — "TESTNET" for the default config.
// Mirrors the kit's `Networks` enum so the label resolves without pulling
// the (lazily loaded) kit into the initial bundle.
const NETWORK_NAMES: Record<string, string> = {
  "Public Global Stellar Network ; September 2015": "PUBLIC",
  "Test SDF Network ; September 2015": "TESTNET",
  "Test SDF Future Network ; October 2022": "FUTURENET",
  "Local Sandbox Stellar Network ; September 2022": "SANDBOX",
  "Standalone Network ; February 2017": "STANDALONE",
};
/** Expected wallet network name for this build — "TESTNET", "PUBLIC", … */
export const NETWORK_NAME = NETWORK_NAMES[NETWORK_PASSPHRASE] ?? "CUSTOM";
const STORAGE_KEY = "orizon.wallet.v2";

type StoredSession = {
  walletId: string;
  address: string;
};

type NetworkDetails = {
  network: string;
  networkPassphrase: string;
};

type WalletState = {
  installed: boolean;
  connected: boolean;
  address: string | null;
  /** Stable wallet identifier from the kit — `freighter`, `xbull`, etc. */
  walletId: string | null;
  /** Friendly display name — `Freighter`, `xBull`, etc. */
  walletName: string | null;
  /** The network this build is configured for (env-driven). */
  network: NetworkDetails | null;
  /**
   * The network the connected wallet itself reported via the kit's
   * getNetwork(). Null while disconnected or when the wallet doesn't
   * support the call (e.g. Albedo, Lobstr) — unknown, not assumed.
   */
  walletNetwork: NetworkDetails | null;
  /**
   * True only when connected AND the wallet reported a passphrase that
   * differs from the app's. Unknown wallet network → false (no warning).
   */
  walletNetworkMismatch: boolean;
  error: FriendlyError | null;
  loading: boolean;
  xlmBalance: string | null;
  balanceLoading: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  signXdr: (xdr: string, opts?: { networkPassphrase?: string }) => Promise<string>;
  refreshBalance: () => Promise<void>;
};

const WalletCtx = createContext<WalletState | null>(null);

/**
 * StellarWalletsKit (plus every wallet module it bundles) is heavy, so it is
 * loaded on demand instead of shipping in every route's first-load JS: the
 * dynamic import runs when a saved session is restored on mount or on the
 * first connect(). The promise is cached module-level so the chunk is
 * fetched and the kit initialized exactly once.
 */
type KitModule = typeof import("@creit.tech/stellar-wallets-kit");
type Kit = KitModule["StellarWalletsKit"];

let kitPromise: Promise<Kit> | null = null;

function loadKit(): Promise<Kit> {
  if (!kitPromise) {
    kitPromise = Promise.all([
      import("@creit.tech/stellar-wallets-kit"),
      import("@creit.tech/stellar-wallets-kit/modules/utils"),
      import("@creit.tech/stellar-wallets-kit/modules/freighter"),
    ])
      .then(([{ StellarWalletsKit }, { defaultModules }, { FREIGHTER_ID }]) => {
        StellarWalletsKit.init({
          modules: defaultModules(),
          selectedWalletId: FREIGHTER_ID,
          network: NETWORK_PASSPHRASE as KitNetworks,
        });
        return StellarWalletsKit;
      })
      .catch((e) => {
        // Don't cache a failed load — a retry (e.g. next connect click)
        // should attempt the import again.
        kitPromise = null;
        throw e;
      });
  }
  return kitPromise;
}

function loadSession(): StoredSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredSession;
    if (!parsed.address || !parsed.walletId) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveSession(s: StoredSession | null) {
  if (typeof window === "undefined") return;
  if (s) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } else {
    window.localStorage.removeItem(STORAGE_KEY);
  }
}

/**
 * Ask the active wallet which network it is on. Not every wallet implements
 * getNetwork() (Albedo and Lobstr reject with code -3), so any failure or
 * malformed response resolves to null — "unknown", never a false alarm.
 */
async function probeWalletNetwork(kit: Kit): Promise<NetworkDetails | null> {
  try {
    const net = await kit.getNetwork();
    if (net && typeof net.networkPassphrase === "string" && net.networkPassphrase) {
      return {
        network: typeof net.network === "string" ? net.network : "",
        networkPassphrase: net.networkPassphrase,
      };
    }
  } catch {
    // wallet doesn't support getNetwork (or the call failed) — unknown.
  }
  return null;
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const installed = true; // kit modal handles the "no wallet" state inline
  const [address, setAddress] = useState<string | null>(null);
  const [walletId, setWalletId] = useState<string | null>(null);
  const [walletName, setWalletName] = useState<string | null>(null);
  const [error, setError] = useState<FriendlyError | null>(null);
  const [loading, setLoading] = useState(false);
  const [xlmBalance, setXlmBalance] = useState<string | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  // What the connected wallet itself reported via getNetwork() — null = unknown.
  const [walletNetwork, setWalletNetwork] = useState<NetworkDetails | null>(null);

  const network = useMemo<NetworkDetails>(
    () => ({ network: NETWORK_NAME, networkPassphrase: NETWORK_PASSPHRASE }),
    [],
  );

  // Mismatch is only asserted when connected and the wallet actually reported
  // a passphrase; wallets that can't report one never trigger the warning.
  const walletNetworkMismatch = Boolean(
    address &&
      walletNetwork &&
      walletNetwork.networkPassphrase !== NETWORK_PASSPHRASE,
  );

  const fetchBalance = useCallback(async (g: string) => {
    setBalanceLoading(true);
    try {
      const r = await fetch(`${HORIZON_URL}/accounts/${g}`);
      if (r.status === 404) {
        // Unfunded account — friendbot needed.
        setXlmBalance("0");
        return;
      }
      if (!r.ok) {
        setXlmBalance(null);
        return;
      }
      const j = await r.json();
      const native = j.balances?.find(
        (b: { asset_type: string; balance: string }) => b.asset_type === "native",
      );
      setXlmBalance(native?.balance ?? "0");
    } catch {
      setXlmBalance(null);
    } finally {
      setBalanceLoading(false);
    }
  }, []);

  const refreshBalance = useCallback(async () => {
    if (!address) return;
    await fetchBalance(address);
  }, [address, fetchBalance]);

  // Re-fetch balance whenever the address changes.
  useEffect(() => {
    if (address) {
      fetchBalance(address);
    } else {
      setXlmBalance(null);
    }
  }, [address, fetchBalance]);

  // On mount: try to restore the previous session silently. Only a saved
  // session triggers the (lazy) kit load — first-time visitors don't pay
  // for the kit until they hit connect().
  useEffect(() => {
    const saved = loadSession();
    if (!saved) return;
    let cancelled = false;
    (async () => {
      try {
        const kit = await loadKit();
        kit.setWallet(saved.walletId);
        if (cancelled) return;
        setWalletId(saved.walletId);
        setAddress(saved.address);
        setWalletName(prettyName(saved.walletId));
        // Ask the restored wallet which network it is really on.
        const net = await probeWalletNetwork(kit);
        if (!cancelled) setWalletNetwork(net);
      } catch {
        // module not available in this browser — silently ignore.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const connect = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const kit = await loadKit();
      // Open the multi-wallet picker. Resolves to the chosen wallet's address.
      const { address: addr } = await kit.authModal();
      // The kit sets the active module internally before resolving authModal.
      const id = kit.selectedModule.productId;
      const name = kit.selectedModule.productName;

      setAddress(addr);
      setWalletId(id);
      setWalletName(name ?? prettyName(id));
      saveSession({ walletId: id, address: addr });
      // Ask the chosen wallet which network it is really on.
      setWalletNetwork(await probeWalletNetwork(kit));
    } catch (e) {
      const f = classifyError(e);
      setError(f);
    } finally {
      setLoading(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    try {
      // If the kit never loaded there is nothing to disconnect from —
      // don't force the chunk to download just to tear state down.
      if (kitPromise) {
        const kit = await kitPromise;
        await kit.disconnect();
      }
    } catch {
      // ignore — we still want to clear local state.
    }
    setAddress(null);
    setWalletId(null);
    setWalletName(null);
    setWalletNetwork(null);
    setError(null);
    saveSession(null);
  }, []);

  const signXdr = useCallback(
    async (xdr: string, opts?: { networkPassphrase?: string }) => {
      if (!address) throw new Error("wallet not connected");
      // Pre-flight: if the wallet already told us it is on a different
      // network, fail fast with a classified error instead of opening the
      // signing popup and letting the tx die on-chain with tx_bad_auth.
      if (walletNetworkMismatch && walletNetwork) {
        throw wrongNetworkError(
          `wallet reports ${walletNetwork.network || walletNetwork.networkPassphrase}; app expects ${NETWORK_NAME} (${NETWORK_PASSPHRASE})`,
        );
      }
      try {
        const kit = await loadKit();
        const res = await kit.signTransaction(xdr, {
          networkPassphrase: opts?.networkPassphrase ?? NETWORK_PASSPHRASE,
          address,
        });
        return res.signedTxXdr;
      } catch (e) {
        // Surface a classified error to call-sites that show toasts.
        throw e instanceof Error ? e : new Error(String(e));
      }
    },
    [address, walletNetwork, walletNetworkMismatch],
  );

  const value = useMemo<WalletState>(
    () => ({
      installed,
      connected: Boolean(address),
      address,
      walletId,
      walletName,
      network,
      walletNetwork,
      walletNetworkMismatch,
      error,
      loading,
      xlmBalance,
      balanceLoading,
      connect,
      disconnect,
      signXdr,
      refreshBalance,
    }),
    [
      installed,
      address,
      walletId,
      walletName,
      network,
      walletNetwork,
      walletNetworkMismatch,
      error,
      loading,
      xlmBalance,
      balanceLoading,
      connect,
      disconnect,
      signXdr,
      refreshBalance,
    ],
  );

  return <WalletCtx.Provider value={value}>{children}</WalletCtx.Provider>;
}

export function useWallet() {
  const ctx = useContext(WalletCtx);
  if (!ctx) throw new Error("useWallet must be inside <WalletProvider>");
  return ctx;
}

function prettyName(id: string): string {
  const map: Record<string, string> = {
    freighter: "Freighter",
    xbull: "xBull",
    albedo: "Albedo",
    lobstr: "LOBSTR",
    hana: "Hana",
    "hot-wallet": "Hot Wallet",
  };
  return map[id] ?? id;
}
