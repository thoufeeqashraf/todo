type Row = Record<string, unknown>;

type Filter =
  | { kind: 'eq'; column: string; value: unknown }
  | { kind: 'in'; column: string; value: unknown[] }
  | { kind: 'or'; raw: string }
  | { kind: 'gte'; column: string; value: unknown }
  | { kind: 'lte'; column: string; value: unknown };

type QueryState = {
  table: string;
  op: '' | 'select' | 'insert' | 'update' | 'delete';
  filters: Filter[];
  payload: unknown;
  columns?: string;
  head: boolean;
  order?: { column: string; ascending: boolean };
  limit?: number;
  range?: { from: number; to: number };
  single?: 'single' | 'maybe';
};

export type DbCall = { table: string; op: string; filters: Filter[] };

type DbError = { message: string; code?: string; details: null; hint: null } | null;

type DbResult = { data: unknown; error: DbError; count?: number | null };

const tables = new Map<string, Row[]>();
const calls: DbCall[] = [];
let configured = true;

function bucket(name: string) {
  let rows = tables.get(name);
  if (!rows) {
    rows = [];
    tables.set(name, rows);
  }
  return rows;
}

function matches(row: Row, filters: Filter[]) {
  return filters.every((filter) => {
    if (filter.kind === 'eq') return row[filter.column] === filter.value;
    if (filter.kind === 'in') return filter.value.includes(row[filter.column]);
    if (filter.kind === 'gte') return String(row[filter.column] ?? '') >= String(filter.value ?? '');
    if (filter.kind === 'lte') return String(row[filter.column] ?? '') <= String(filter.value ?? '');
    return filter.raw.split(',').some((part) => {
      const [column, op, value] = part.split('.');
      return op === 'eq' && column !== undefined && row[column] === value;
    });
  });
}

function paginate(rows: Row[], state: QueryState) {
  let next = rows;
  if (state.order) {
    const { column, ascending } = state.order;
    next = [...next].sort((left, right) => {
      const compared = String(left[column] ?? '').localeCompare(String(right[column] ?? ''));
      return ascending ? compared : -compared;
    });
  }
  if (state.range) next = next.slice(state.range.from, state.range.to + 1);
  if (state.limit !== undefined) next = next.slice(0, state.limit);
  return next;
}

function embed(rows: Row[], state: QueryState) {
  if (state.table !== 'users' || !state.columns?.includes('companies!')) return rows;
  const inner = state.columns.includes('!inner');
  return rows.flatMap((row) => {
    const company = bucket('companies').find((item) => item.id === row.company_id);
    if (inner && !company) return [];
    return [{
      ...row,
      companies: company ? { id: company.id, slug: company.slug, name: company.name } : null,
    }];
  });
}

function finish(rows: Row[], state: QueryState): DbResult {
  calls.push({ table: state.table, op: state.op || 'select', filters: state.filters.map((filter) => ({ ...filter })) });
  if (state.head) return { data: null, error: null, count: rows.length };
  if (state.single === 'single') {
    if (rows.length !== 1) {
      return {
        data: null,
        error: { message: 'JSON object requested, multiple (or no) rows returned', code: 'PGRST116', details: null, hint: null },
        count: rows.length,
      };
    }
    return { data: rows[0], error: null, count: 1 };
  }
  if (state.single === 'maybe') {
    if (rows.length > 1) {
      return { data: null, error: { message: 'multiple rows', code: 'PGRST116', details: null, hint: null }, count: rows.length };
    }
    return { data: rows[0] ?? null, error: null, count: rows.length };
  }
  return { data: rows, error: null, count: rows.length };
}

function run(state: QueryState): DbResult {
  if (state.op === 'insert') {
    const incoming = Array.isArray(state.payload) ? state.payload : [state.payload];
    const stored = incoming.map((item) => {
      const copy = { ...(item as Row) };
      if (typeof copy.id !== 'string') copy.id = crypto.randomUUID();
      if (state.table === 'users' && copy.is_active === undefined) copy.is_active = true;
      bucket(state.table).push(copy);
      return { ...copy };
    });
    return finish(stored, state);
  }
  if (state.op === 'update') {
    const stored = bucket(state.table).filter((row) => matches(row, state.filters));
    for (const row of stored) Object.assign(row, state.payload as Row);
    return finish(paginate(stored.map((row) => ({ ...row })), state), state);
  }
  if (state.op === 'delete') {
    const kept: Row[] = [];
    const removed: Row[] = [];
    for (const row of bucket(state.table)) {
      if (matches(row, state.filters)) removed.push(row);
      else kept.push(row);
    }
    tables.set(state.table, kept);
    return finish(removed.map((row) => ({ ...row })), state);
  }
  const selected = paginate(embed(bucket(state.table).filter((row) => matches(row, state.filters)).map((row) => ({ ...row })), state), state);
  if (state.head) {
    const counted = embed(bucket(state.table).filter((row) => matches(row, state.filters)).map((row) => ({ ...row })), state);
    return finish(counted, state);
  }
  return finish(selected, state);
}

function builder(table: string) {
  const state: QueryState = { table, op: '', filters: [], payload: undefined, head: false };
  const api = {
    select(columns?: string, options?: { head?: boolean; count?: string }) {
      state.columns = columns;
      state.head = Boolean(options?.head);
      if (!state.op) state.op = 'select';
      return api;
    },
    insert(payload: unknown) {
      state.op = 'insert';
      state.payload = payload;
      return api;
    },
    update(payload: unknown) {
      state.op = 'update';
      state.payload = payload;
      return api;
    },
    delete() {
      state.op = 'delete';
      return api;
    },
    eq(column: string, value: unknown) {
      state.filters.push({ kind: 'eq', column, value });
      return api;
    },
    in(column: string, value: unknown[]) {
      state.filters.push({ kind: 'in', column, value: Array.isArray(value) ? value : [] });
      return api;
    },
    or(raw: string) {
      state.filters.push({ kind: 'or', raw });
      return api;
    },
    gte(column: string, value: unknown) {
      state.filters.push({ kind: 'gte', column, value });
      return api;
    },
    lte(column: string, value: unknown) {
      state.filters.push({ kind: 'lte', column, value });
      return api;
    },
    order(column: string, options?: { ascending?: boolean }) {
      state.order = { column, ascending: options?.ascending !== false };
      return api;
    },
    limit(count: number) {
      state.limit = count;
      return api;
    },
    range(from: number, to: number) {
      state.range = { from, to };
      return api;
    },
    maybeSingle() {
      state.single = 'maybe';
      return Promise.resolve(run(state));
    },
    single() {
      state.single = 'single';
      return Promise.resolve(run(state));
    },
    then<T>(onFulfilled: (value: DbResult) => T | PromiseLike<T>, onRejected?: (reason: unknown) => T | PromiseLike<T>) {
      return Promise.resolve(run(state)).then(onFulfilled, onRejected);
    },
  };
  return api;
}

export function isSupabaseConfigured() {
  return configured;
}

export function setSupabaseConfigured(value: boolean) {
  configured = value;
}

export function resetSupabaseMock() {
  tables.clear();
  calls.length = 0;
  configured = true;
}

export function seed(table: string, rows: Row[]) {
  bucket(table).push(...rows.map((row) => ({ ...row })));
}

export function rows(table: string) {
  return bucket(table).map((row) => ({ ...row }));
}

export function recordedCalls() {
  return calls.map((call) => ({ ...call, filters: call.filters.map((filter) => ({ ...filter })) }));
}

export const supabaseAdmin = { from: (table: string) => builder(table) };
export const supabase = supabaseAdmin;
