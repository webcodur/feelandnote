import type { JWTPayload } from 'jose';

export interface PostgrestError { message: string; details: string; hint: string; code: string }
export type QueryResult<T> = { success: true; data: T; error: null; count: number | null; status: number; statusText: string } | { success: false; data: null; error: PostgrestError; count: null; status: number; statusText: string };
export interface User { id: string; email?: string; aud: string; created_at: string; app_metadata: Record<string, any>; user_metadata: Record<string, any>; [key: string]: any }
export interface Session { access_token: string; refresh_token: string; expires_at: number; expires_in: number; token_type: string; user: User }
export type EmailOtpType = 'signup' | 'invite' | 'magiclink' | 'recovery' | 'email_change' | 'email';
export interface AuthError { message: string; name?: string; status?: number; code?: string }
type AuthResult<T> = Promise<{ data: T; error: AuthError | null }>;
type SessionResult = AuthResult<{ user: User | null; session: Session | null }>;
type SignInResult = Promise<{ data: { user: User; session: Session }; error: null } | { data: { user: null; session: null }; error: AuthError }>;
export interface AuthClient {
  getUser(jwt?: string): AuthResult<{ user: User | null }>;
  getSession(): AuthResult<{ session: Session | null }>;
  getClaims(jwt?: string): AuthResult<{ claims: JWTPayload & { sub: string } } | null>;
  signInWithPassword(credentials: { email: string; password: string }): SignInResult;
  signUp(credentials: { email: string; password: string; options?: { emailRedirectTo?: string; data?: Record<string, unknown> } }): SessionResult;
  signInWithOAuth(credentials: { provider: string; options?: { redirectTo?: string; scopes?: string; skipBrowserRedirect?: boolean; queryParams?: Record<string, string> } }): AuthResult<{ provider: string; url: string }>;
  exchangeCodeForSession(code: string): SessionResult;
  verifyOtp(params: { token_hash: string; type: EmailOtpType }): SessionResult;
  resetPasswordForEmail(email: string, options?: { redirectTo?: string }): AuthResult<unknown>;
  updateUser(attributes: Record<string, unknown>): AuthResult<{ user: User | null }>;
  signOut(options?: { scope?: 'global' | 'local' | 'others' }): Promise<{ error: AuthError | null }>;
  admin: { updateUserById(id: string, attributes: Record<string, unknown>): AuthResult<{ user: User | null }> };
}
export interface CookieOptions { path?: string; maxAge?: number; sameSite?: 'lax' | 'strict' | 'none' | boolean; secure?: boolean; httpOnly?: boolean; domain?: string }
export interface CookieMethodsServer {
  getAll(): { name: string; value: string }[] | Promise<{ name: string; value: string }[]>;
  setAll(cookies: { name: string; value: string; options: CookieOptions }[], headers: Record<string, string>): void | Promise<void>;
}
export interface ClientOptions {
  global?: { fetch?: typeof fetch; headers?: Record<string, string> };
  auth?: { autoRefreshToken?: boolean; persistSession?: boolean; detectSessionInUrl?: boolean; storageKey?: string; storage?: { getItem(key: string): string | null | Promise<string | null>; setItem(key: string, value: string): void | Promise<void>; removeItem(key: string): void | Promise<void> } };
  cookies?: CookieMethodsServer;
  cookieOptions?: CookieOptions;
  isSingleton?: boolean;
}
type CountOptions = { count?: 'exact' | 'planned' | 'estimated' };
type TableOptions = { foreignTable?: string; referencedTable?: string };
type RowValue = Record<string, any>;
type IsAny<T> = 0 extends (1 & T) ? true : false;
type Trim<S extends string> = S extends ` ${infer R}` | `\n${infer R}` | `\t${infer R}` | `\r${infer R}` ? Trim<R> : S extends `${infer R} ` | `${infer R}\n` | `${infer R}\t` | `${infer R}\r` ? Trim<R> : S;
type SplitState = [unknown[], string, string[]];
type SplitStep<C extends string, T extends SplitState> = C extends '(' ? [[...T[0], 0], `${T[1]}${C}`, T[2]] : C extends ')' ? [T[0] extends [...infer D, unknown] ? D : [], `${T[1]}${C}`, T[2]] : C extends ',' ? T[0] extends [] ? [[], '', [...T[2], T[1]]] : [T[0], `${T[1]}${C}`, T[2]] : [T[0], `${T[1]}${C}`, T[2]];
type SplitFields<S extends string, T extends SplitState = [[], '', []]> = S extends `${infer A}${infer B}${infer Rest}` ? SplitFields<Rest, SplitStep<B, SplitStep<A, T>>> : S extends `${infer A}` ? [...SplitStep<A, T>[2], SplitStep<A, T>[1]] : [...T[2], T[1]];
type StripHint<S extends string> = S extends `${infer N}!${string}` ? N : S;
type FieldName<S extends string> = Trim<S> extends `${infer Alias}:${string}` ? Trim<Alias> : StripHint<Trim<S>>;
type FieldShape<R, S extends string> = S extends unknown ? Trim<S> extends '*' ? R : Trim<S> extends `${infer Name}(${infer Inner})` ? { [K in FieldName<Name>]: Projection<any, Inner>[] } : { [K in FieldName<S>]: IsAny<R> extends true ? any : K extends keyof R ? R[K] : unknown } : never;
type Intersect<U> = (U extends unknown ? (value: U) => void : never) extends (value: infer I) => void ? I : never;
type Projection<R, S extends string> = string extends S ? R : Intersect<FieldShape<R, SplitFields<S>[number]>>;
export interface Query<Row = any, Result = Row[]> extends PromiseLike<QueryResult<Result>> {
  select<S extends string = '*'>(columns?: S, options?: CountOptions & { head?: boolean }): Query<Row, Projection<Row, S>[]>;
  insert(values: Partial<Row> | Partial<Row>[], options?: CountOptions & { defaultToNull?: boolean }): Query<Row, null>;
  update(values: Partial<Row>, options?: CountOptions): Query<Row, null>;
  delete(options?: CountOptions): Query<Row, null>;
  upsert(values: Partial<Row> | Partial<Row>[], options?: CountOptions & { defaultToNull?: boolean; onConflict?: string; ignoreDuplicates?: boolean }): Query<Row, null>;
  eq(column: string, value: unknown): this;
  neq(column: string, value: unknown): this;
  gt(column: string, value: unknown): this;
  gte(column: string, value: unknown): this;
  lt(column: string, value: unknown): this;
  lte(column: string, value: unknown): this;
  like(column: string, value: string): this;
  ilike(column: string, value: string): this;
  is(column: string, value: null | boolean): this;
  not(column: string, operator: string, value: unknown): this;
  in(column: string, values: readonly unknown[]): this;
  filter(column: string, operator: string, value: unknown): this;
  match(values: Record<string, unknown>): this;
  or(filters: string, options?: TableOptions): this;
  contains(column: string, value: unknown): this;
  order(column: string, options?: TableOptions & { ascending?: boolean; nullsFirst?: boolean }): this;
  limit(count: number, options?: TableOptions): this;
  range(from: number, to: number, options?: TableOptions): this;
  single<T = Result extends (infer R)[] ? R : Result>(): Query<Row, T>;
  maybeSingle<T = Result extends (infer R)[] ? R : Result>(): Query<Row, T | null>;
  abortSignal(signal: AbortSignal): this;
  returns<T>(): Query<Row, T>;
  overrideTypes<T, Options = unknown>(): Query<Row, T>;
  throwOnError(): this;
}
type Tables<D> = IsAny<D> extends true ? Record<string, { Row: any }> : D extends { public: { Tables: infer T; Views: infer V } } ? T & V : Record<string, { Row: any }>;
type RowOf<T> = T extends { Row: infer R } ? R : RowValue;
export class DatabaseClient<Database = any> {
  constructor(url: string, key: string, options?: ClientOptions);
  auth: AuthClient;
  from<T extends Extract<keyof Tables<Database>, string>>(table: T): Query<RowOf<Tables<Database>[T]>>;
  rpc(name: string, args?: Record<string, unknown>, options?: CountOptions & { get?: boolean; head?: boolean }): Query<RowValue, any>;
}
export function createClient<Database = any>(url: string, key: string, options?: ClientOptions): DatabaseClient<Database>;
export function createServerClient<Database = any>(url: string, key: string, options: ClientOptions & { cookies: CookieMethodsServer }): DatabaseClient<Database>;
export function createBrowserClient<Database = any>(url: string, key: string, options?: ClientOptions): DatabaseClient<Database>;
