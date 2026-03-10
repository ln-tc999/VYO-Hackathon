// ============================================================
// API Client
// Frontend client for Vyo Apps backend API
// ============================================================

const API_BASE = 'http://localhost:3001/api';

/**
 * Make authenticated API request
 */
async function apiRequest(
    endpoint: string,
    options: RequestInit = {},
    walletAddress?: string
): Promise<any> {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...((options.headers as Record<string, string>) || {}),
    };
    
    // Add wallet address header if provided
    if (walletAddress) {
        headers['X-Wallet-Address'] = walletAddress;
    }
    
    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'API request failed');
    }
    
    return response.json();
}

// ============================================================
// Yield API
// ============================================================

export const yieldApi = {
    /**
     * Get total yield summary
     */
    async getTotalYield(walletAddress: string) {
        return apiRequest('/yield/total', {}, walletAddress);
    },
    
    /**
     * Get yoVault token positions
     */
    async getPositions(walletAddress: string) {
        return apiRequest('/yield/positions', {}, walletAddress);
    },
    
    /**
     * Get yield for specific vault
     */
    async getVaultYield(walletAddress: string, vaultAddress: string) {
        return apiRequest(`/yield/vault/${vaultAddress}`, {}, walletAddress);
    },
    
    /**
     * Get yield history
     */
    async getYieldHistory(vaultAddress: string, days: number = 30) {
        return apiRequest(`/yield/history/${vaultAddress}?days=${days}`);
    },
    
    /**
     * Get optimization suggestions
     */
    async getOptimizationSuggestions(walletAddress: string, riskProfile: string = 'moderate') {
        return apiRequest(`/yield/optimize?risk=${riskProfile}`, {}, walletAddress);
    },
    
    /**
     * Get all available vaults
     */
    async getVaults() {
        return apiRequest('/yield/vaults/available');
    },
    
    /**
     * Get vault snapshot (real-time APY, TVL)
     */
    async getVaultSnapshot(vaultAddress: string) {
        return apiRequest(`/yield/vaults/${vaultAddress}/snapshot`);
    },
};

// ============================================================
// Goals API
// ============================================================

export const goalsApi = {
    /**
     * Get user goals
     */
    async getGoals(walletAddress: string) {
        return apiRequest('/goals', {}, walletAddress);
    },
    
    /**
     * Create new goal
     */
    async createGoal(walletAddress: string, goal: any) {
        return apiRequest('/goals', {
            method: 'POST',
            body: JSON.stringify(goal),
        }, walletAddress);
    },
    
    /**
     * Deposit to goal
     */
    async depositToGoal(walletAddress: string, goalId: string, amount: number) {
        return apiRequest(`/goals/${goalId}/deposit`, {
            method: 'POST',
            body: JSON.stringify({ amount }),
        }, walletAddress);
    },
};

// ============================================================
// AI API
// ============================================================

export const aiApi = {
    /**
     * Get AI decisions
     */
    async getDecisions(walletAddress: string) {
        return apiRequest('/ai/decisions', {}, walletAddress);
    },
    
    /**
     * Chat with Vio Agent
     */
    async chat(walletAddress: string, message: string, history: any[] = []) {
        return apiRequest('/ai/chat', {
            method: 'POST',
            body: JSON.stringify({ message, history }),
        }, walletAddress);
    },
};

// ============================================================
// Dashboard API
// ============================================================

export const dashboardApi = {
    /**
     * Get dashboard summary
     */
    async getDashboard(walletAddress: string) {
        return apiRequest('/dashboard', {}, walletAddress);
    },
};
