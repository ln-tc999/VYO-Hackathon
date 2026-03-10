# Understanding YO Protocol Yield Mechanism

> **Panduan Lengkap:** Bagaimana yield bekerja di YO Protocol dan cara integrasi datanya

---

## 🎯 Konsep Dasar YO Yield

### ERC-4626 Tokenized Vault Standard

YO menggunakan **ERC-4626**, standar vault tokenized yang memungkinkan:

```
User Deposit 100 USDC
        ↓
   Dapat 98 yoUSD (shares)
        ↓
   Shares appreciate over time
        ↓
   Redeem: 98 shares → 105 USDC
                 ↑
           Yield earned!
```

**Mekanisme:**
- **Shares** = Representasi ownership di vault
- **Exchange Rate** = Shares:Assets ratio (naik terus)
- **Yield** = Appreciation of shares
- **No rebasing** - Jumlah shares tetap, value naik

---

## 💰 Bagaimana Yield Dihasilkan

### 1. Underlying Yield Sources

YO vaults deposit ke multiple DeFi protocols:

| Vault | Underlying | Yield Sources |
|-------|-----------|---------------|
| **yoUSD** | USDC | Aave V3, Compound V3, Morpho |
| **yoETH** | WETH | Aave, Rocket Pool, Lido |
| **yoBTC** | cbBTC | Aave, Compound |
| **yoEUR** | EURC | Aave, Compound |

### 2. Auto-Rebalancing Strategy

YO otomatis pindah dana ke pool dengan yield tertinggi:

```
Pool A (Aave): 5% APY
Pool B (Morpho): 7% APY  ← Lebih tinggi!
        ↓
YO pindahkan dana dari A ke B
        ↓
User dapat yield optimal (≈6.5% blended)
```

### 3. Fee Structure

**Current: 0% fees**
- No deposit fee
- No withdrawal fee
- No management fee
- No performance fee

Semua yield masuk ke user 100%.

---

## 📊 Yield Calculation Formula

### Real-Time Yield

```typescript
// Yield = (Current Value - Initial Deposit) / Initial Deposit
function calculateYield(
    initialShares: bigint,
    currentShares: bigint, // Same as initial in ERC-4626
    exchangeRateInitial: bigint,
    exchangeRateCurrent: bigint
): number {
    // Assets = Shares * Exchange Rate
    const initialAssets = initialShares * exchangeRateInitial;
    const currentAssets = currentShares * exchangeRateCurrent;
    
    const yield = currentAssets - initialAssets;
    const yieldPercent = (yield / initialAssets) * 100;
    
    return yieldPercent;
}
```

### Annualized APY

YO Protocol menghitung APY berdasarkan:
- Historical performance (30-day average)
- Current pool allocations
- Risk-adjusted returns
- Auto-rebalancing frequency

```typescript
// Get APY dari YO API
const snapshot = await client.getVaultSnapshot(vaultAddress);
console.log(snapshot.apy); // e.g., 6.42%
```

---

## 🔌 Integrasi Yield Data (Implementation)

### 1. Backend: Fetch Real-Time Yield

