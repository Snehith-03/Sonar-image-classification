import React, { useState } from "react";
import Sonar from "./Sonar"; 
import Login from "./Login";

function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [username, setUsername] = useState("");

  const handleLogin = (user) => {
    setUsername(user);
    setLoggedIn(true);
  };

  return (
    <div>
      {!loggedIn ? (
        <Login onLogin={handleLogin} />
      ) : (
        <Sonar username={username} />
      )}
    </div>
  );
}

export default App;