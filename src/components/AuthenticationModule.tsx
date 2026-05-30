import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Mock da API de autenticação que retorna uma Promise.
 * Simula um atraso de 1 segundo.
 */
const mockAuthAPI = (username: string, password: string): Promise<boolean> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      if (username === 'admin' && password === 'admin123') {
        resolve(true);
      } else {
        resolve(false);
      }
    }, 1000);
  });
};

const AuthenticationModule: React.FC = () => {
  // Estado Local (React Hooks)
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  
  // Estado para validação
  const [validationErrors, setValidationErrors] = useState({
    username: '',
    password: '',
  });

  const navigate = useNavigate();

  // Validação dos campos
  const validate = (): boolean => {
    const errors = { username: '', password: '' };
    let isValid = true;

    if (!username.trim()) {
      errors.username = 'O campo Usuário é obrigatório.';
      isValid = false;
    }

    if (!password.trim()) {
      errors.password = 'O campo Senha é obrigatório.';
      isValid = false;
    }

    setValidationErrors(errors);
    return isValid;
  };

  // Lógica de Autenticação
  const authenticateUser = useCallback(async (u: string, p: string) => {
    setIsLoading(true);
    setError('');
    
    try {
      const success = await mockAuthAPI(u, p);
      if (success) {
        // Sucesso: Redireciona para o dashboard
        navigate('/dashboard');
      } else {
        // Falha: Exibe mensagem de erro
        setError('Usuário ou senha inválidos. Tente novamente.');
      }
    } catch (err) {
      setError('Ocorreu um erro inesperado. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      authenticateUser(username, password);
    }
  };

  return (
    <div style={{ 
      padding: '2rem', 
      maxWidth: '400px', 
      margin: '2rem auto', 
      border: '1px solid #e2e8f0', 
      borderRadius: '0.75rem',
      backgroundColor: '#ffffff',
      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
      fontFamily: 'sans-serif'
    }}>
      <h2 style={{ marginBottom: '1.5rem', textAlign: 'center', color: '#1a202c' }}>
        Autenticação
      </h2>
      
      <form onSubmit={handleSubmit} noValidate>
        <div style={{ marginBottom: '1.25rem' }}>
          <label 
            htmlFor="username" 
            style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600, color: '#4a5568' }}
          >
            Usuário
          </label>
          <input
            type="text"
            id="username"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              if (validationErrors.username) setValidationErrors(prev => ({ ...prev, username: '' }));
            }}
            disabled={isLoading}
            placeholder="Digite seu usuário"
            style={{ 
              width: '100%', 
              padding: '0.75rem', 
              borderRadius: '0.375rem', 
              border: `1px solid ${validationErrors.username ? '#e53e3e' : '#cbd5e0'}`,
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
          {validationErrors.username && (
            <p style={{ color: '#e53e3e', fontSize: '0.75rem', marginTop: '0.25rem' }}>
              {validationErrors.username}
            </p>
          )}
        </div>
        
        <div style={{ marginBottom: '1.5rem' }}>
          <label 
            htmlFor="password" 
            style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600, color: '#4a5568' }}
          >
            Senha
          </label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (validationErrors.password) setValidationErrors(prev => ({ ...prev, password: '' }));
            }}
            disabled={isLoading}
            placeholder="Digite sua senha"
            style={{ 
              width: '100%', 
              padding: '0.75rem', 
              borderRadius: '0.375rem', 
              border: `1px solid ${validationErrors.password ? '#e53e3e' : '#cbd5e0'}`,
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
          {validationErrors.password && (
            <p style={{ color: '#e53e3e', fontSize: '0.75rem', marginTop: '0.25rem' }}>
              {validationErrors.password}
            </p>
          )}
        </div>

        <button 
          type="submit" 
          disabled={isLoading}
          style={{ 
            width: '100%', 
            padding: '0.75rem', 
            backgroundColor: isLoading ? '#a0aec0' : '#3182ce', 
            color: '#ffffff', 
            border: 'none', 
            borderRadius: '0.375rem', 
            fontWeight: 600,
            cursor: isLoading ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.2s'
          }}
        >
          {isLoading ? 'Autenticando...' : 'Entrar'}
        </button>

        {error && (
          <p style={{ 
            color: '#e53e3e', 
            fontSize: '0.875rem', 
            marginTop: '1rem', 
            textAlign: 'center',
            padding: '0.5rem',
            backgroundColor: '#fff5f5',
            borderRadius: '0.25rem',
            border: '1px solid #feb2b2'
          }}>
            {error}
          </p>
        )}
      </form>
    </div>
  );
};

export default AuthenticationModule;
