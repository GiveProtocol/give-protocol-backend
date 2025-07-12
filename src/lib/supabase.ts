import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase';
import { ENV } from '@/config/env';
import { Logger } from '@/utils/logger';

// Check for required environment variables
if (!ENV.SUPABASE_URL || !ENV.SUPABASE_ANON_KEY) {
  Logger.error('Missing Supabase configuration', {
    url: ENV.SUPABASE_URL ? 'defined' : 'undefined',
    key: ENV.SUPABASE_ANON_KEY ? 'defined' : 'undefined'
  });
  throw new Error('Missing Supabase configuration');
}

// Ensure URL is properly formatted
const supabaseUrl = ENV.SUPABASE_URL.endsWith('/')
  ? ENV.SUPABASE_URL.slice(0, -1)
  : ENV.SUPABASE_URL;

// Auth configuration
const authConfig = {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
    storageKey: 'give-protocol-auth',
    flowType: 'pkce',
    debug: import.meta.env.DEV,
    // OTP settings
    otpExpiryTime: 900, // 15 minutes in seconds
  }
};

export const supabase = createClient<Database>(
  supabaseUrl,
  ENV.SUPABASE_ANON_KEY,
  authConfig
);

// Add error handling and retry logic
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT') {
    // Clear any cached data
    window.localStorage.removeItem('give-protocol-auth');
  }

  if (event === 'TOKEN_REFRESHED') {
    Logger.info('Auth token refreshed successfully');
  }

  if (event === 'USER_UPDATED') {
    Logger.info('User profile updated');
  }
});

// Create a helper function for error handling
export const handleSupabaseError = (error: any) => {
  if (error?.message?.includes('JWT')) {
    Logger.warn('JWT token expired or invalid', { error });
    // Handle token expiration
    window.location.href = '/login';
    return;
  }

  if (error?.message?.includes('Failed to fetch')) {
    Logger.error('Network error occurred', { error });
    // Handle network errors
    return new Error('Network error. Please check your connection and try again.');
  }

  if (error?.message?.includes('AuthRetryableFetchError')) {
    Logger.warn('Retryable auth error occurred', { error });
    // These errors are automatically retried by Supabase
    return;
  }

  Logger.error('Supabase error occurred', { error });
  throw error;
};

// Create a wrapper function for RPC calls with retry logic
export const supabaseRpcWithRetry = async (fn: string, params?: any) => {
  const maxRetries = 3;
  const retryDelay = 1000; // 1 second
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const { data, error } = await supabase.rpc(fn, params);
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      if (attempt === maxRetries) {
        return { data: null, error };
      }
      
      Logger.warn(`RPC request failed, attempt ${attempt} of ${maxRetries}`, { error, fn });
      await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
    }
  }
  
  return { data: null, error: new Error('Max retries exceeded') };
};

export default supabase;