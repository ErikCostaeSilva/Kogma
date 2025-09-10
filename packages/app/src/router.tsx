import { createBrowserRouter } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import RecuperarSenha from "./pages/RecuperarSenha";
import DefinirSenha from "./pages/DefinirSenha";

export const router = createBrowserRouter([
  { path: "/", element: <Home /> },
  { path: "/auth/login", element: <Login /> },

  // 👇 Unificado: as duas entram na mesma tela
  { path: "/auth/recuperar-senha", element: <RecuperarSenha /> },
  { path: "/auth/cadastrar-senha", element: <RecuperarSenha /> }, // alias

  { path: "/auth/definir-senha", element: <DefinirSenha /> },
  { path: "*", element: <Login /> }
]);