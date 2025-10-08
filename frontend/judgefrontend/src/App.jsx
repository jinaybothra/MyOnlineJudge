import React from "react";
import LoginPage from "./assets/LoginPage";
import CodeArena from "./assets/CodeArena";

function App() {
  const handleLogin = (user) => {
    console.log("Logged in user:", user);
  };
  return (
    <>
      <LoginPage onLogin={handleLogin} />
      
    </>
  );
}

export default App;
