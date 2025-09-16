import { createBrowserRouter } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";
import AppLayout from "./layouts/AppLayout";

import Login from "./pages/Login";
import RecuperarSenha from "./pages/RecuperarSenha";
import DefinirSenha from "./pages/DefinirSenha";

import Pedidos from "./pages/Pedidos";
import Clientes from "./pages/Clientes";
import Checklist from "./pages/Checklist";
import Admin from "./pages/Admin";

export const router = createBrowserRouter([
  { path: "/auth/login", element: <Login /> },
  { path: "/auth/recuperar-senha", element: <RecuperarSenha /> },
  { path: "/auth/cadastrar-senha", element: <RecuperarSenha /> },
  { path: "/auth/definir-senha", element: <DefinirSenha /> },

  {
    path: "/",
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Pedidos /> },
      { path: "clientes", element: <Clientes /> },
      { path: "checklist", element: <Checklist /> },
      {
        path: "admin",
        element: (
          <AdminRoute>
            <Admin />
          </AdminRoute>
        ),
      },
    ],
  },

  { path: "*", element: <Login /> },
]);
