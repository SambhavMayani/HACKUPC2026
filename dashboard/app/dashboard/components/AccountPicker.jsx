import { useState } from 'react';
import { Compass, Gauge, Search, Sparkles, WalletCards } from 'lucide-react';

const verticalIcons = {
  gaming: Gauge,
  ecommerce: WalletCards,
  fintech: WalletCards,
  travel: Compass,
  food_delivery: Sparkles,
  entertainment: Sparkles,
};

export default function AccountPicker({ advertisers, insights, onSelect }) {
  const [search, setSearch] = useState('');

  const filtered = advertisers.filter(a =>
    !search ||
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.vertical.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="account-picker">
      <div className="account-shell">
        <div className="account-hero">
          <div className="brand-mark">AT</div>
          <h1>ADtonomy</h1>
          <p>Select an advertiser to open its performance workspace.</p>
        </div>

        <div className="account-search" style={{ position: 'relative' }}>
          <Search
            size={15}
            style={{ position: 'absolute', left: 13, top: 14, color: 'var(--muted-foreground)', pointerEvents: 'none' }}
          />
          <input
            className="search-input"
            style={{ backgroundImage: 'none' }}
            placeholder="Search accounts or verticals..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
          />
        </div>

        <div className="account-list">
          {filtered.map(a => {
            const ins = insights[a.name];
            const Icon = verticalIcons[a.vertical] || Sparkles;

            return (
              <button
                key={a.id}
                type="button"
                className="account-card"
                onClick={() => onSelect(a.name)}
              >
                <div className="account-icon">
                  <Icon size={20} strokeWidth={2.2} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div className="account-card-title">{a.name}</div>
                  <div className="account-card-meta">{a.vertical} · {a.region}</div>
                </div>
                {ins && (
                  <div className="account-card-score">
                    <div
                      className="account-card-roas"
                      style={{ color: ins.roas >= 1.5 ? 'var(--green)' : ins.roas >= 1 ? 'var(--blue)' : 'var(--red)' }}
                    >
                      {ins.roas.toFixed(2)}x
                    </div>
                    <div className="account-card-count">{ins.totalCreatives} creatives</div>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <p className="account-powered">Smadex ADtonomy Platform</p>
      </div>
    </div>
  );
}
