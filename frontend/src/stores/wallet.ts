// ============================================================
// Wallet Store
// Reactive store for wallet state management
// ============================================================

import { atom } from 'nanostores';

export interface WalletState {
    isConnected: boolean;
    address: string | null;
    chainId: number | null;
    isConnecting: boolean;
    error: string | null;
}

// Initial state
const initialState: WalletState = {
    isConnected: false,
    address: null,
    chainId: null,
    isConnecting: false,
    error: null,
};

// Create store
export const walletStore = atom<WalletState>(initialState);

// Actions
export const walletActions = {
    connect: (address: string, chainId: number) => {
        walletStore.set({
            isConnected: true,
            address,
            chainId,
            isConnecting: false,
            error: null,
        });
    },
    
    disconnect: () => {
        walletStore.set(initialState);
    },
    
    setConnecting: (isConnecting: boolean) => {
        const current = walletStore.get();
        walletStore.set({ ...current, isConnecting });
    },
    
    setError: (error: string | null) => {
        const current = walletStore.get();
        walletStore.set({ ...current, error, isConnecting: false });
    },
    
    updateChain: (chainId: number) => {
        const current = walletStore.get();
        walletStore.set({ ...current, chainId });
    },
};
