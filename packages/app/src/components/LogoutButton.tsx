import React from "react";
import { useNavigate } from "react-router-dom";

export default function LogoutButton() {
  const navigate = useNavigate();
  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    sessionStorage.setItem("flash", "Você saiu da sua conta.");
    navigate("/auth/login", { replace: true });
  }
  return (
    <button className="button" onClick={handleLogout}>
      Sair
    </button>
  );
}
