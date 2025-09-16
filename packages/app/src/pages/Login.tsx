import React, { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import Flash from "../components/Flash";

const API = import.meta.env.VITE_API_URL || "http://localhost:3333";

export default function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) navigate("/", { replace: true });
  }, [navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    try {
      const res = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: senha })
      });

      const data = await res.json();

      if (!res.ok) {
        const msg = data?.message || "Não foi possível entrar. Verifique suas credenciais.";
        throw new Error(msg);
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user || null));

      sessionStorage.setItem(
        "flash",
        `Bem-vindo${data?.user?.name ? `, ${data.user.name}` : ""}!`
      );

      const dest = (location.state as any)?.from?.pathname || "/";
      navigate(dest, { replace: true });
    } catch (e: any) {
      if (e.message === "E-mail inválido" || e.message === "senha inválida") {
        setErr(e.message);
      } else {
        setErr("Não foi possível entrar. Verifique suas credenciais.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout title="KOGMA" subtitle="LOGIN">
      <Flash />

      <form className="form" onSubmit={onSubmit}>
        {err && <div className="error">{err}</div>}

        <input
          className="input"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="username"
        />

        <input
          className="input"
          type="password"
          placeholder="Senha"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          required
          autoComplete="current-password"
        />

        <button className="button" disabled={loading}>
          {loading ? "Entrando..." : "Entrar"}
        </button>

        <div className="row-links">
          <Link to="/auth/recuperar-senha">Cadastrar nova senha</Link>
          <Link to="/auth/recuperar-senha">Esqueci minha senha</Link>
        </div>
      </form>
    </AuthLayout>
  );
}
