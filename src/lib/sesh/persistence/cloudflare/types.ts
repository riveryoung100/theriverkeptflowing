export interface SeshD1RunResultLike {
  readonly success?: boolean;

  readonly meta?: {
    readonly changes?: number;
  };
}

export interface SeshD1AllResultLike<T> {
  readonly results: readonly T[];
}

export interface SeshD1PreparedStatementLike {
  bind(...values: readonly unknown[]): SeshD1PreparedStatementLike;

  first<T = Record<string, unknown>>(): Promise<T | null>;

  all<T = Record<string, unknown>>(): Promise<SeshD1AllResultLike<T>>;

  run(): Promise<SeshD1RunResultLike>;
}

export interface SeshD1DatabaseLike {
  prepare(sql: string): SeshD1PreparedStatementLike;
}

export interface SeshR2ObjectLike {
  arrayBuffer(): Promise<ArrayBuffer>;
}

export interface SeshR2BucketLike {
  put(
    key: string,
    value: Uint8Array,
  ): Promise<unknown>;

  get(
    key: string,
  ): Promise<SeshR2ObjectLike | null>;

  delete(
    key: string,
  ): Promise<void>;

  head(
    key: string,
  ): Promise<unknown | null>;
}
