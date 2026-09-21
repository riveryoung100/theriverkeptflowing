export interface IdentityD1RunResultLike {
  readonly success?: boolean;
}

export interface IdentityD1PreparedStatementLike {
  bind(
    ...values: unknown[]
  ): IdentityD1PreparedStatementLike;

  first<T = Record<string, unknown>>():
    Promise<T | null>;

  run():
    Promise<IdentityD1RunResultLike>;
}

export interface IdentityD1DatabaseLike {
  prepare(
    sql: string,
  ): IdentityD1PreparedStatementLike;
}
