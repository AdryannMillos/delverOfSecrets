import React, { useState } from 'react';

export default function LoginScreen({ onLogin }) {
  const [name, setName] = useState('');

  const submit = (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    localStorage.setItem('mtgo_username', trimmed);
    onLogin(trimmed);
  };

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-logo">🔍 Tireless Tracker</div>
        <p className="login-sub">Enter your Magic Online username to get started</p>
        <form onSubmit={submit} className="login-form">
          <input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Your MTGO username"
          />
          <button className="btn btn-primary" type="submit" disabled={!name.trim()}>
            Let's go
          </button>
        </form>
      </div>
    </div>
  );
}
