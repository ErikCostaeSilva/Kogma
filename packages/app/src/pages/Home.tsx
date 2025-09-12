import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import LogoutButton from "../components/LogoutButton";

export default function Home() {
  const [me, setMe] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const r = await api("/auth/me");
      const data = await r.json();
      setMe(data.user);
    })();
  }, []);

  const name = JSON.parse(localStorage.getItem("auth:user") || "{}")?.name || "usuário";
  return (
    <div style={{color:"#fff",display:"grid",placeItems:"center",height:"100vh",background:"#264a7a"}}>
      <div>
        <h2>Bem-vindo{me ? `, ${me.name}` : ""}</h2>
        <p>Home/Dashboard</p>
         <LogoutButton />
      </div>
    </div>
  );
}
