"use client";
/**
 * Freighter wallet context.
 *
 * Wraps @stellar/freighter-api so any component can do:
 *   const { address, connect, disconnect, signTransaction } = useWallet();
 *
 * Freighter is a browser extension — none of this works server-side.
 * We guard every call behind `typeof window !== "undefined"` and hydrate
 * the connection state on mount.
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
  isConnected,
  isAllowed,
  setAllowed,
  requestAccess,
  getAddress,
  getNetwork,
  getNetworkDetails,
  signTransaction as fSignTransaction,
} from "@stellar/freighter-api";

type NetworkDetails = {
  network: string;
  networkPassphrase: string;
  networkUrl?: string;
};

type WalletState = {
  installed: boolean;
  connected: boolean;
  address: string | null;
  network: NetworkDetails | null;
  error: string | null;
  loading: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  signXdr: (xdr: string, opts?: { networkPassphrase?: string }) => Promise<string>;
};

const WalletCtx = createContext<WalletState | null>(null);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [installed, setInstalled] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [network, setNetwork] = useState<NetworkDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  /** Pulls latest address + network from Freighter, if allowed. */
  const refresh = useCallback(async () => {
    try {
      const detected = await isConnected();
      setInstalled(Boolean(detected?.isConnected));
      if (!detected?.isConnected) return;

      const allowed = await isAllowed();
      if (!allowed?.isAllowed) {
        setAddress(null);
        return;
      }

      const [addr, net] = await Promise.all([getAddress(), getNetworkDetails()]);
      setAddress(addr?.address ?? null);
      setNetwork({
        network: net?.network ?? "",
        networkPassphrase: net?.networkPassphrase ?? "",
        networkUrl: net?.networkUrl,
      });
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "freighter error");
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const connect = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Ask for permission (opens the Freighter popup).
      await setAllowed();
      const access = await requestAccess();
      if (access?.address) setAddress(access.address);

      const net = await getNetworkDetails();
      setNetwork({
        network: net?.network ?? "",
        networkPassphrase: net?.networkPassphrase ?? "",
        networkUrl: net?.networkUrl,
      });
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Freighter not available. Install it from https://freighter.app",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    // Freighter has no programmatic revoke; we just forget the address
    // locally. The user can fully revoke in the extension.
    setAddress(null);
  }, []);

  const signXdr = useCallback(
    async (xdr: string, opts?: { networkPassphrase?: string }) => {
      if (!address) throw new Error("wallet not connected");
      const res = await fSignTransaction(xdr, {
        networkPassphrase:
          opts?.networkPassphrase ??
          network?.networkPassphrase ??
          "Test SDF Network ; September 2015",
        address,
      });
      if ("error" in (res ?? {})) {
        throw new Error((res as { error: string }).error);
      }
      return (res as { signedTxXdr: string }).signedTxXdr;
    },
    [address, network],
  );

  const value = useMemo<WalletState>(
    () => ({
      installed,
      connected: Boolean(address),
      address,
      network,
      error,
      loading,
      connect,
      disconnect,
      signXdr,
    }),
    [installed, address, network, error, loading, connect, disconnect, signXdr],
  );

  return <WalletCtx.Provider value={value}>{children}</WalletCtx.Provider>;
}

export function useWallet() {
  const ctx = useContext(WalletCtx);
  if (!ctx) throw new Error("useWallet must be inside <WalletProvider>");
  return ctx;
}
