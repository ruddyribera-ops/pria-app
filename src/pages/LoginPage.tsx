import { useState } from 'react';
import LoginForm from '../components/Auth/LoginForm';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (username: string, password: string) => {
    try {
      await login(username, password);
      navigate('/materiales');
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Error de conexión');
    }
  };

  return <LoginForm onLogin={handleLogin} error={error} />;
}