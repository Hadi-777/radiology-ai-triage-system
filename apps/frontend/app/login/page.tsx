'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (
    e: React.FormEvent,
  ) => {
    e.preventDefault();

    setError('');

    try {
      const response = await fetch(
        'http://localhost:3000/auth/login',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username,
            password,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || 'Login failed',
        );
      }

      localStorage.setItem(
        'user',
        JSON.stringify(data.user),
      );

      router.push('/');
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: '#0f172a',
      }}
    >
      <form
        onSubmit={handleLogin}
        style={{
          background: '#1e293b',
          padding: '30px',
          borderRadius: '12px',
          width: '350px',
          color: 'white',
        }}
      >
        <h1
          style={{
            marginBottom: '20px',
            textAlign: 'center',
          }}
        >
          Radiology Login
        </h1>

        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) =>
            setUsername(e.target.value)
          }
          style={{
            width: '100%',
            padding: '12px',
            marginBottom: '15px',
          }}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) =>
            setPassword(e.target.value)
          }
          style={{
            width: '100%',
            padding: '12px',
            marginBottom: '15px',
          }}
        />

        {error && (
          <p style={{ color: 'red' }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          style={{
            width: '100%',
            padding: '12px',
            background: '#2563eb',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Login
        </button>

        
      </form>
    </div>
  );
}

