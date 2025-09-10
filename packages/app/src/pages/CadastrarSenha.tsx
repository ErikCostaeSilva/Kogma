import React, { useState } from "react";
import { Link } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";

export default function CadastrarSenha() {
  const [email, setEmail] = useState("");
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setLoading(true);
    try {
      const res = await fetch("http://localhost:3333/auth/password/initiate", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ email })
      });
      if(!res.ok) throw new Error((await res.json()).message || "Falha ao enviar");
      setOk(true);
    } catch (e:any) {
      setErr(e.message);
    } finally { setLoading(false); }
  }

  return (
    <AuthLayout title="KOGMA" subtitle="CADASTRAR SENHA">
      <form className="form" onSubmit={onSubmit}>
        {ok && <div className="success">Se o e-mail estiver cadastrado, você receberá instruções para criar sua senha.</div>}
        {err && <div className="error">{err}</div>}
        <input className="input" type="email" placeholder="E-mail cadastrado" value={email} onChange={e=>setEmail(e.target.value)} required />
        <button className="button" disabled={loading}>{loading?"Enviando...":"Enviar"}</button>
        <div className="helper">Caso seu e-mail não esteja cadastrado solicite a um administrador que inclua o acesso no sistema.</div>
        <div className="row-links" style={{marginTop:14}}>
          <Link to="/auth/login">Voltar ao login</Link>
        </div>
      </form>
    </AuthLayout>
  );
}