```typescript
// backend/src/services/yield-tracker.ts

interface YieldData {
    vaultId: string;
    currentApy: number;
    realizedYield: number;      // Yield already earned
    projectedYield: number;     // Projected based on current APY
    totalDeposited: number;
    currentValue: number;
    profit: number;
}

export class YieldTracker {
    
    /**
     * Get user's yield for a specific vault
     */
    async getUserVaultYield(
        userAddress: string,
        vaultAddress: string
    ): Promise<YieldData> {
        // 1. Get current position from YO SDK
        const position = await yoService.getUserPosition(vaultAddress, userAddress);
        
        // 2. Get transaction history
        const history = await this.getUserTransactions(userAddress, vaultAddress);
        
        // 3. Calculate total deposited
        const totalDeposited = history
            .filter(tx => tx.type === 'deposit')
            .reduce((sum, tx) => sum + tx.amount, 0);
        
        const totalWithdrawn = history
            .filter(tx => tx.type === 'redeem')
            .reduce((sum, tx) => sum + tx.amount, 0);
        
        // 4. Calculate yield
        const netDeposited = totalDeposited - totalWithdrawn;
        const currentValue = position.assets;
        const profit = currentValue - netDeposited;
        const yieldPercent = netDeposited > 0 ? (profit / netDeposited) * 100 : 0;
        
        // 5. Get current APY
        const vault = await yoService.getVaultDetails(vaultAddress);
        
        // 6. Calculate projected annual yield
        const projectedYield = currentValue * (vault.apy / 100);
        
        return {
            vaultId: vault.id,
            currentApy: vault.apy,
            realizedYield: profit,
            projectedYield,
            totalDeposited,
            currentValue,
            profit,
        };
    }
    
    /**
     * Get total yield across all user vaults
     */
    async getUserTotalYield(userAddress: string): Promise<{
        totalDeposited: number;
        currentValue: number;
        totalProfit: number;
        avgApy: number;
        vaults: YieldData[];
    }> {
        // Get all vaults user has position in
        const vaults = await yoService.getVaults();
        const userVaults: YieldData[] = [];
        
        for (const vault of vaults) {
            const position = await yoService.getUserPosition(vault.address, userAddress);
            if (position.shares > 0) {
                const yieldData = await this.getUserVaultYield(userAddress, vault.address);
                userVaults.push(yieldData);
            }
        }
        
        const totalDeposited = userVaults.reduce((sum, v) => sum + v.totalDeposited, 0);
        const currentValue = userVaults.reduce((sum, v) => sum + v.currentValue, 0);
        const totalProfit = currentValue - totalDeposited;
        const avgApy = userVaults.length > 0 
            ? userVaults.reduce((sum, v) => sum + v.currentApy, 0) / userVaults.length 
            : 0;
        
        return {
            totalDeposited,
            currentValue,
            totalProfit,
            avgApy,
            vaults: userVaults,
        };
    }
    
    /**
     * Get yield history for charts
     */
    async getYieldHistory(
        userAddress: string,
        vaultAddress: string,
        days: number = 30
    ): Promise<Array<{date: string; apy: number; value: number}>> {
        // Fetch from YO API
        const response = await fetch(
            `https://api.yo.xyz/api/v1/vault/yield/timeseries/base/${vaultAddress}?days=${days}`
        );
        const data = await response.json();
        
        return data.data.map((point: any) => ({
            date: point.date,
            apy: point.apy,
            value: point.tvl, // Total value locked
        }));
    }
}

export const yieldTracker = new YieldTracker();
```

### 2. Frontend: Display Yield

```typescript
// frontend/src/components/YieldDisplay.tsx

import { useEffect, useState } from 'react';

interface YieldDisplayProps {
    userAddress: string;
}

export function YieldDisplay({ userAddress }: YieldDisplayProps) {
    const [yieldData, setYieldData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
        fetchYield();
        // Refresh setiap 30 detik
        const interval = setInterval(fetchYield, 30000);
        return () => clearInterval(interval);
    }, [userAddress]);
    
    async function fetchYield() {
        const response = await fetch(`/api/yield/total?user=${userAddress}`);
        const data = await response.json();
        setYieldData(data);
        setLoading(false);
    }
    
    if (loading) return <div>Loading yield...</div>;
    
    return (
        <div className="yield-card">
            <div className="yield-summary">
                <h2>Your Yield</h2>
                <div className="yield-stats">
                    <div className="stat">
                        <label>Total Deposited</label>
                        <value>${yieldData.totalDeposited.toFixed(2)}</value>
                    </div>
                    <div className="stat">
                        <label>Current Value</label>
                        <value>${yieldData.currentValue.toFixed(2)}</value>
                    </div>
                    <div className="stat profit">
                        <label>Total Profit</label>
                        <value>+${yieldData.totalProfit.toFixed(2)}</value>
                        <span className="percent">({yieldData.avgApy.toFixed(2)}% APY)</span>
                    </div>
                </div>
            </div>
            
            <div className="vault-breakdown">
                <h3>By Vault</h3>
                {yieldData.vaults.map((vault: any) => (
                    <div key={vault.vaultId} className="vault-row">
                        <span className="vault-name">{vault.vaultId}</span>
                        <span className="vault-apy">{vault.currentApy}% APY</span>
                        <span className="vault-profit">
                            +${vault.profit.toFixed(2)}
                        </span>
                    </div>
                ))}
            </div>
            
            <YieldChart vaults={yieldData.vaults} />
        </div>
    );
}

