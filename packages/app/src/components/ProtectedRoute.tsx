import React, { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";

export default function ProtectedRoute({ children }: { children: React.ReactElement }) {
  const token = localStorage.getItem("token");
  const location = useLocation();

  useEffect(() => {
    if (!token) {
      sessionStorage.setItem("flash", "Você precisa estar logado para acessar essa página.");
    }
  }, [token]);

  if (!token) {
    return <Navigate to="/auth/login" replace state={{ from: location }} />;
  }
  return children;
}