import { fmtUSD } from '../utils';

export default function Sidebar({ active, onNavigate, advertisers, selectedAdvertiser, onSelectAdvertiser, advInsight }) {
  const items = [
    { id: 'overview', icon: '📊', label: 'Overview' },
    { id: 'explorer', icon: '🔍', label: 'Performance Explorer' },
    { id: 'fatigue', icon: '⏳', label: 'Fatigue Detection' },
    { id: 'explainability', icon: '💡', label: 'Explainability' },
    { id: 'recommendations', icon: '🎯', label: 'Recommendations' },
    { id: 'clusters', icon: '🧩', label: 'Clusters' },
    { id: 'copilot', icon: '🤖', label: 'AI Copilot' },
  ];

  const verticalIcons = {
    gaming: '🎮', ecommerce: '🛒', fintech: '💳', travel: '✈️', food_delivery: '🍔', entertainment: '🎬'
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon">CI</div>
        <div>
          <h1>Creative Intel</h1>
          <span>by Smadex</span>
        </div>
      </div>

      {/* Company Selector */}
      <div style={{ padding: '12px 12px 0' }}>
        <div className="nav-section">Company</div>
        <select
          className="filter-select"
          style={{ width: '100%', marginBottom: 8 }}
          value={selectedAdvertiser}
          onChange={e => onSelectAdvertiser(e.target.value)}
        >
          <option value="all">All Companies</option>
          {advertisers.map(a => (
            <option key={a.id} value={a.name}>
              {verticalIcons[a.vertical] || '📦'} {a.name}
            </option>
          ))}
        </select>
      </div>

      {/* Company quick stats when selected */}
      {advInsight && (
        <div style={{ padding: '0 12px 8px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0' }}>
            <span style={{ fontSize: 24 }}>{verticalIcons[advInsight.vertical] || '📦'}</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{advInsight.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{advInsight.vertical} · {advInsight.region}</div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 11 }}>
            <div style={{ background: 'var(--bg-card)', borderRadius: 6, padding: '6px 8px' }}>
              <div style={{ color: 'var(--text-muted)' }}>ROAS</div>
              <div style={{ fontWeight: 700, color: advInsight.roas >= 2 ? 'var(--green)' : advInsight.roas >= 1 ? 'var(--blue)' : 'var(--red)' }}>
                {advInsight.roas.toFixed(2)}x
              </div>
            </div>
            <div style={{ background: 'var(--bg-card)', borderRadius: 6, padding: '6px 8px' }}>
              <div style={{ color: 'var(--text-muted)' }}>Spend</div>
              <div style={{ fontWeight: 700 }}>{fmtUSD(advInsight.totalSpend)}</div>
            </div>
            <div style={{ background: 'var(--bg-card)', borderRadius: 6, padding: '6px 8px' }}>
              <div style={{ color: 'var(--text-muted)' }}>Creatives</div>
              <div style={{ fontWeight: 700 }}>{advInsight.totalCreatives}</div>
            </div>
            <div style={{ background: 'var(--bg-card)', borderRadius: 6, padding: '6px 8px' }}>
              <div style={{ color: 'var(--text-muted)' }}>Fatigued</div>
              <div style={{ fontWeight: 700, color: advInsight.statusBreakdown.fatigued > 0 ? 'var(--yellow)' : 'var(--green)' }}>
                {advInsight.statusBreakdown.fatigued}
              </div>
            </div>
          </div>
        </div>
      )}

      <nav className="sidebar-nav">
        <div className="nav-section">Dashboard</div>
        {items.map(item => (
          <div
            key={item.id}
            className={`nav-item ${active === item.id ? 'active' : ''}`}
            onClick={() => onNavigate(item.id)}
          >
            <span className="icon">{item.icon}</span>
            <span>{item.label}</span>
          </div>
        ))}
      </nav>
    </aside>
  );
}
