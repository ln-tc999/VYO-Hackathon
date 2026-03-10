import type { Request, Response, NextFunction } from 'express';
import { isAddress } from 'viem';

/**
 * Extended Express Request interface with user context
 */
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    walletAddress: string;
  };
}

/**
 * Wallet-based authentication middleware
 * Stateless - only validates wallet address from header
 * No JWT, no sessions, no database
 */
export function walletAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const walletAddress = req.headers['x-wallet-address'] as string;

  if (!walletAddress) {
    res.status(401).json({
      success: false,
      error: 'Wallet address required. Please connect your wallet.',
    });
    return;
  }

  // Validate Ethereum address format
  if (!isAddress(walletAddress)) {
    res.status(401).json({
      success: false,
      error: 'Invalid wallet address format.',
    });
    return;
  }

  // Set user context - use lowercase address as ID
  const normalizedAddress = walletAddress.toLowerCase();
  req.user = {
    id: normalizedAddress,
    walletAddress: normalizedAddress,
  };

  next();
}

/**
 * Optional wallet auth - doesn't require auth but sets user if present
 */
export function optionalWalletAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const walletAddress = req.headers['x-wallet-address'] as string;

  if (walletAddress && isAddress(walletAddress)) {
    const normalizedAddress = walletAddress.toLowerCase();
    req.user = {
      id: normalizedAddress,
      walletAddress: normalizedAddress,
    };
  }

  next();
}
