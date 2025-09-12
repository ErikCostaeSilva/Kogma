import React, { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";

type User = { id: number; email: string; role: "admin" | "user"; name?: string };

function Modal({
  open, onClose, children, width = 560
}: { open: boolean; onClose: () => void; children: React.ReactNode; width?: number }) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card"
        style={{ width }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

export default function Admin() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  const [openAdd, setOpenAdd] = useState(false);
  const [openAdded, setOpenAdded] = useState(false);
  const [openConfirm, setOpenConfirm] = useState<null | number>(null); // id a excluir

  const [emailNew, setEmailNew] = useState("");
  const [roleNew, setRoleNew] = useState<"admin" | "user">("user");
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const r = await api("/admin/users");
      const d = await r.json();
      setUsers(d.users || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function addUser() {
    setErr(null);
    try {
      const r = await api("/admin/users", {
        method: "POST",
        body: JSON.stringify({ email: emailNew, role: roleNew }),
      });
      if (!r.ok) {
        const d = await r.json().catch(()=>null);
        throw new Error(d?.message || "Falha ao cadastrar");
      }
      setOpenAdd(false);
      setOpenAdded(true);
      setEmailNew("");
      setRoleNew("user");
      await load();
    } catch (e:any) {
      setErr(e.message);
    }
  }

  async function changeRole(id: number, role: "admin" | "user") {
    const r = await api(`/admin/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ role }),
    });
    if (r.ok) load();
  }

  async function deleteUser(id: number) {
    const r = await api(`/admin/users/${id}`, { method: "DELETE" });
    if (r.ok) {
      setOpenConfirm(null);
      await load();
    }
  }

  const rows = useMemo(() => users.map(u => (
    <div key={u.id} className="row">
      <div className="col-email">{u.email}</div>
      <div className="col-role">
        <select
          className="select"
          value={u.role}
          onChange={(e) => changeRole(u.id, e.target.value as any)}
        >
          <option value="admin">Admin</option>
          <option value="user">Usuário</option>
        </select>
        <button className="btn-icon" title="Excluir" onClick={() => setOpenConfirm(u.id)}>
          {/* ícone lixeira */}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>
      </div>
    </div>
  )), [users]);

  return (
    <div className="admin-wrap">
      <h1 className="admin-title">ADMINISTRAÇÃO DE ACESSOS</h1>

      <div className="card">
        <div className="card-header">
          <button className="btn-primary" onClick={() => setOpenAdd(true)}>Cadastrar e-mail</button>
        </div>

        <div className="table-head">
          <div>Email:</div>
          <div>Permissões:</div>
        </div>

        <div className="table-body">
          {loading ? <div className="helper">Carregando...</div> : rows}
        </div>
      </div>

      {/* Modal: adicionar usuário */}
      <Modal open={openAdd} onClose={() => setOpenAdd(false)} width={520}>
        <div className="modal-title">ADICIONAR USUÁRIO</div>
        <div className="modal-divider" />
        <div className="modal-form">
          {err && <div className="error" style={{marginBottom:10}}>{err}</div>}
          <label className="label">Email:</label>
          <input className="input light" type="email" value={emailNew} onChange={e=>setEmailNew(e.target.value)} placeholder="email@exemplo.com" />

          <label className="label" style={{marginTop:12}}>Permissão:</label>
          <select className="select light" value={roleNew} onChange={e=>setRoleNew(e.target.value as any)}>
            <option value="user">Usuário</option>
            <option value="admin">Admin</option>
          </select>

          <div className="modal-actions">
            <button className="btn-ghost" onClick={() => setOpenAdd(false)}>Cancelar</button>
            <button className="btn-primary" onClick={addUser}>Confirmar</button>
          </div>
        </div>
      </Modal>

      {/* Modal: sucesso */}
      <Modal open={openAdded} onClose={() => setOpenAdded(false)} width={560}>
        <div className="modal-title center">USUÁRIO ADICIONADO!</div>
        <div className="modal-divider" />
        <div className="modal-center">
          <div className="modal-text-strong">E-mail cadastrado no sistema!</div>
          <div className="modal-text-muted">Para prosseguir, o funcionário deve acessar a opção "Cadastrar nova senha" no Menu inicial.</div>
        </div>
        <div className="modal-actions center">
          <button className="btn-pill" onClick={() => setOpenAdded(false)}>Concluir</button>
        </div>
      </Modal>

      {/* Modal: confirmar exclusão */}
      <Modal open={openConfirm !== null} onClose={() => setOpenConfirm(null)} width={560}>
        <div className="modal-title center">EXCLUIR USUÁRIO?</div>
        <div className="modal-divider" />
        <div className="modal-center">
          <div className="modal-text-strong">Você tem certeza que deseja excluir este usuário?</div>
          <div className="modal-text-muted">Esta ação não poderá ser revertida.</div>
        </div>
        <div className="modal-actions">
          <button className="btn-ghost" onClick={() => setOpenConfirm(null)}>Cancelar</button>
          <button className="btn-primary" onClick={() => deleteUser(openConfirm as number)}>Confirmar</button>
        </div>
      </Modal>
    </div>
  );
}
