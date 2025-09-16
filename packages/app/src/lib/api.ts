const BASE = (import.meta.env.VITE_API_URL || "http://localhost:3333").replace(/\/$/, "");

function getToken() {
  return (
    localStorage.getItem("auth:token") ||
    localStorage.getItem("token") ||
    ""
  );
}

export async function api(path: string, opts: RequestInit = {}) {
  const url = `${BASE}${path.startsWith("/") ? path : `/${path}`}`;

  const headers = new Headers(opts.headers || {});
  const token = getToken();

  if (!headers.has("Accept")) headers.set("Accept", "application/json");
  const hasBody = typeof opts.body !== "undefined" && opts.body !== null;
  const isFormData =
    typeof FormData !== "undefined" && hasBody && opts.body instanceof FormData;

  if (hasBody && !isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(url, { ...opts, headers });

  if (res.status === 401) {

    localStorage.removeItem("auth:token");
    localStorage.removeItem("auth:user");
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    sessionStorage.setItem(
      "flash",
      "Sua sessão expirou ou você não está autenticado. Faça login novamente."
    );
    window.location.href = "/auth/login";
    throw new Error("Não autenticado");
  }

  if (res.status === 403) {
    sessionStorage.setItem("flash", "Acesso restrito a administradores.");
    window.location.href = "/";
    throw new Error("Acesso negado");
  }

  return res;
}
