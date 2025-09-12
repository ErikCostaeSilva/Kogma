const API = import.meta.env.VITE_API_URL || "http://localhost:3333";

export async function api(path: string, opts: RequestInit = {}) {
  const token = localStorage.getItem("token");
  const headers = new Headers(opts.headers || {});
  if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${API}${path}`, { ...opts, headers });
  if (res.status === 401) {
    localStorage.removeItem("token");
    sessionStorage.setItem("flash", "Sua sessão expirou ou você não está autenticado. Faça login novamente.");
    window.location.href = "/auth/login";
    throw new Error("Não autenticado");
  }
  return res;
}
