import { supabase } from './supabase';
import { web3Enable, web3Accounts } from '@polkadot/extension-dapp';
import { Logger } from '../utils/logger';
import { SecurityMonitor } from '../utils/security';
import { validateEmail, validatePassword } from '../utils/validation';

export interface AuthError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  severity: 'low' | 'medium' | 'high';
}

export interface AuthResponse {
  success: boolean;
  data?: unknown;
  error?: AuthError;
}

export interface SessionData {
  userId: string;
  walletAddress?: string;
  authMethod: 'wallet' | 'email' | 'metamask';
  expiresAt: number;
}

export interface LogoutOptions {
  clearAll: boolean;
  force: boolean;
  keepWalletConnection?: boolean;
}

/**
 * AuthService is a singleton service responsible for user authentication, 
 * managing login processes including email/password authentication, 
 * rate limiting, and security monitoring.
 */
class AuthService {
  private static instance: AuthService;
  private securityMonitor: SecurityMonitor;
  private rateLimitAttempts: Map<string, number> = new Map();
  private readonly MAX_LOGIN_ATTEMPTS = 5;
  private readonly LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

  private constructor() {
    this.securityMonitor = SecurityMonitor.getInstance();
  }

  /**
   * Gets the singleton instance of AuthService.
   * @returns {AuthService} The AuthService singleton instance.
   */
  static getInstance(): AuthService {
    if (!this.instance) {
      this.instance = new AuthService();
    }
    return this.instance;
  }

