import React, { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";

type Role = "admin" | "user";
type Status = "active" | "inactive";
type User = { id: number; email: string; role: Role; status: Status; name?: string };

function Modal({
  open, onClose, children, width = 650
}: { open: boolean; onClose: () => void; children: React.ReactNode; width?: number }) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" style={{ width }} onClick={(e) => e.stopPropagation()}>
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
  const [confirmDisableId, setConfirmDisableId] = useState<null | number>(null);
  const [pendingStatus, setPendingStatus] = useState<"" | "inactive">("");

  const [emailNew, setEmailNew] = useState("");
  const [roleNew, setRoleNew] = useState<Role>("user");
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
        const d = await r.json().catch(() => null);
        throw new Error(d?.message || "Falha ao cadastrar");
      }
      setOpenAdd(false);
      setOpenAdded(true);
      setEmailNew("");
      setRoleNew("user");
      await load();
    } catch (e: any) {
      setErr(e.message);
    }
  }

  async function changeRole(id: number, role: Role) {
    try {
      const r = await api(`/admin/users/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ role }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => null);
        throw new Error(d?.message || "Falha ao alterar permissão");
      }
      await load();
    } catch (e: any) {
      alert(e.message || "Falha ao alterar permissão");
    }
  }

  async function setStatus(id: number, status: Status) {
    try {
      const r = await api(`/admin/users/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => null);
        throw new Error(d?.message || "Falha ao alterar status");
      }
      await load();
    } catch (e: any) {
      alert(e.message || "Falha ao alterar status");
    }
  }

  const rows = useMemo(() => users.map(u => (
    <div key={u.id} className="row">
      <div className="col-email">{u.email}</div>

      <div className="col-role">
        <select
          className="select"
          value={u.role}
          onChange={(e) => changeRole(u.id, e.target.value as Role)}
        >
          <option value="admin">Admin</option>
          <option value="user">Usuário</option>
        </select>
      </div>

      <div className="col-status">
        <select
          className="select"
          value={u.status}
          onChange={(e) => {
            const next = e.target.value as Status;
            if (u.status === "active" && next === "inactive") {
              setConfirmDisableId(u.id);
              setPendingStatus("inactive");
              return; 
            }
            setStatus(u.id, next);
          }}
        >
          <option value="active">Ativo</option>
          <option value="inactive">Inativo</option>
        </select>
      </div>
    </div>
  )), [users]);

  return (
    <div className="admin-wrap">
      <h1 className="admin-title">ADMINISTRAÇÃO DE ACESSOS</h1>

      <div className="card">
        <div className="card-header">
          <button className="btn-primary" onClick={() => setOpenAdd(true)}>
            Cadastrar e-mail
          </button>
        </div>

        <div className="table-head three">
          <div>Email:</div>
          <div>Permissões:</div>
          <div>Status:</div>
        </div>

        <div className="table-body adminTable">
          {loading ? <div className="helper">Carregando...</div> : rows}
        </div>
      </div>

      <Modal open={openAdd} onClose={() => setOpenAdd(false)} width={650}>
        <div className="modal-title">ADICIONAR USUÁRIO</div>
        <div className="modal-divider" />
        <div className="modal-form">
          {err && <div className="error" style={{ marginBottom: 10 }}>{err}</div>}

          <label className="label">Email:</label>
          <input
            className="input light"
            type="email"
            value={emailNew}
            onChange={(e) => setEmailNew(e.target.value)}
            placeholder="email@exemplo.com"
          />

          <label className="label" style={{ marginTop: 12 }}>Permissão:</label>
          <select
            className="select light"
            value={roleNew}
            onChange={(e) => setRoleNew(e.target.value as Role)}
          >
            <option value="user">Usuário</option>
            <option value="admin">Admin</option>
          </select>

          <div className="modal-actions">
            <button className="btn-ghost" onClick={() => setOpenAdd(false)}>Cancelar</button>
            <button className="btn-primary" onClick={addUser}>Confirmar</button>
          </div>
        </div>
      </Modal>

      <Modal open={openAdded} onClose={() => setOpenAdded(false)} width={560}>
        <div className="modal-title center">USUÁRIO ADICIONADO!</div>
        <div className="modal-divider" />
        <div className="modal-center">
          <div className="modal-text-strong">E-mail cadastrado no sistema!</div>
          <div className="modal-text-muted">
            Para prosseguir, o funcionário deve acessar a opção "Cadastrar nova senha" no Menu inicial.
          </div>
        </div>
        <div className="modal-actions center">
          <button className="btn-pill" onClick={() => setOpenAdded(false)}>Concluir</button>
        </div>
      </Modal>

      <Modal
        open={confirmDisableId !== null}
        onClose={() => { setConfirmDisableId(null); setPendingStatus(""); }}
        width={560}
      >
        <div className="modal-title center">DESABILITAR USUÁRIO?</div>
        <div className="modal-divider" />
        <div className="modal-center">
          <div className="modal-text-strong">Você tem certeza que deseja desabilitar este usuário?</div>
          <div className="modal-text-muted">Ele não poderá acessar o sistema até ser reativado.</div>
        </div>
        <div className="modal-actions">
          <button
            className="btn-ghost"
            onClick={() => { setConfirmDisableId(null); setPendingStatus(""); }}
          >
            Cancelar
          </button>
          <button
            className="btn-warning"
            onClick={async () => {
              if (confirmDisableId && pendingStatus === "inactive") {
                await setStatus(confirmDisableId, "inactive");
              }
              setConfirmDisableId(null);
              setPendingStatus("");
            }}
          >
            Confirmar
          </button>
        </div>
      </Modal>
    </div>
  );
}
