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
import {
  StellarWalletsKit,
  Networks as KitNetworks,
  type ISupportedWallet,
} from "@creit.tech/stellar-wallets-kit";
import { defaultModules } from "@creit.tech/stellar-wallets-kit/modules/utils";
import { FREIGHTER_ID } from "@creit.tech/stellar-wallets-kit/modules/freighter";
import { classifyError, type FriendlyError } from "@/lib/wallet-errors";

const NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";
const HORIZON_TESTNET = "https://horizon-testnet.stellar.org";
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
  network: NetworkDetails | null;
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

let kitInitialized = false;
function ensureKitInit() {
  if (kitInitialized) return;
  if (typeof window === "undefined") return;
  StellarWalletsKit.init({
    modules: defaultModules(),
    selectedWalletId: FREIGHTER_ID,
    network: KitNetworks.TESTNET,
  });
  kitInitialized = true;
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

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const installed = true; // kit modal handles the "no wallet" state inline
  const [address, setAddress] = useState<string | null>(null);
  const [walletId, setWalletId] = useState<string | null>(null);
  const [walletName, setWalletName] = useState<string | null>(null);
  const [error, setError] = useState<FriendlyError | null>(null);
  const [loading, setLoading] = useState(false);
  const [xlmBalance, setXlmBalance] = useState<string | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);

  const network: NetworkDetails = {
    network: "TESTNET",
    networkPassphrase: NETWORK_PASSPHRASE,
  };

  const fetchBalance = useCallback(async (g: string) => {
    setBalanceLoading(true);
    try {
      const r = await fetch(`${HORIZON_TESTNET}/accounts/${g}`);
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

  // On mount: init kit + try to restore the previous session silently.
  useEffect(() => {
    ensureKitInit();
    const saved = loadSession();
    if (saved) {
      try {
        StellarWalletsKit.setWallet(saved.walletId);
        setWalletId(saved.walletId);
        setAddress(saved.address);
        setWalletName(prettyName(saved.walletId));
      } catch {
        // module not available in this browser — silently ignore.
      }
    }
  }, []);

  const connect = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      ensureKitInit();
      // Open the multi-wallet picker. Resolves to the chosen wallet's address.
      let chosen: ISupportedWallet | null = null;
      const result = await StellarWalletsKit.authModal({
        // Default container is body; nothing extra needed.
      } as unknown as Parameters<typeof StellarWalletsKit.authModal>[0]);

      // The kit sets the active module internally before resolving authModal.
      // We can read it back via getAddress.
      const addr = result.address;
      // selectedModule is read-only — pull the id from it.
      const id = StellarWalletsKit.selectedModule.productId;
      chosen = {
        id,
        name: StellarWalletsKit.selectedModule.productName,
      } as ISupportedWallet;

      setAddress(addr);
      setWalletId(id);
      setWalletName(chosen?.name ?? prettyName(id));
      saveSession({ walletId: id, address: addr });
    } catch (e) {
      const f = classifyError(e);
      setError(f);
    } finally {
      setLoading(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    try {
      await StellarWalletsKit.disconnect();
    } catch {
      // ignore — we still want to clear local state.
    }
    setAddress(null);
    setWalletId(null);
    setWalletName(null);
    setError(null);
    saveSession(null);
  }, []);

  const signXdr = useCallback(
    async (xdr: string, opts?: { networkPassphrase?: string }) => {
      if (!address) throw new Error("wallet not connected");
      try {
        const res = await StellarWalletsKit.signTransaction(xdr, {
          networkPassphrase: opts?.networkPassphrase ?? NETWORK_PASSPHRASE,
          address,
        });
        return res.signedTxXdr;
      } catch (e) {
        // Surface a classified error to call-sites that show toasts.
        throw e instanceof Error ? e : new Error(String(e));
      }
    },
    [address],
  );

  const value = useMemo<WalletState>(
    () => ({
      installed,
      connected: Boolean(address),
      address,
      walletId,
      walletName,
      network,
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
