const { useState, useEffect } = React;

const RegisterForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) { setError('As senhas não coincidem!'); return; }
    if (password.length < 6) { setError('Senha deve ter pelo menos 6 caracteres!'); return; }
    if (!email.includes('@')) { setError('Email inválido!'); return; }

    const url = 'http://localhost:4000/api/users/register';
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();

      if (response.ok) {
        alert('✅ Conta criada! Faça login agora.');
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        showPage('login');
      } else {
        setError(data.error || 'Erro no cadastro.');
      }
    } catch (error) {
      setError('Erro de conexão. Backend rodando na porta 4000?');
    }
  };

  return (
    <div className="form-container">
      <h2>Criar Conta</h2>
      <form onSubmit={handleSubmit}>
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input type="password" placeholder="Senha" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <input type="password" placeholder="Confirme Senha" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
        {error && <div className="error">{error}</div>}
        <button type="submit">Criar Conta</button>
      </form>
      <p style={{textAlign: 'center', marginTop: '10px'}}><a href="#" onClick={(e) => {e.preventDefault(); showPage('login');}}>Já tem conta? Login</a></p>
    </div>
  );
};

const LoginForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.includes('@')) { setError('Email inválido!'); return; }
    if (password.length < 6) { setError('Senha deve ter pelo menos 6 caracteres!'); return; }

    const url = 'http://localhost:4000/api/users/login';
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();

      if (response.ok) {
        alert('✅ Login OK! Bem-vindo.');
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        showPage('despesas');
      } else {
        setError(data.error || 'Erro no login.');
      }
    } catch (error) {
      setError('Erro de conexão. Backend rodando na porta 4000?');
    }
  };

  return (
    <div className="form-container">
      <h2>Faça Login</h2>
      <form onSubmit={handleSubmit}>
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input type="password" placeholder="Senha" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {error && <div className="error">{error}</div>}
        <button type="submit">Entrar</button>
      </form>
      <p style={{textAlign: 'center', marginTop: '10px'}}><a href="#" onClick={(e) => {e.preventDefault(); showPage('register');}}>Não tem conta? Cadastre-se</a></p>
    </div>
  );
};

const DespesasPage = () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [despesas, setDespesas] = useState([]);

  useEffect(() => {
    setDespesas([
      { id: 1, descricao: 'Almoço em grupo', valor: 50, data: '2023-10-01' },
      { id: 2, descricao: 'Gasolina', valor: 100, data: '2023-10-02' }
    ]);
  }, []);

  const logout = () => {
    localStorage.clear();
    showPage('login');
  };

  return (
    <div className="despesas-list">
      <h2>Despesas - {user.email || 'Usuário'}</h2>
      <button className="logout-btn" onClick={logout}>Logout</button>
      <div>
        {despesas.map(d => (
          <div key={d.id} className="despesa-item">
            <strong>{d.descricao}</strong> - R$ {d.valor} - {d.data}
          </div>
        ))}
      </div>
      <p>Adicione mais despesas (crie form + POST para backend).</p>
    </div>
  );
};