  /**
   * Logs in a user using email and password, with rate limiting and security monitoring.
   * @param {string} email - The user's email address.
   * @param {string} password - The user's password.
   * @returns {Promise<AuthResponse>} The authentication response indicating success or failure and relevant data or error.
   */
  async loginWithEmail(email: string, password: string): Promise<AuthResponse> {
    try {
      // Rate limiting check
      if (this.isRateLimited(email)) {
        return {
          success: false,
          error: {
            code: 'RATE_LIMITED',
            message: 'Too many login attempts. Please try again later.',
            severity: 'medium'
          }
        };
      }

      // Validate input
      if (!validateEmail(email) || !validatePassword(password)) {
        return {
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'Invalid email or password format',
            severity: 'low'
          }
        };
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      // Reset rate limiting on successful login
      this.resetRateLimiting(email);

      return {
        success: true,
        data
      };
    } catch (error) {
      this.incrementLoginAttempts(email);
      Logger.error('Login failed', { error, email });
      return this.handleAuthError(error);
    }
  }
}

  /**
   * Logs in the user using a Polkadot wallet extension. Enables the extension, retrieves available accounts,
   * and returns an AuthResponse indicating success or failure.
   * @returns {Promise<AuthResponse>} The authentication response object with success status, data or error details.
   */
  async loginWithPolkadot(): Promise<AuthResponse> {
    try {
      const extensions = await web3Enable('Give Protocol');
      if (extensions.length === 0) {
        return {
          success: false,
          error: {
            code: 'NO_WALLET',
            message: 'No Polkadot wallet extension found',
            severity: 'medium'
          }
        };
      }

      const accounts = await web3Accounts();
      if (accounts.length === 0) {
        return {
          success: false,
          error: {
            code: 'NO_ACCOUNTS',
            message: 'No accounts found in wallet',
            severity: 'medium'
          }
        };
      }

      // Here we would typically verify the wallet signature
      // and create/authenticate a user account

      return {
        success: true,
        data: {
          address: accounts[0].address,
          type: 'polkadot'
        }
      };
    } catch (error) {
      Logger.error('Polkadot login failed', { error });
      return this.handleAuthError(error);
    }
  }

  /**
   * Logs in the user with MetaMask by requesting account access from the browser wallet.
   * @returns {Promise<AuthResponse>} The authentication response, containing success status and data or error details.
   */
  async loginWithMetaMask(): Promise<AuthResponse> {
    try {
      if (!window.ethereum) {
        return {
          success: false,
          error: {
            code: 'NO_METAMASK',
            message: 'MetaMask not installed',
            severity: 'medium'
          }
        };
      }

      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      if (!accounts || accounts.length === 0) {
        return {
          success: false,
          error: {
            code: 'NO_ACCOUNTS',
            message: 'No accounts found in MetaMask',
            severity: 'medium'
          }
        };
      }

      // Here we would typically verify the wallet signature
      // and create/authenticate a user account

      return {
        success: true,
        data: {
          address: accounts[0],
          type: 'metamask'
        }
      };
    } catch (error) {
      Logger.error('MetaMask login failed', { error });
      return this.handleAuthError(error);
    }
  }

  /**
   * Logs out the current user through Supabase authentication.
   *
   * @param {LogoutOptions} options - Options for logout behavior.
   * @param {boolean} options.clearAll - Whether to clear localStorage and sessionStorage. Defaults to true.
   * @param {boolean} options.force - Whether to force logout. Defaults to false.
   * @param {boolean} [options.keepWalletConnection] - Whether to keep the wallet connection alive.
   * @returns {Promise<AuthResponse>} A promise resolving to an AuthResponse indicating success or error handling.
   */
  async logout(options: LogoutOptions = { clearAll: true, force: false }): Promise<AuthResponse> {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      if (options.clearAll) {
        localStorage.clear();
        sessionStorage.clear();
      }

      if (!options.keepWalletConnection) {
        // Disconnect wallets if connected
        // Implementation depends on wallet type
      }

      return { success: true };
    } catch (error) {
      Logger.error('Logout failed', { error });
      return this.handleAuthError(error);
    }
  }

  /**
   * Resets the password for the given email by sending a password reset link.
   * @param email - The email address of the user requesting the password reset.
   * @returns A promise that resolves to an AuthResponse indicating success or failure.
   */
  async resetPassword(email: string): Promise<AuthResponse> {
    try {
      if (!validateEmail(email)) {
        return {
          success: false,
          error: {
            code: 'INVALID_EMAIL',
            message: 'Invalid email format',
            severity: 'low'
          }
        };
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) throw error;

      return { success: true };
    } catch (error) {
      Logger.error('Password reset failed', { error });
      return this.handleAuthError(error);
    }
  }

  /**
   * Updates the user's password if it meets the validation requirements.
   * @param newPassword - The new password string to set for the user.
   * @returns A promise that resolves to an AuthResponse indicating success or containing error details.
   */
  async updatePassword(newPassword: string): Promise<AuthResponse> {
    try {
      if (!validatePassword(newPassword)) {
        return {
          success: false,
          error: {
            code: 'INVALID_PASSWORD',
            message: 'Password does not meet requirements',
            severity: 'medium'
          }
        };
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      return { success: true };
    } catch (error) {
      Logger.error('Password update failed', { error });
      return this.handleAuthError(error);
    }
  }

  /**
   * Handles authentication errors by converting them into a standardized AuthResponse.
   * If the error is deemed suspicious, logs the activity via SecurityMonitor.
   * @param error The error object to handle.
   * @returns An AuthResponse indicating failure with error details.
   */
  private handleAuthError(error: unknown): AuthResponse {
    const err = error as Record<string, unknown> | null;
    const authError: AuthError = {
      code: (err?.code as string) || 'UNKNOWN_ERROR',
      message: (err?.message as string) || 'An unexpected error occurred',
      severity: 'medium',
      details: err ? { code: err.code, message: err.message } : undefined
    };

    // Log suspicious activities
    if (AuthService.isSuspiciousError(error)) {
      this.securityMonitor.logSuspiciousActivity(authError.code, {
        message: authError.message,
        timestamp: new Date().toISOString()
      });
    }

    return {
      success: false,
      error: authError
    };
  }

  /**
   * Checks if the given identifier has reached the maximum number of login attempts.
   * @param identifier - The unique identifier (e.g., username or IP) to check rate limit for.
   * @returns True if the number of attempts is greater than or equal to the maximum allowed; otherwise, false.
   */
  private isRateLimited(identifier: string): boolean {
    const attempts = this.rateLimitAttempts.get(identifier) || 0;
    return attempts >= this.MAX_LOGIN_ATTEMPTS;
  }

  /**
   * Increments the login attempt count for the given identifier and triggers a lockout if the maximum is reached.
   * @param identifier The unique identifier for the user (e.g., username or IP address).
   */
  private incrementLoginAttempts(identifier: string): void {
    const attempts = (this.rateLimitAttempts.get(identifier) || 0) + 1;
    this.rateLimitAttempts.set(identifier, attempts);

    if (attempts >= this.MAX_LOGIN_ATTEMPTS) {
      setTimeout(() => this.resetRateLimiting(identifier), this.LOCKOUT_DURATION);
    }
  }

  /**
   * Resets the rate limiting attempts for a given identifier.
   *
   * @param identifier - The unique identifier for which to reset rate limiting.
   * @returns void
   */
  private resetRateLimiting(identifier: string): void {
    this.rateLimitAttempts.delete(identifier);
  }

  /**
   * Determines whether an error object is suspicious based on known error patterns.
   * @param error - The error object to inspect, which may contain code or message properties.
   * @returns True if the error's code or message includes any suspicious pattern; otherwise, false.
   */
  private static isSuspiciousError(error: unknown): boolean {
    const err = error as Record<string, string | undefined> | null;
    const suspiciousPatterns = [
      'invalid_signature',
      'invalid_nonce',
      'multiple_attempts',
      'invalid_token'
    ];
    return suspiciousPatterns.some(pattern =>
      err?.code?.includes(pattern) || err?.message?.includes(pattern)
    );
  }
}

export const authService = AuthService.getInstance();