// Chart component
function YieldChart({ vaults }: { vaults: any[] }) {
    // Use recharts or chart.js
    return (
        <div className="yield-chart">
            {/* Render chart here */}
        </div>
    );
}
```

### 3. Vio Agent: Yield Optimization

```typescript
// backend/src/services/ai/decisionEngine.ts

interface YieldOpportunity {
    vaultId: string;
    currentApy: number;
    riskScore: number;
}

export class YieldOptimizer {
    
    /**
     * Scan for better yield opportunities
     */
    async scanForBetterYield(
        userAddress: string,
        currentGoal: Goal
    ): Promise<YieldOpportunity | null> {
        // Get all available vaults
        const vaults = await yoService.getVaults();
        
        // Get current vault user is in
        const currentVault = currentGoal.vaultAllocations[0];
        const currentVaultInfo = vaults.find(v => v.id === currentVault.vaultId);
        
        if (!currentVaultInfo) return null;
        
        // Find vaults with better APY and similar risk
        const betterVaults = vaults.filter(v => 
            v.riskScore <= currentVaultInfo.riskScore + 1 &&
            v.apy > currentVaultInfo.apy + 1.5 // At least 1.5% better
        );
        
        if (betterVaults.length === 0) return null;
        
        // Pick best one
        const bestVault = betterVaults.reduce((best, v) => 
            v.apy > best.apy ? v : best
        );
        
        // Calculate benefit
        const apyDiff = bestVault.apy - currentVaultInfo.apy;
        const potentialAnnualGain = (currentGoal.currentAmount * apyDiff) / 100;
        
        console.log(`[VIO_AGENT] Found better yield: ${currentVaultInfo.name} (${currentVaultInfo.apy}%) → ${bestVault.name} (${bestVault.apy}%)`);
        console.log(`[VIO_AGENT] Potential annual gain: $${potentialAnnualGain.toFixed(2)}`);
        
        return {
            vaultId: bestVault.id,
            currentApy: bestVault.apy,
            riskScore: bestVault.riskScore,
        };
    }
    
    /**
     * Compare yield strategies
     */
    async compareStrategies(
        amount: number,
        riskProfile: 'conservative' | 'moderate' | 'aggressive'
    ): Promise<Array<{vault: string; allocation: number; apy: number; expectedYield: number}>> {
        
        const vaults = await yoService.getVaults();
        
        // Filter by risk
        const eligibleVaults = vaults.filter(v => {
            if (riskProfile === 'conservative') return v.riskScore <= 3;
            if (riskProfile === 'moderate') return v.riskScore <= 5;
            return true; // Aggressive: all vaults
        });
        
        // Sort by APY
        eligibleVaults.sort((a, b) => b.apy - a.apy);
        
        // Create allocation strategy
        const strategy = eligibleVaults.slice(0, 3).map((vault, i) => {
            const allocation = i === 0 ? 50 : i === 1 ? 30 : 20;
            const allocatedAmount = amount * (allocation / 100);
            const expectedYield = allocatedAmount * (vault.apy / 100);
            
            return {
                vault: vault.id,
                allocation,
                apy: vault.apy,
                expectedYield,
            };
        });
        
        return strategy;
    }
}

export const yieldOptimizer = new YieldOptimizer();
```

---

## 📈 API Endpoints untuk Yield

```typescript
// backend/src/routes/yield.ts

