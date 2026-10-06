import type { User } from '@supabase/supabase-js';
import { createContext, useContext } from 'react';

export interface CustomerAuthValue {
  configured: boolean;
  loading: boolean;
  initializationFailed: boolean;
  user: User | null;
  identityEpoch: number;
  retryInitialization(): void;
  claimHistory(): Promise<number>;
  signOut(): Promise<void>;
}

export const CustomerAuthContext = createContext<CustomerAuthValue | null>(null);

export function useCustomerAuth(): CustomerAuthValue {
  const value = useContext(CustomerAuthContext);
  if (!value) throw new Error('useCustomerAuth must be used inside CustomerAuthProvider');
  return value;
}
