export default function Sidebar({ active, onNavigate }) {
  const items = [
    { id: 'overview', icon: '📊', label: 'Overview' },
    { id: 'explorer', icon: '🔍', label: 'Performance Explorer' },
    { id: 'fatigue', icon: '⏳', label: 'Fatigue Detection' },
    { id: 'explainability', icon: '💡', label: 'Explainability' },
    { id: 'recommendations', icon: '🎯', label: 'Recommendations' },
    { id: 'clusters', icon: '🧩', label: 'Clusters' },
    { id: 'copilot', icon: '🤖', label: 'AI Copilot' },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon">CI</div>
        <div>
          <h1>Creative Intel</h1>
          <span>by Smadex</span>
        </div>
      </div>
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
