import { useEffect, useMemo, useState } from 'react';
import './App.css';
import { api } from './services/api';

const initialForm = { id: '', password: '', ni: '' };

function App() {
  const [params, setParams] = useState(null);
  const [registerForm, setRegisterForm] = useState(initialForm);
  const [loginForm, setLoginForm] = useState(initialForm);
  const [passwordForm, setPasswordForm] = useState(initialForm);
  const [activeTab, setActiveTab] = useState('register');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.getParams().then(setParams).catch((err) => setError(err.message));
  }, []);

  const handleSubmit = async (action, payload) => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await action(payload);
      setResult(response);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const sessionKey = useMemo(() => result?.sessionKey, [result]);

  return (
    <div className="app">
      <header>
        <h1>Dual-Server  Authentication</h1>
      </header>
      <section className="params">
        <h2>System Parameters</h2>
        {params ? (
          <dl>
            <div>
              <dt>Curve</dt>
              <dd>{params.curve}</dd>
            </div>
            <div>
              <dt>Generator</dt>
              <dd>{params.generator.slice(0, 42)}...</dd>
            </div>
            <div>
              <dt>Public Keys</dt>
              <dd>Ppub1: {params.Ppub1.slice(0, 32)}... | Ppub2: {params.Ppub2.slice(0, 32)}...</dd>
            </div>
            <div>
              <dt>Paillier Modulus</dt>
              <dd>n: {params.paillier.n.slice(0, 32)}...</dd>
            </div>
          </dl>
        ) : (
          <p>Loading parameters...</p>
        )}
      </section>

      <nav className="tabs">
        <button type="button" className={activeTab === 'register' ? 'active' : ''} onClick={() => setActiveTab('register')}>
          Registration
        </button>
        <button type="button" className={activeTab === 'login' ? 'active' : ''} onClick={() => setActiveTab('login')}>
          Authentication
        </button>
        <button type="button" className={activeTab === 'password' ? 'active' : ''} onClick={() => setActiveTab('password')}>
          Password Change
        </button>
      </nav>

      <section className="panel">
        {activeTab === 'register' && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit(api.register, registerForm);
            }}
          >
            <h2>Algorithm 2 – Registration</h2>
            <FormFields state={registerForm} setState={setRegisterForm} />
            <button type="submit" disabled={loading}>
              {loading ? 'Registering...' : 'Register IoT Device'}
            </button>
          </form>
        )}

        {activeTab === 'login' && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit(api.login, loginForm);
            }}
          >
            <h2>Algorithms 3-5 – Dual Authentication</h2>
            <FormFields state={loginForm} setState={setLoginForm} />
            <button type="submit" disabled={loading}>
              {loading ? 'Authenticating...' : 'Begin Session'}
            </button>
          </form>
        )}

        {activeTab === 'password' && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit(api.changePassword, passwordForm);
            }}
          >
            <h2>Password Change Phase</h2>
            <FormFields state={passwordForm} setState={setPasswordForm} />
            <button type="submit" disabled={loading}>
              {loading ? 'Updating...' : 'Rotate Password'}
            </button>
          </form>
        )}
      </section>

      <section className="results">
        <h2>Protocol Output</h2>
        {error && <p className="error">{error}</p>}
        {result && <pre>{JSON.stringify(result, null, 2)}</pre>}
        {sessionKey && (
          <p className="success">
            Authentication Successful — Session Key: <strong>{sessionKey}</strong>
          </p>
        )}
      </section>
    </div>
  );
}

function FormFields({ state, setState }) {
  return (
    <>
      <label htmlFor="id">
        Identifier
        <input
          id="id"
          name="id"
          value={state.id}
          onChange={(e) => setState((prev) => ({ ...prev, id: e.target.value }))}
          placeholder="Device/User ID"
          required
        />
      </label>
      <label htmlFor="password">
        Password
        <input
          id="password"
          type="password"
          name="password"
          value={state.password}
          onChange={(e) => setState((prev) => ({ ...prev, password: e.target.value }))}
          placeholder="Strong secret"
          required
        />
      </label>
      <label htmlFor="ni">
        Device Nonce nᵢ
        <input
          id="ni"
          name="ni"
          value={state.ni}
          onChange={(e) => setState((prev) => ({ ...prev, ni: e.target.value }))}
          placeholder="Random device nonce"
          required
        />
      </label>
    </>
  );
}

export default App;
