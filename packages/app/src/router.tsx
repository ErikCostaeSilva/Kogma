import { createBrowserRouter } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import AppLayout from "./layouts/AppLayout"

import Login from "./pages/Login";
import RecuperarSenha from "./pages/RecuperarSenha";
import DefinirSenha from "./pages/DefinirSenha";

import Pedidos from "./pages/Pedidos";
import Clientes from "./pages/Clientes";
import Checklist from "./pages/Checklist";
import Admin from "./pages/Admin";


export const router = createBrowserRouter([
  // públicas
  { path: "/auth/login", element: <Login /> },
  { path: "/auth/recuperar-senha", element: <RecuperarSenha /> },
  { path: "/auth/cadastrar-senha", element: <RecuperarSenha /> }, // alias
  { path: "/auth/definir-senha", element: <DefinirSenha /> },

  // privadas (todas com o mesmo layout + menu)
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <AppLayout>
          <Pedidos />
        </AppLayout>
      </ProtectedRoute>
    )
  },
  {
    path: "/clientes",
    element: (
      <ProtectedRoute>
        <AppLayout>
          <Clientes />
        </AppLayout>
      </ProtectedRoute>
    )
  },
  {
    path: "/checklist",
    element: (
      <ProtectedRoute>
        <AppLayout>
          <Checklist />
        </AppLayout>
      </ProtectedRoute>
    )
  },
  {
    path: "/admin",
    element: (
      <ProtectedRoute>
        <AppLayout>
          <Admin />
        </AppLayout>
      </ProtectedRoute>
    )
  },

  { path: "*", element: <Login /> }
]);