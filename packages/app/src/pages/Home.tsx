import React from "react";

export default function Home(){
  const name = JSON.parse(localStorage.getItem("auth:user") || "{}")?.name || "usuário";
  return (
    <div style={{color:"#fff",display:"grid",placeItems:"center",height:"100vh",background:"#264a7a"}}>
      <div>
        <h1>Bem-vindo, {name}!</h1>
        <p>Home/Dashboard placeholder. Ajuste depois.</p>
        <a href="/auth/login" style={{color:"#fff"}} onClick={()=>localStorage.clear()}>Sair</a>
      </div>
    </div>
  );
}
