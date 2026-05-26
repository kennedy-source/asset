type DesktopApiRequest = {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
};

export async function desktopApiJson<T = unknown>(
  request: DesktopApiRequest | string,
  init?: Omit<DesktopApiRequest, "url">,
): Promise<T> {
  const normalized: DesktopApiRequest =
    typeof request === "string" ? { url: request, ...(init ?? {}) } : request;
  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8080";
  const url = normalized.url.startsWith("http")
    ? normalized.url
    : `${apiUrl}${normalized.url}`;
  const token = localStorage.getItem("pajoy_token");
  const headers = {
    ...(normalized.body != null ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(normalized.headers ?? {}),
  };
  const body =
    typeof normalized.body === "string" || normalized.body == null
      ? normalized.body
      : JSON.stringify(normalized.body);

  if (window.api?.apiRequest) {
    return window.api.apiRequest({
      url,
      method: normalized.method ?? "GET",
      headers,
      body,
    }) as Promise<T>;
  }

  const response = await fetch(url, {
    method: normalized.method ?? "GET",
    headers,
    body,
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json() as Promise<T>;
}
