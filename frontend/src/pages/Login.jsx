import React, { useState } from 'react';
import {
  Box, Card, CardContent, TextField, Button,
  Typography, Alert, CircularProgress, InputAdornment, IconButton
} from '@mui/material';
import { Visibility, VisibilityOff, Warehouse } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';

export default function Login({ onLogin }) {
  const { login, finishNewPassword } = useAuth();

  const [email,       setEmail]       = useState('');
  const [password,    setPassword]    = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPass,    setShowPass]    = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');
  const [challenge,   setChallenge]   = useState(null); // holds cognitoUser on first login

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const result = await login(email, password);
      if (result.challengeName === 'NEW_PASSWORD_REQUIRED') {
        setChallenge(result.cognitoUser);
      } else {
        onLogin();
      }
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleNewPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await finishNewPassword(challenge, newPassword);
      onLogin();
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', bgcolor: 'grey.100'
    }}>
      <Card elevation={4} sx={{ width: 400, borderRadius: 3 }}>
        <CardContent sx={{ p: 4 }}>

          {/* Logo / Title */}
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Warehouse sx={{ fontSize: 48, color: 'primary.main' }} />
            <Typography variant="h5" fontWeight={700} mt={1}>Inventory Management</Typography>
            <Typography variant="body2" color="text.secondary">Construction Materials System</Typography>
          </Box>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          {/* New password required screen */}
          {challenge ? (
            <Box component="form" onSubmit={handleNewPassword} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Alert severity="info">First login — please set a new password.</Alert>
              <TextField
                label="New Password" type={showPass ? 'text' : 'password'}
                value={newPassword} onChange={e => setNewPassword(e.target.value)}
                fullWidth required
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPass(s => !s)} edge="end">
                        {showPass ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
              <Button type="submit" variant="contained" size="large" fullWidth disabled={loading}>
                {loading ? <CircularProgress size={24} /> : 'Set Password & Login'}
              </Button>
            </Box>
          ) : (
            /* Normal login screen */
            <Box component="form" onSubmit={handleLogin} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="Email" type="email"
                value={email} onChange={e => setEmail(e.target.value)}
                fullWidth required autoFocus
              />
              <TextField
                label="Password" type={showPass ? 'text' : 'password'}
                value={password} onChange={e => setPassword(e.target.value)}
                fullWidth required
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPass(s => !s)} edge="end">
                        {showPass ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
              <Button type="submit" variant="contained" size="large" fullWidth disabled={loading}>
                {loading ? <CircularProgress size={24} /> : 'Login'}
              </Button>
            </Box>
          )}

          {/* Role hint */}
          <Box sx={{ mt: 3, p: 1.5, bgcolor: 'grey.50', borderRadius: 2 }}>
            <Typography variant="caption" color="text.secondary" display="block" mb={0.5} fontWeight={600}>Test accounts:</Typography>
            <Typography variant="caption" color="text.secondary" display="block">admin@example.com — Admin</Typography>
            <Typography variant="caption" color="text.secondary" display="block">ramesh@example.com — Warehouse Manager</Typography>
            <Typography variant="caption" color="text.secondary" display="block">priya@example.com — Procurement Officer</Typography>
            <Typography variant="caption" color="text.secondary" display="block">swetaranijena.sr@gmail.com — Site Engineer</Typography>
            <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>Default password: Temp1234 (you'll be asked to change it)</Typography>
          </Box>

        </CardContent>
      </Card>
    </Box>
  );
}