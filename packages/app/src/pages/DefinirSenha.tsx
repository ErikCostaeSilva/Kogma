import React, { useMemo, useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";

const API = import.meta.env.VITE_API_URL || "http://localhost:3333";

export default function DefinirSenhaPage() {
  const [sp] = useSearchParams();
  const token = useMemo(() => sp.get("token") || "", [sp]);
  const [senha, setSenha] = useState("");
  const [conf, setConf] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const navigate = useNavigate();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!token) return setErr("Token ausente. Refaça o processo de recuperação.");
    if (senha.length < 6) return setErr("A nova senha deve ter pelo menos 6 caracteres.");
    if (senha !== conf) return setErr("As senhas não conferem.");

    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/password/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: senha })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Falha ao redefinir senha");
      setOk(true);
      setTimeout(() => navigate("/auth/login"), 1200);
    } catch (e: any) {
      setErr(e.message);
    } finally { setLoading(false); }
  }

  return (
    <main className="auth-shell">
      <div className="auth-card" role="main" aria-labelledby="title">
        <div className="logo-spacer" />
        <h1 id="title" className="brand">KOGMA</h1>
        <div className="subtitle">DEFINIR SENHA</div>

        <form className="form" onSubmit={onSubmit}>
          {ok && <div className="success">Senha alterada com sucesso! Redirecionando...</div>}
          {err && <div className="error">{err}</div>}
          <input className="input" type="password" placeholder="Nova senha"
                 value={senha} onChange={e=>setSenha(e.target.value)} required />
          <input className="input" type="password" placeholder="Confirmar nova senha"
                 value={conf} onChange={e=>setConf(e.target.value)} required />
          <button className="button" disabled={loading}>{loading ? "Salvando..." : "Salvar nova senha"}</button>
          <div className="row-links" style={{marginTop:14}}>
            <Link to="/auth/login">Voltar ao login</Link>
          </div>
        </form>
      </div>
    </main>
  );
}
