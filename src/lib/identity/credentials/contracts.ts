export interface PasswordVerificationResult {
  readonly verified:
    boolean;

  readonly needsRehash:
    boolean;
}

export interface PasswordHasher {
  hashPassword(
    password: string,
  ): Promise<string>;

  verifyPassword(
    password: string,
    encodedHash: string,
  ): Promise<PasswordVerificationResult>;
}
