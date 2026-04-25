import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { fmt, fmtUSD, fmtPct, CHART_COLORS, statusLabel } from '../utils';

export default function Overview({ data, onNavigate }) {
  const { stats, creatives, campaigns } = data;

  const statusData = Object.entries(stats.statusBreakdown).map(([k, v]) => ({ name: statusLabel(k), value: v, key: k }));
  const statusColors = { top_performer: '#00d2a0', stable: '#54a0ff', fatigued: '#ffc857', underperformer: '#ff6b6b' };

  const verticalPerf = {};
  creatives.forEach(c => {
    if (!verticalPerf[c.vertical]) verticalPerf[c.vertical] = { vertical: c.vertical, spend: 0, revenue: 0, impressions: 0, conversions: 0 };
    verticalPerf[c.vertical].spend += c.spend;
    verticalPerf[c.vertical].revenue += c.revenue;
    verticalPerf[c.vertical].impressions += c.impressions;
    verticalPerf[c.vertical].conversions += c.conversions;
  });
  const verticalData = Object.values(verticalPerf).map(v => ({
    ...v,
    roas: v.spend > 0 ? v.revenue / v.spend : 0,
  })).sort((a, b) => b.roas - a.roas);

  const topCreatives = [...creatives].sort((a, b) => b.perf_score - a.perf_score).slice(0, 6);

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: 13 }}>
        <div style={{ fontWeight: 600 }}>{payload[0]?.payload?.name || payload[0]?.payload?.vertical}</div>
        {payload.map((p, i) => (
          <div key={i} style={{ color: p.color, marginTop: 4 }}>{p.name}: {typeof p.value === 'number' && p.value < 1 ? fmtPct(p.value) : fmt(p.value)}</div>
        ))}
      </div>
    );
  };

  return (
    <div>
      <div className="page-header">
        <h2>Creative Intelligence Overview</h2>
        <p>Real-time snapshot of creative performance across all campaigns</p>
      </div>

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-label">Total Creatives</div>
          <div className="stat-value">{fmt(stats.totalCreatives)}</div>
          <div className="stat-change positive">across {stats.totalCampaigns} campaigns</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Spend</div>
          <div className="stat-value">{fmtUSD(stats.totalSpend)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Impressions</div>
          <div className="stat-value">{fmt(stats.totalImpressions)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Conversions</div>
          <div className="stat-value">{fmt(stats.totalConversions)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Revenue</div>
          <div className="stat-value">{fmtUSD(stats.totalRevenue)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Overall ROAS</div>
          <div className="stat-value">{stats.totalSpend > 0 ? (stats.totalRevenue / stats.totalSpend).toFixed(2) + 'x' : '—'}</div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header"><h3>Creative Status Distribution</h3></div>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={statusData} cx="50%" cy="50%" outerRadius={100} innerRadius={60} dataKey="value" paddingAngle={3} strokeWidth={0}>
                {statusData.map((entry, i) => (
                  <Cell key={i} fill={statusColors[entry.key]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap', marginTop: 8 }}>
            {statusData.map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: statusColors[s.key] }} />
                <span style={{ color: 'var(--text-secondary)' }}>{s.name} ({s.value})</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3>ROAS by Vertical</h3></div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={verticalData} layout="vertical" margin={{ left: 80 }}>
              <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="vertical" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} axisLine={false} tickLine={false} width={75} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="roas" name="ROAS" fill="url(#barGrad)" radius={[0, 6, 6, 0]} barSize={22}>
                {verticalData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <h3>🏆 Top Performing Creatives</h3>
          <button className="tab active" onClick={() => onNavigate('explorer')}>View All →</button>
        </div>
        <div className="creatives-grid">
          {topCreatives.map(c => (
            <div key={c.id} className="creative-card">
              <img src={`/${c.asset_file}`} alt={c.headline} loading="lazy" />
              <div className="info">
                <h4>{c.headline}</h4>
                <div className="meta">{c.advertiser} · {c.vertical} · {c.format}</div>
                <span className={`status-badge ${c.status}`}>{statusLabel(c.status)}</span>
                <div className="metrics" style={{ marginTop: 8 }}>
                  <div className="metric"><div className="label">CTR</div><div className="val">{fmtPct(c.ctr)}</div></div>
                  <div className="metric"><div className="label">CVR</div><div className="val">{fmtPct(c.cvr)}</div></div>
                  <div className="metric"><div className="label">ROAS</div><div className="val">{c.roas.toFixed(2)}x</div></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
