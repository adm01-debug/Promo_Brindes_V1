import type { Session, User } from '@supabase/supabase-js';
import { createContext, useContext } from 'react';

export interface CustomerAuthValue {
  configured: boolean;
  loading: boolean;
  session: Session | null;
  user: User | null;
  identityEpoch: number;
  claimHistory(): Promise<number>;
  signOut(): Promise<void>;
}

export const CustomerAuthContext = createContext<CustomerAuthValue | null>(null);

export function useCustomerAuth(): CustomerAuthValue {
  const value = useContext(CustomerAuthContext);
  if (!value) throw new Error('useCustomerAuth must be used inside CustomerAuthProvider');
  return value;
}
