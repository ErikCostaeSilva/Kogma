import React, { useEffect, useState } from "react";
import { api } from "../lib/api";

type Company = { id:number; name:string; cnpj:string|null };

function Modal({ open, onClose, children, width=640 }:{
  open:boolean; onClose:()=>void; children:React.ReactNode; width?:number
}) {
  if(!open) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" style={{width}} onClick={e=>e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

/** Formata progressivamente para 00.000.000/0000-00 */
function formatCNPJ(input: string) {
  const d = (input || "").replace(/\D/g, "").slice(0,14);
  const p1 = d.slice(0,2);
  const p2 = d.slice(2,5);
  const p3 = d.slice(5,8);
  const p4 = d.slice(8,12);
  const p5 = d.slice(12,14);
  let out = p1;
  if (d.length > 2) out += "." + p2;
  if (d.length > 5) out += "." + p3;
  if (d.length > 8) out += "/" + p4;
  if (d.length > 12) out += "-" + p5;
  return out;
}

export default function Clientes(){
  const [list,setList] = useState<Company[]>([]);
  const [loading,setLoading] = useState(false);

  const [open,setOpen] = useState(false);
  const [editId,setEditId] = useState<number|null>(null);
  const [name,setName] = useState("");
  const [cnpj,setCnpj] = useState("");
  const [err,setErr] = useState<string|null>(null);

  async function load(){
    setLoading(true);
    const r = await api("/companies"); const d = await r.json();
    setList(d.companies || []); setLoading(false);
  }
  useEffect(()=>{ load(); },[]);

  function openNew(){
    setEditId(null); setName(""); setCnpj(""); setErr(null); setOpen(true);
  }
  function openEdit(c:Company){
    setEditId(c.id);
    setName(c.name);
    setCnpj(c.cnpj ? formatCNPJ(c.cnpj) : "");
    setErr(null);
    setOpen(true);
  }

  function onCnpjChange(v: string){
    setCnpj(formatCNPJ(v));
  }

 function onlyDigits(v: string){ return (v || "").replace(/\D+/g, ""); }

async function save(){
  try{
    const body = JSON.stringify({ name, cnpj: onlyDigits(cnpj) });
    const r = await api(editId? `/companies/${editId}` : "/companies", {
      method: editId? "PATCH":"POST",
      body
    });
    if(!r.ok){
      const d = await r.json().catch(()=>null);
      throw new Error(d?.message || "Falha");
    }
    setOpen(false); await load();
  }catch(e:any){ setErr(e.message); }
}

  return (
    <div className="page-wrap">
      <h1 className="admin-title">CLIENTES</h1>

      <div className="card">
        <div className="card-header">
          <button className="btn-primary" onClick={openNew}>Cadastrar cliente</button>
        </div>

        <div className="table-head">
          <div>Cliente:</div>
          <div style={{textAlign:"right"}}>CNPJ:</div>
        </div>

        <div className="table-body">
          {loading? <div className="helper">Carregando...</div> : list.map(c=>(
            <div key={c.id} className="row" style={{gridTemplateColumns:"1fr 220px"}}>
              <div className="col-email">{c.name}</div>
              <div style={{display:"flex", gap:8, justifyContent:"flex-end", alignItems:"center"}}>
                <span style={{color:"#274a78", fontWeight:600}}>
                  {c.cnpj ? formatCNPJ(c.cnpj) : "-"}
                </span>
                <button className="btn-icon" title="Editar" onClick={()=>openEdit(c)}>
                  <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M15.7778 2L20 6.22222L5.22222 21H1V16.7778L15.7778 2Z" stroke="#314C7D" stroke-width="1.5" stroke-linecap="round"/>
                  <path d="M12 7L14.95 9.95" stroke="#314C7D" stroke-width="1.5" stroke-linecap="round"/>
                  </svg>

                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Modal open={open} onClose={()=>setOpen(false)}>
        <div className="modal-title center">{editId? "EDITAR CLIENTE":"NOVO CLIENTE"}</div>
        <div className="modal-divider" />
        {err && <div className="error" style={{marginBottom:12}}>{err}</div>}
        <div className="grid-2">
          <div>
            <label className="label">Empresa:</label>
            <input className="input light" value={name} onChange={e=>setName(e.target.value)} />
          </div>
          <div>
            <label className="label">CNPJ:</label>
            <input
              className="input light"
              value={cnpj}
              onChange={e=>onCnpjChange(e.target.value)}
              placeholder="00.000.000/0000-00"
              inputMode="numeric"
            />
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn-ghost" onClick={()=>setOpen(false)}>Cancelar</button>
          <button className="btn-primary" onClick={save}>{editId? "Atualizar":"Concluir"}</button>
        </div>
      </Modal>
    </div>
  );
}