import { Router } from 'express';
import { yieldTracker } from '../services/yield-tracker.js';

export const yieldRouter = Router();

// GET /api/yield/total - Total yield across all vaults
yieldRouter.get('/total', async (req, res) => {
    const { user } = req.query;
    const data = await yieldTracker.getUserTotalYield(user as string);
    res.json({ success: true, data });
});

// GET /api/yield/vault/:vaultId - Yield for specific vault
yieldRouter.get('/vault/:vaultId', async (req, res) => {
    const { user } = req.query;
    const { vaultId } = req.params;
    const data = await yieldTracker.getUserVaultYield(user as string, vaultId);
    res.json({ success: true, data });
});

// GET /api/yield/history - Historical yield data
yieldRouter.get('/history', async (req, res) => {
    const { user, vault, days = 30 } = req.query;
    const data = await yieldTracker.getYieldHistory(
        user as string,
        vault as string,
        parseInt(days as string)
    );
    res.json({ success: true, data });
});

// GET /api/yield/optimize - Vio Agent recommendations
yieldRouter.get('/optimize', async (req, res) => {
    const { user, amount, risk } = req.query;
    const strategy = await yieldOptimizer.compareStrategies(
        parseFloat(amount as string),
        risk as 'conservative' | 'moderate' | 'aggressive'
    );
    res.json({ success: true, data: strategy });
});
```

---

## 🎨 UI Components untuk Yield

### 1. Yield Card (Dashboard)

```
┌─────────────────────────────────────────┐
│  💰 Your Yield                          │
├─────────────────────────────────────────┤
│                                         │
│  Total Deposited    $5,000.00           │
│  Current Value      $5,234.50           │
│  Total Profit       +$234.50 (4.7%)     │
│                                         │
│  Average APY        6.2% ⬆️             │
│                                         │
├─────────────────────────────────────────┤
│  By Vault:                              │
│  • yoUSD   6.5% APY   +$150.20         │
│  • yoETH   5.8% APY   +$84.30          │
└─────────────────────────────────────────┘
```

### 2. Yield Chart

- Line chart: Value over time
- Bar chart: APY comparison by vault
- Area chart: Cumulative yield

### 3. Yield Optimization Modal

```
┌─────────────────────────────────────────┐
│  🎯 Vio Agent Suggestion                │
├─────────────────────────────────────────┤
│                                         │
│  Current: yoUSD at 6.5% APY             │
│  Better:  yoETH at 7.8% APY             │
│                                         │
│  Potential gain: +$65/year              │
│                                         │
│  [Learn More]    [Rebalance Now]        │
└─────────────────────────────────────────┘
```

---

## 🔑 Key Points untuk Integrasi

### 1. Yield = Shares Appreciation
- User tidak dapat "claim yield" - yield sudah di dalam shares
- Redeem shares → Dapat underlying + yield
- Exchange rate naik terus (tidak turun)

### 2. APY Bervariasi
- Tidak fixed - berubah sesuai pool performance
- Auto-rebalancing maintain optimal yield
- Display current APY saja (bukan guaranteed)

### 3. Real-Time vs Historical
- **Real-time**: getUserPosition() untuk current value
- **Historical**: getYieldHistory() untuk charts
- **Projected**: Current APY × Current Value

### 4. Multi-Vault Yield
- Setiap vault punya APY sendiri
- Weighted average untuk total
- Track per vault untuk breakdown

---

## ✅ Implementation Checklist

### Backend
- [x] YieldTracker service
- [x] API endpoints
- [x] Vio Agent optimization
- [x] Real-time calculation

### Frontend
- [ ] YieldDisplay component
- [ ] YieldChart (recharts)
- [ ] Optimization suggestions
- [ ] Auto-refresh (30s interval)

### Contract (VyoRouter)
- [ ] Track yield on-chain
- [ ] Event for yield updates
- [ ] Emergency exit preserve yield

---

Sudah jelas bagaimana yield bekerja dan cara integrasinya? 🚀

Next: Deploy smart contract atau develop frontend components?