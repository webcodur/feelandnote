// PostgREST HTTP protocol. Each builder owns its request; writes are never retried.
export class Query {
  constructor(client, path, method = 'GET', body) {
    this.client = client;
    this.url = new URL(`${client.url}/rest/v1/${path}`);
    this.method = method;
    this.body = body;
    this.headers = new Headers(client.headers);
    this.preferences = new Map();
  }
  prefer(name, value) { this.preferences.set(name, value); return this; }
  select(columns = '*', options = {}) {
    // Remove formatting whitespace, preserving quoted column names.
    this.url.searchParams.set('select', columns.replace(/"[^"]*"|\s+/g, match => match.startsWith('"') ? match : ''));
    if (this.method === 'GET' && options.head) this.method = 'HEAD';
    if (options.count) this.prefer('count', options.count);
    if (!['GET', 'HEAD'].includes(this.method)) this.prefer('return', 'representation');
    return this;
  }
  insert(values, options = {}) { return this.write('POST', values, options); }
  update(values, options = {}) { return this.write('PATCH', values, options); }
  delete(options = {}) { return this.write('DELETE', undefined, options); }
  upsert(values, options = {}) {
    this.write('POST', values, options);
    this.prefer('resolution', options.ignoreDuplicates ? 'ignore-duplicates' : 'merge-duplicates');
    if (options.onConflict) this.url.searchParams.set('on_conflict', options.onConflict);
    return this;
  }
  write(method, values, options) {
    this.method = method;
    this.body = values;
    if (options.count) this.prefer('count', options.count);
    if (options.defaultToNull === false) this.prefer('missing', 'default');
    if (Array.isArray(values)) {
      const columns = [...new Set(values.flatMap(value => Object.keys(value)))];
      if (columns.length) this.url.searchParams.set('columns', columns.map(column => `"${column}"`).join(','));
    }
    return this;
  }
  filter(column, operator, value) { this.url.searchParams.append(column, `${operator}.${value}`); return this; }
  eq(column, value) { return this.filter(column, 'eq', value); }
  neq(column, value) { return this.filter(column, 'neq', value); }
  gt(column, value) { return this.filter(column, 'gt', value); }
  gte(column, value) { return this.filter(column, 'gte', value); }
  lt(column, value) { return this.filter(column, 'lt', value); }
  lte(column, value) { return this.filter(column, 'lte', value); }
  like(column, value) { return this.filter(column, 'like', value); }
  ilike(column, value) { return this.filter(column, 'ilike', value); }
  is(column, value) { return this.filter(column, 'is', value); }
  not(column, operator, value) { return this.filter(column, `not.${operator}`, value); }
  in(column, values) {
    const escaped = [...new Set(values)].map(value => {
      if (typeof value !== 'string') return String(value);
      return /[,()"\\]/.test(value) ? `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"` : value;
    });
    return this.filter(column, 'in', `(${escaped.join(',')})`);
  }
  match(values) { for (const [key, value] of Object.entries(values)) this.eq(key, value); return this; }
  or(filters, options = {}) {
    this.url.searchParams.append(options.referencedTable || options.foreignTable ? `${options.referencedTable || options.foreignTable}.or` : 'or', `(${filters})`);
    return this;
  }
  contains(column, value) { return this.filter(column, 'cs', Array.isArray(value) ? `{${value.join(',')}}` : JSON.stringify(value)); }
  order(column, options = {}) {
    const table = options.referencedTable || options.foreignTable;
    const key = table ? `${table}.order` : 'order';
    const order = `${column}.${options.ascending === false ? 'desc' : 'asc'}${options.nullsFirst === undefined ? '' : options.nullsFirst ? '.nullsfirst' : '.nullslast'}`;
    const previous = this.url.searchParams.get(key);
    this.url.searchParams.set(key, previous ? `${previous},${order}` : order);
    return this;
  }
  limit(count, options = {}) { this.url.searchParams.set(options.referencedTable || options.foreignTable ? `${options.referencedTable || options.foreignTable}.limit` : 'limit', String(count)); return this; }
  range(from, to, options = {}) {
    const table = options.referencedTable || options.foreignTable;
    this.url.searchParams.set(table ? `${table}.offset` : 'offset', String(from));
    return this.limit(to - from + 1, options);
  }
  single() { this.cardinality = 'one'; this.headers.set('Accept', 'application/vnd.pgrst.object+json'); return this; }
  maybeSingle() { this.cardinality = 'optional'; return this; }
  abortSignal(signal) { this.signal = signal; return this; }
  returns() { return this; }
  overrideTypes() { return this; }
  throwOnError() { this.shouldThrow = true; return this; }
  then(resolve, reject) { return this.execute().then(resolve, reject); }
  async execute() {
    try {
      const headers = new Headers(this.headers);
      const token = await this.client.auth.accessToken();
      headers.set('apikey', this.client.key);
      if (!headers.has('Authorization')) headers.set('Authorization', `Bearer ${token || this.client.key}`);
      if (this.preferences.size) headers.set('Prefer', [...this.preferences].map(([key, value]) => `${key}=${value}`).join(','));
      if (this.body !== undefined) headers.set('Content-Type', 'application/json');
      const response = await this.client.fetch(this.url.toString(), {
        method: this.method, headers, body: this.body === undefined ? undefined : JSON.stringify(this.body),
        signal: this.signal,
      });
      const text = this.method === 'HEAD' ? '' : await response.text();
      let data = null;
      if (text) { try { data = JSON.parse(text); } catch { data = text; } }
      const total = response.headers.get('content-range')?.split('/')[1];
      const count = total && total !== '*' ? Number(total) : null;
      let error = null;
      let status = response.status;
      let statusText = response.statusText;
      if (!response.ok) {
        error = data && typeof data === 'object' ? data : { message: String(data || response.statusText), code: '', details: '', hint: '' };
        data = null;
      } else if (this.cardinality === 'optional' && Array.isArray(data)) {
        if (data.length > 1) {
          error = { code: 'PGRST116', message: 'Cannot coerce the result to a single JSON object', details: `The result contains ${data.length} rows`, hint: null };
          data = null; status = 406; statusText = 'Not Acceptable';
        } else data = data[0] ?? null;
      }
      // A write with optional cardinality can use the singular media type in a caller's headers.
      if (this.cardinality === 'optional' && error?.code === 'PGRST116' && /(?:contains|contain) 0 rows/.test(error.details || '')) {
        error = null; status = 200; statusText = 'OK';
      }
      if (error && this.shouldThrow) throw Object.assign(new Error(error.message), error);
      return { success: !error, data, error, count: error ? null : count, status, statusText };
    } catch (cause) {
      if (this.shouldThrow) throw cause;
      return { success: false, data: null, error: { message: `${cause.name || 'Error'}: ${cause.message || cause}`, code: '', details: '', hint: '' }, count: null, status: 0, statusText: '' };
    }
  }
}
