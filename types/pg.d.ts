declare module "pg" { export class Pool { constructor(config?: unknown); query<T = Record<string, unknown>>(query: string, values?: unknown[]): Promise<{ rows: T[] }>; } }
