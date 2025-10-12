import { supabase } from "./supabase";
import { web3Enable, web3Accounts } from "@polkadot/extension-dapp";
import { Logger } from "../utils/logger";
import { SecurityMonitor } from "../utils/security";
import { validateEmail, validatePassword } from "../utils/validation";

export interface AuthError {
  code: string;
  message: string;
  details?: Record<string, any>;
  severity: "low" | "medium" | "high";
}

export interface AuthResponse {
  success: boolean;
  data?: any;
  error?: AuthError;
}

export interface SessionData {
  userId: string;
  walletAddress?: string;
  authMethod: "wallet" | "email" | "metamask";
  expiresAt: number;
}

export interface LogoutOptions {
  clearAll: boolean;
  force: boolean;
  keepWalletConnection?: boolean;
}

class AuthService {
  private static instance: AuthService;
  private securityMonitor: SecurityMonitor;
  private rateLimitAttempts: Map<string, number> = new Map();
  private readonly MAX_LOGIN_ATTEMPTS = 5;
  private readonly LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

  private constructor() {
    this.securityMonitor = SecurityMonitor.getInstance();
  }

  static getInstance(): AuthService {
    if (!this.instance) {
      this.instance = new AuthService();
    }
    return this.instance;
  }

  async loginWithEmail(email: string, password: string): Promise<AuthResponse> {
    try {
      // Rate limiting check
      if (this.isRateLimited(email)) {
        return {
          success: false,
          error: {
            code: "RATE_LIMITED",
            message: "Too many login attempts. Please try again later.",
            severity: "medium",
          },
        };
      }

      // Validate input
      if (!validateEmail(email) || !validatePassword(password)) {
        return {
          success: false,
          error: {
            code: "INVALID_INPUT",
            message: "Invalid email or password format",
            severity: "low",
          },
        };
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Reset rate limiting on successful login
      this.resetRateLimiting(email);

      return {
        success: true,
        data,
      };
    } catch (error) {
      this.incrementLoginAttempts(email);
      Logger.error("Login failed", { error, email });
      return this.handleAuthError(error);
    }
  }

  async loginWithPolkadot(): Promise<AuthResponse> {
    try {
      const extensions = await web3Enable("Give Protocol");
      if (extensions.length === 0) {
        return {
          success: false,
          error: {
            code: "NO_WALLET",
            message: "No Polkadot wallet extension found",
            severity: "medium",
          },
        };
      }

      const accounts = await web3Accounts();
      if (accounts.length === 0) {
        return {
          success: false,
          error: {
            code: "NO_ACCOUNTS",
            message: "No accounts found in wallet",
            severity: "medium",
          },
        };
      }

      // Here we would typically verify the wallet signature
      // and create/authenticate a user account

      return {
        success: true,
        data: {
          address: accounts[0].address,
          type: "polkadot",
        },
      };
    } catch (error) {
      Logger.error("Polkadot login failed", { error });
      return this.handleAuthError(error);
    }
  }

  async loginWithMetaMask(): Promise<AuthResponse> {
    try {
      if (!window.ethereum) {
        return {
          success: false,
          error: {
            code: "NO_METAMASK",
            message: "MetaMask not installed",
            severity: "medium",
          },
        };
      }

      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      if (!accounts || accounts.length === 0) {
        return {
          success: false,
          error: {
            code: "NO_ACCOUNTS",
            message: "No accounts found in MetaMask",
            severity: "medium",
          },
        };
      }

      // Here we would typically verify the wallet signature
      // and create/authenticate a user account

      return {
        success: true,
        data: {
          address: accounts[0],
          type: "metamask",
        },
      };
    } catch (error) {
      Logger.error("MetaMask login failed", { error });
      return this.handleAuthError(error);
    }
  }

  async logout(
    options: LogoutOptions = { clearAll: true, force: false },
  ): Promise<AuthResponse> {
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
      Logger.error("Logout failed", { error });
      return this.handleAuthError(error);
    }
  }

  async resetPassword(email: string): Promise<AuthResponse> {
    try {
      if (!validateEmail(email)) {
        return {
          success: false,
          error: {
            code: "INVALID_EMAIL",
            message: "Invalid email format",
            severity: "low",
          },
        };
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      return { success: true };
    } catch (error) {
      Logger.error("Password reset failed", { error });
      return this.handleAuthError(error);
    }
  }

  async updatePassword(newPassword: string): Promise<AuthResponse> {
    try {
      if (!validatePassword(newPassword)) {
        return {
          success: false,
          error: {
            code: "INVALID_PASSWORD",
            message: "Password does not meet requirements",
            severity: "medium",
          },
        };
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      return { success: true };
    } catch (error) {
      Logger.error("Password update failed", { error });
      return this.handleAuthError(error);
    }
  }

  private handleAuthError(error: any): AuthResponse {
    const authError: AuthError = {
      code: error.code || "UNKNOWN_ERROR",
      message: error.message || "An unexpected error occurred",
      severity: "medium",
      details: error,
    };

    // Log suspicious activities
    if (this.isSuspiciousError(error)) {
      this.securityMonitor.logSuspiciousActivity(authError.code, {
        message: authError.message,
        timestamp: new Date().toISOString(),
      });
    }

    return {
      success: false,
      error: authError,
    };
  }

  private isRateLimited(identifier: string): boolean {
    const attempts = this.rateLimitAttempts.get(identifier) || 0;
    return attempts >= this.MAX_LOGIN_ATTEMPTS;
  }

  private incrementLoginAttempts(identifier: string): void {
    const attempts = (this.rateLimitAttempts.get(identifier) || 0) + 1;
    this.rateLimitAttempts.set(identifier, attempts);

    if (attempts >= this.MAX_LOGIN_ATTEMPTS) {
      setTimeout(
        () => this.resetRateLimiting(identifier),
        this.LOCKOUT_DURATION,
      );
    }
  }

  private resetRateLimiting(identifier: string): void {
    this.rateLimitAttempts.delete(identifier);
  }

  private isSuspiciousError(error: any): boolean {
    const suspiciousPatterns = [
      "invalid_signature",
      "invalid_nonce",
      "multiple_attempts",
      "invalid_token",
    ];
    return suspiciousPatterns.some(
      (pattern) =>
        error.code?.includes(pattern) || error.message?.includes(pattern),
    );
  }
}

export const authService = AuthService.getInstance();
