import React from "react";
import LoginPage from "./assets/LoginPage";
import CodeArena from "./assets/CodeArena";
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import RegisterPage from "./assets/RegisterPage";
import ProblemList from "./assets/ProblemList";

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
      path: "/problemlist", 
      element: <ProblemList/>
    },
    {
      path: "/codearena/:slug" ,
      element: <CodeArena />
    },
    {
      path: "/register",
      element: <RegisterPage/>
    }

  ])
  return (
    <>
        <RouterProvider router={router}/>
    </>
  )
}

export default App;
