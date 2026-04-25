import { useState } from 'react';
import { fmtUSD } from '../utils';

const verticalIcons = {
  gaming: '🎮', ecommerce: '🛒', fintech: '💳',
  travel: '✈️', food_delivery: '🍔', entertainment: '🎬',
};

export default function AccountPicker({ advertisers, insights, onSelect }) {
  const [search, setSearch] = useState('');

  const filtered = advertisers.filter(a =>
    !search || a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.vertical.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <div style={{
          width: 64, height: 64, margin: '0 auto 20px',
          background: 'linear-gradient(135deg, var(--accent), var(--accent-light))',
          borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 24, fontWeight: 800, color: 'white',
          boxShadow: '0 8px 32px var(--accent-glow)',
        }}>CI</div>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 8 }}>
          Welcome to Creative Intelligence
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 15 }}>
          Select your account to access your creative performance dashboard
        </p>
      </div>

      <div style={{ width: '100%', maxWidth: 720, marginBottom: 24 }}>
        <input
          className="search-input"
          style={{ width: '100%', padding: '12px 16px 12px 40px', fontSize: 14, borderRadius: 12 }}
          placeholder="Search your account…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          autoFocus
        />
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: 14,
        width: '100%',
        maxWidth: 720,
        maxHeight: '55vh',
        overflowY: 'auto',
      }}>
        {filtered.map(a => {
          const ins = insights[a.name];
          return (
            <div
              key={a.id}
              onClick={() => onSelect(a.name)}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 14,
                padding: '18px 20px',
                cursor: 'pointer',
                transition: 'all 0.25s ease',
                display: 'flex',
                gap: 16,
                alignItems: 'center',
              }}
              onMouseOver={e => {
                e.currentTarget.style.borderColor = 'var(--accent)';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 32px rgba(124,108,240,0.1)';
              }}
              onMouseOut={e => {
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{
                width: 46, height: 46, borderRadius: 12,
                background: 'var(--bg-primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, flexShrink: 0,
              }}>
                {verticalIcons[a.vertical] || '📦'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>{a.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {a.vertical} · {a.region}
                </div>
              </div>
              {ins && (
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{
                    fontSize: 16, fontWeight: 800,
                    color: ins.roas >= 1.5 ? 'var(--green)' : ins.roas >= 1 ? 'var(--blue)' : 'var(--red)',
                  }}>
                    {ins.roas.toFixed(2)}x
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {ins.totalCreatives} creatives
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p style={{ marginTop: 32, fontSize: 12, color: 'var(--text-muted)' }}>
        Powered by Smadex Creative Intelligence Platform
      </p>
    </div>
  );
}
