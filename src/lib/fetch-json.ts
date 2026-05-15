/** GET/POST com parse JSON seguro (evita crash se a API devolver HTML). */
export async function fetchJson<T = Record<string, unknown>>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<{ res: Response; data: T | null }> {
  const res = await fetch(input, init);
  const ct = res.headers.get('content-type') ?? '';
  if (!ct.includes('application/json')) {
    return { res, data: null };
  }
  try {
    const data = (await res.json()) as T;
    return { res, data };
  } catch {
    return { res, data: null };
  }
}
