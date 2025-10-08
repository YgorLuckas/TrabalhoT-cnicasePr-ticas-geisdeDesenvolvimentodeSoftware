import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';  // Link para voltar ao login

interface RegisterData {
  email: string;
  password: string;
  confirmPassword: string;
}

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');  // Limpa erro anterior

    if (!email || !password || !confirmPassword) {
      setError('Todos os campos são obrigatórios!');
      return;
    }
    if (password !== confirmPassword) {
      setError('As senhas não coincidem!');
      return;
    }
    if (password.length < 3) {
      setError('Senha deve ter pelo menos 3 caracteres!');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('http://localhost:4000/api/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (res.ok) {
        alert('✅ Conta criada com sucesso! Faça login agora.');
        navigate('/login', { replace: true });  // Redireciona para login
      } else {
        setError(data.error || 'Erro ao criar conta. Email já existe?');
      }
    } catch (error) {
      console.error('Erro de conexão:', error);
      setError('Erro de conexão com o servidor. Backend rodando?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="app-card max-w-md w-full">
        <h1 className="text-3xl font-bold text-center text-primary-600 mb-6">��� Cadastro SplitTrip</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="Email (ex: user@example.com)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="app-input"
            required
            disabled={loading}
          />
          <input
            type="password"
            placeholder="Senha (mín. 3 chars)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="app-input"
            required
            disabled={loading}
          />
          <input
            type="password"
            placeholder="Confirme a senha"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="app-input"
            required
            disabled={loading}
          />
          {error && (
            <p className="text-red-500 text-sm text-center bg-red-50 p-2 rounded-lg">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading || !email || !password || password !== confirmPassword}
            className="btn-primary w-full disabled:opacity-50"
          >
            {loading ? 'Criando conta...' : 'Criar Conta'}
          </button>
        </form>
        <p className="text-center text-gray-500 mt-4 text-sm">
          Já tem conta? <Link to="/login" className="text-primary-600 hover:underline font-medium">Faça login</Link>
        </p>
      </div>
    </div>
  );
}
