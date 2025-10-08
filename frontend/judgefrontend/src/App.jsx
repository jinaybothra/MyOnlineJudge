import React from "react";
import LoginPage from "./LoginPage";

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
