import React, { useState } from "react";
import { Link } from "react-router-dom";

const API = import.meta.env.VITE_API_URL || "http://localhost:3333";

export default function RecuperarSenha() {
  const [email, setEmail] = useState("");
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState<string|null>(null);
  const [loading, setLoading] = useState(false);
  const [link, setLink] = useState<string | null>(null); // exibe no modo console

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setOk(false); setLink(null);
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/password/recover`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Falha ao enviar");
      setOk(true);
      if (data.link) setLink(data.link); // MAIL_MODE=console => mostra link clicável
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-shell">
      <div className="auth-card" role="main" aria-labelledby="title">
        <div className="logo-spacer" />
        <h1 id="title" className="brand">KOGMA</h1>
        <div className="subtitle">RECUPERAR / CADASTRAR SENHA</div>

        <form className="form" onSubmit={onSubmit}>
          {ok && <div className="alert alert-success">Se o e-mail estiver cadastrado, você receberá um link para definir a senha.</div>}
          {err && <div className="alert alert-error">{err}</div>}

          <input
            className="input"
            type="email"
            placeholder="E-mail cadastrado"
            value={email}
            onChange={e=>setEmail(e.target.value)}
            required
          />

          <button className="button" disabled={loading}>
            {loading ? "Enviando..." : "Enviar"}
          </button>

          {link && (
            <div className="helper" style={{marginTop:12}}>
              <b>Link (modo console):</b> <a href={link}>Abrir</a>
            </div>
          )}

          <div className="row-links" style={{marginTop:14}}>
            <Link to="/auth/login">Voltar ao login</Link>
          </div>
        </form>
      </div>
    </main>
  );
}
