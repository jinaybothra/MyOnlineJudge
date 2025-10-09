import React from "react";
import LoginPage from "./assets/LoginPage";
import CodeArena from "./assets/CodeArena";
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

function App() {
  const handleLogin = (user) => {
    console.log("Logged in user:", user);
  };

  const router = createBrowserRouter([
    {
      path: "/",
      element: <LoginPage onLogin={handleLogin}/>
    },
    {
      path: "/codearena",
      element: <CodeArena/>
    }
  ])
  return (
    <>
        <RouterProvider router={router}/>
    </>
  )
}

export default App;
