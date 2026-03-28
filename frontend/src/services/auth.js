import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
} from 'amazon-cognito-identity-js';

const POOL_DATA = {
  UserPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
  ClientId:   import.meta.env.VITE_COGNITO_CLIENT_ID,
};

const pool = new CognitoUserPool(POOL_DATA);

// ── Login ────────────────────────────────────────────────────
export const login = (email, password) =>
  new Promise((resolve, reject) => {
    const user    = new CognitoUser({ Username: email, Pool: pool });
    const details = new AuthenticationDetails({ Username: email, Password: password });

    user.authenticateUser(details, {
      onSuccess: (session) => {
        const payload = session.getIdToken().decodePayload();
        resolve({
          token:       session.getIdToken().getJwtToken(),
          email:       payload.email,
          role:        payload['custom:role']        || 'site_engineer',
          warehouseId: payload['custom:warehouseId'] || null,
        });
      },
      onFailure: (err) => reject(err.message || 'Login failed'),

      // First login — user must set a new password
      newPasswordRequired: (_userAttributes, _requiredAttributes) => {
        resolve({ challengeName: 'NEW_PASSWORD_REQUIRED', cognitoUser: user });
      },
    });
  });

// ── Force new password (first login) ────────────────────────
export const completeNewPassword = (cognitoUser, newPassword) =>
  new Promise((resolve, reject) => {
    cognitoUser.completeNewPasswordChallenge(newPassword, {}, {
      onSuccess: (session) => {
        const payload = session.getIdToken().decodePayload();
        resolve({
          token:       session.getIdToken().getJwtToken(),
          email:       payload.email,
          role:        payload['custom:role']        || 'site_engineer',
          warehouseId: payload['custom:warehouseId'] || null,
        });
      },
      onFailure: (err) => reject(err.message || 'Password change failed'),
    });
  });

// ── Logout ───────────────────────────────────────────────────
export const logout = () => {
  const user = pool.getCurrentUser();
  if (user) user.signOut();
  localStorage.removeItem('auth');
};

// ── Get current session from localStorage ───────────────────
export const getStoredAuth = () => {
  try {
    return JSON.parse(localStorage.getItem('auth'));
  } catch {
    return null;
  }
};