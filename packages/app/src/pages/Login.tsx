import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";

export default function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const navigate = useNavigate();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setLoading(true);
    try {
      // chama nosso backend stub
      const res = await fetch("http://localhost:3333/auth/login", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ email, password: senha })
      });
      if(!res.ok) throw new Error((await res.json()).message || "Erro ao entrar");
      const data = await res.json();
      localStorage.setItem("auth:token", data.token);
      localStorage.setItem("auth:user", JSON.stringify(data.user));
      navigate("/");
    } catch (e:any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout title="KOGMA" subtitle="LOGIN">
      <form className="form" onSubmit={onSubmit}>
        {err && <div className="error">{err}</div>}
        <input className="input" type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} required />
        <input className="input" type="password" placeholder="Senha" value={senha} onChange={e=>setSenha(e.target.value)} required />
        <button className="button" disabled={loading}>{loading?"Entrando...":"Entrar"}</button>
        <div className="row-links">
          <Link to="/auth/recuperar-senha">Cadastrar nova senha</Link>
          <Link to="/auth/recuperar-senha">Esqueci minha senha</Link>
        </div>
      </form>
    </AuthLayout>
  );
}
