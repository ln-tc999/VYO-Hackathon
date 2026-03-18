// ============================================================
// VyoRouter Hooks
// React hooks for interacting with VyoRouter contract
// ============================================================

import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi';
import { CONTRACTS } from './wallet.js';
import { VYOROUTER_ABI, ERC20_ABI } from './abi.js';
import { parseUnits, formatUnits } from 'viem';

// ============================================================
// Helper Functions
// ============================================================

const USDC_DECIMALS = 6;

export const parseUSDC = (amount: number) => parseUnits(amount.toString(), USDC_DECIMALS);
export const formatUSDC = (amount: bigint) => formatUnits(amount, USDC_DECIMALS);

// ============================================================
// Read Hooks
// ============================================================

export function useUserGoals(userAddress?: string) {
  const result = useReadContract({
    address: CONTRACTS.VyoRouter,
    abi: VYOROUTER_ABI,
    functionName: 'getUserGoals',
    args: userAddress ? [userAddress as `0x${string}`] : undefined,
    query: { enabled: !!userAddress },
  });

  return {
    goals: (result.data || []) as any[],
    isLoading: result.isLoading,
    error: result.error,
    refetch: result.refetch,
  };
}

export function useGoalAllocations(goalId?: string) {
  const result = useReadContract({
    address: CONTRACTS.VyoRouter,
    abi: VYOROUTER_ABI,
    functionName: 'getGoalAllocations',
    args: goalId ? [goalId as `0x${string}`] : undefined,
    query: { enabled: !!goalId },
  });

  return {
    allocations: (result.data || []) as any[],
    isLoading: result.isLoading,
    error: result.error,
    refetch: result.refetch,
  };
}

export function useAutomationConfig(goalId?: string) {
  const result = useReadContract({
    address: CONTRACTS.VyoRouter,
    abi: VYOROUTER_ABI,
    functionName: 'getAutomationConfig',
    args: goalId ? [goalId as `0x${string}`] : undefined,
    query: { enabled: !!goalId },
  });

  return {
    config: result.data as any,
    isLoading: result.isLoading,
    error: result.error,
    refetch: result.refetch,
  };
}

export function useUSDCBalance(address?: string) {
  const result = useReadContract({
    address: CONTRACTS.USDC,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address as `0x${string}`] : undefined,
    query: { enabled: !!address },
  });

  return {
    balance: result.data ? formatUSDC(result.data as bigint) : 0,
    balanceRaw: (result.data ?? 0n) as bigint,
    isLoading: result.isLoading,
    error: result.error,
  };
}

export function useUSDCAllowance(ownerAddress?: string) {
  const result = useReadContract({
    address: CONTRACTS.USDC,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: ownerAddress ? [ownerAddress as `0x${string}`, CONTRACTS.VyoRouter] : undefined,
    query: { enabled: !!ownerAddress },
  });

  return {
    allowance: result.data ? formatUSDC(result.data as bigint) : 0,
    allowanceRaw: (result.data ?? 0n) as bigint,
    isLoading: result.isLoading,
    error: result.error,
  };
}

// ============================================================
// Write Hooks
// ============================================================

export function useCreateGoal(): any {
  const write: any = useWriteContract();
  
  const createGoal = (params: {
    name: string;
    targetAmount: number;
    deadline: number;
    riskLevel: number;
    vaults: string[];
    percentages: number[];
  }) => {
    write.writeContract({
      address: CONTRACTS.VyoRouter,
      abi: VYOROUTER_ABI,
      functionName: 'createGoal',
      args: [
        params.name,
        parseUSDC(params.targetAmount),
        BigInt(params.deadline),
        params.riskLevel,
        params.vaults as unknown as `0x${string}[]`,
        params.percentages.map(BigInt) as unknown as bigint[],
      ],
    } as any);
  };

  return { 
    createGoal, 
    hash: write.data, 
    isPending: write.isPending, 
    error: write.error 
  };
}

export function useBatchDeposit(): any {
  const write: any = useWriteContract();
  
  const deposit = (params: {
    goalId: string;
    vaults: string[];
    amounts: number[];
    totalAmount: number;
  }) => {
    write.writeContract({
      address: CONTRACTS.VyoRouter,
      abi: VYOROUTER_ABI,
      functionName: 'batchDeposit',
      args: [
        params.goalId as `0x${string}`,
        params.vaults as unknown as `0x${string}[]`,
        params.amounts.map(a => parseUSDC(a)) as unknown as bigint[],
        parseUSDC(params.totalAmount),
      ],
    } as any);
  };

  return { 
    deposit, 
    hash: write.data, 
    isPending: write.isPending, 
    error: write.error 
  };
}

