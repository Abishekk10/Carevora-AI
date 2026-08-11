import { createContext, useContext, useEffect, useState } from "react";

const UserContext = createContext(null);
const STORAGE_KEY = "jobpilot-current-user";
const TOKEN_KEY = "jobpilot-auth-token";

function loadUser() {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : null;
}

function loadToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function UserProvider({ children }) {
  const [user, setUserState] = useState(loadUser);
  const [token, setTokenState] = useState(loadToken);

  useEffect(() => {
    if (user) localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    else localStorage.removeItem(STORAGE_KEY);
  }, [user]);

  useEffect(() => {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  }, [token]);

  const setUser = (nextUser, nextToken) => {
    setUserState(nextUser);
    if (nextUser === null) {
      setTokenState(null);
    } else if (nextToken !== undefined) {
      setTokenState(nextToken);
    }
  };

  return <UserContext.Provider value={{ user, setUser }}>{children}</UserContext.Provider>;
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) throw new Error("useUser must be used within UserProvider.");
  return context;
}
