import React, { createContext, useContext, useState } from 'react';
import { login as cognitoLogin, completeNewPassword, logout as cognitoLogout, getStoredAuth } from '../services/auth';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [auth, setAuth] = useState(() => getStoredAuth());

  const login = async (email, password) => {
    const result = await cognitoLogin(email, password);

    // First-time login challenge
    if (result.challengeName === 'NEW_PASSWORD_REQUIRED') {
      return result; // caller handles the new password screen
    }

    localStorage.setItem('auth', JSON.stringify(result));
    setAuth(result);
    return result;
  };

  const finishNewPassword = async (cognitoUser, newPassword) => {
    const result = await completeNewPassword(cognitoUser, newPassword);
    localStorage.setItem('auth', JSON.stringify(result));
    setAuth(result);
    return result;
  };

  const logout = () => {
    cognitoLogout();
    setAuth(null);
  };

  return (
    <AuthContext.Provider value={{ auth, login, finishNewPassword, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);