export function useBatchRedeem(): any {
  const write: any = useWriteContract();
  
  const redeem = (params: {
    goalId: string;
    vaults: string[];
    shares: number[];
  }) => {
    write.writeContract({
      address: CONTRACTS.VyoRouter,
      abi: VYOROUTER_ABI,
      functionName: 'batchRedeem',
      args: [
        params.goalId as `0x${string}`,
        params.vaults as unknown as `0x${string}[]`,
        params.shares.map(s => parseUSDC(s)) as unknown as bigint[],
      ],
    } as any);
  };

  return { 
    redeem, 
    hash: write.data, 
    isPending: write.isPending, 
    error: write.error 
  };
}

export function useEmergencyExit(): any {
  const write: any = useWriteContract();
  
  const emergencyExit = (goalId: string) => {
    write.writeContract({
      address: CONTRACTS.VyoRouter,
      abi: VYOROUTER_ABI,
      functionName: 'emergencyExit',
      args: [goalId as `0x${string}`],
    } as any);
  };

  return { 
    emergencyExit, 
    hash: write.data, 
    isPending: write.isPending, 
    error: write.error 
  };
}

export function useSetAutomationConfig(): any {
  const write: any = useWriteContract();
  
  const setConfig = (params: {
    goalId: string;
    autoCompound: boolean;
    autoRebalance: boolean;
    compoundIntervalDays: number;
    rebalanceThresholdBps: number;
    minCompoundAmount: number;
  }) => {
    write.writeContract({
      address: CONTRACTS.VyoRouter,
      abi: VYOROUTER_ABI,
      functionName: 'setAutomationConfig',
      args: [
        params.goalId as `0x${string}`,
        params.autoCompound,
        params.autoRebalance,
        params.compoundIntervalDays,
        params.rebalanceThresholdBps,
        parseUSDC(params.minCompoundAmount),
      ],
    } as any);
  };

  return { 
    setConfig, 
    hash: write.data, 
    isPending: write.isPending, 
    error: write.error 
  };
}

export function useApproveUSDC(): any {
  const write: any = useWriteContract();
  
  const approve = (amount: number) => {
    write.writeContract({
      address: CONTRACTS.USDC,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [CONTRACTS.VyoRouter, parseUSDC(amount)],
    } as any);
  };

  return { 
    approve, 
    hash: write.data, 
    isPending: write.isPending, 
    error: write.error 
  };
}

export function useCompoundYield(): any {
  const write: any = useWriteContract();
  
  const compound = (goalId: string) => {
    write.writeContract({
      address: CONTRACTS.VyoRouter,
      abi: VYOROUTER_ABI,
      functionName: 'compoundYield',
      args: [goalId as `0x${string}`],
    } as any);
  };

  return { 
    compound, 
    hash: write.data, 
    isPending: write.isPending, 
    error: write.error 
  };
}

// ============================================================
// Transaction Receipt
// ============================================================

export function useTransactionReceipt(hash?: string) {
  const result = useWaitForTransactionReceipt({
    hash: hash as `0x${string}`,
    query: { enabled: !!hash },
  });

  return {
    receipt: result.data,
    isLoading: result.isLoading,
    isSuccess: result.isSuccess,
    isError: result.isError,
    error: result.error,
  };
}

// ============================================================
// Combined Flow Hooks
// ============================================================

export function useDepositFlow() {
  const { address } = useAccount();
  const { allowance } = useUSDCAllowance(address);
  const { approve, hash: approveHash, isPending: isApprovePending } = useApproveUSDC();
  const { deposit, hash: depositHash, isPending: isDepositPending } = useBatchDeposit();
  
  const { receipt: approveReceipt } = useTransactionReceipt(approveHash as string);
  const { receipt: depositReceipt } = useTransactionReceipt(depositHash as string);

  const needsApproval = Number(allowance) < 10000;

  const depositWithApproval = (params: {
    goalId: string;
    vaults: string[];
    amounts: number[];
    totalAmount: number;
  }) => {
    if (needsApproval) {
      approve(params.totalAmount);
    }
    deposit(params);
  };

  return {
    depositWithApproval,
    needsApproval,
    approve,
    deposit,
    isPending: isApprovePending || isDepositPending,
    approveHash,
    depositHash,
    approveReceipt,
    depositReceipt,
    isSuccess: depositReceipt?.status === 'success',
  };
}
