import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis } from 'recharts';
import { fmt, fmtUSD, fmtPct, CHART_COLORS, statusLabel } from '../utils';

const statusColors = { top_performer: '#34d399', stable: '#60a5fa', fatigued: '#fbbf24', underperformer: '#f87171' };

const ChartTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg-card-solid)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', fontSize: 12, boxShadow: 'var(--shadow)' }}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{payload[0]?.payload?.name || payload[0]?.payload?.country || payload[0]?.payload?.format || payload[0]?.payload?.os}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, marginTop: 3 }}>
          {p.name}: {typeof p.value === 'number' && p.value < 1 ? fmtPct(p.value) : typeof p.value === 'number' && p.value < 100 ? p.value.toFixed(2) : fmt(p.value)}
        </div>
      ))}
    </div>
  );
};

function BenchmarkBar({ label, value, benchmark, format = 'pct', higherIsBetter = true }) {
  const delta = benchmark > 0 ? ((value - benchmark) / benchmark) * 100 : 0;
  const isGood = higherIsBetter ? delta >= 0 : delta <= 0;
  const displayVal = format === 'pct' ? fmtPct(value) : format === 'usd' ? fmtUSD(value) : value.toFixed(2) + 'x';
  const displayBench = format === 'pct' ? fmtPct(benchmark) : format === 'usd' ? fmtUSD(benchmark) : benchmark.toFixed(2) + 'x';

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
        <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
        <span style={{ fontWeight: 700, color: isGood ? 'var(--green)' : 'var(--red)' }}>
          {displayVal} <span style={{ fontSize: 10, fontWeight: 500, color: 'var(--text-muted)' }}>vs {displayBench} industry avg</span>
          <span style={{ marginLeft: 4, fontSize: 10 }}>{isGood ? '▲' : '▼'} {Math.abs(delta).toFixed(0)}%</span>
        </span>
      </div>
      <div className="bar-fill-bg">
        <div className="bar-fill" style={{ width: `${Math.min(100, (value / (benchmark * 2)) * 100)}%`, background: isGood ? 'var(--green)' : 'var(--red)' }} />
      </div>
    </div>
  );
}

function HealthScore({ stats }) {
  const total = stats.totalCreatives || 1;
  const score = Math.round(
    ((stats.statusBreakdown.top_performer / total) * 100) * 1.5 +
    ((stats.statusBreakdown.stable / total) * 100) * 1.0 -
    ((stats.statusBreakdown.fatigued / total) * 100) * 0.5 -
    ((stats.statusBreakdown.underperformer / total) * 100) * 1.0
  );
  const normalizedScore = Math.max(0, Math.min(100, score + 40));
  const color = normalizedScore >= 70 ? 'var(--green)' : normalizedScore >= 45 ? 'var(--yellow)' : 'var(--red)';
  const label = normalizedScore >= 70 ? 'Healthy' : normalizedScore >= 45 ? 'Needs Attention' : 'Critical';

  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ position: 'relative', width: 100, height: 100, margin: '0 auto 6px' }}>
        <svg viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="6" />
          <circle cx="50" cy="50" r="42" fill="none" stroke={color} strokeWidth="6"
            strokeDasharray={`${normalizedScore * 2.64} 264`}
            strokeLinecap="round" style={{ transition: 'stroke-dasharray 1s ease' }} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontSize: 26, fontWeight: 800, color, letterSpacing: '-1px' }}>{normalizedScore}</div>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Health</div>
        </div>
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, color }}>{label}</div>
    </div>
  );
}

export default function Overview({ data, insight, benchmark, onNavigate }) {
  const { stats, creatives, campaigns } = data;

  const statusData = Object.entries(stats.statusBreakdown).map(([k, v]) => ({ name: statusLabel(k), value: v, key: k }));

  const countryData = Object.entries(data.countryPerf)
    .map(([country, p]) => ({ country, ...p }))
    .sort((a, b) => b.roas - a.roas);

  const osData = Object.entries(data.osPerf || {})
    .map(([os, p]) => ({ os, ...p }))
    .sort((a, b) => b.roas - a.roas);

  const topCreatives = [...creatives].sort((a, b) => b.perf_score - a.perf_score).slice(0, 6);

  const roas = stats.totalSpend > 0 ? stats.totalRevenue / stats.totalSpend : 0;
  const cpa = stats.totalConversions > 0 ? stats.totalSpend / stats.totalConversions : 0;

  // Radar data
  const radarData = insight && benchmark ? [
    { metric: 'CTR', value: Math.min(100, (insight.ctr / (benchmark.avg_ctr * 2)) * 100) },
    { metric: 'CVR', value: Math.min(100, (insight.cvr / (benchmark.avg_cvr * 2)) * 100) },
    { metric: 'ROAS', value: Math.min(100, (insight.roas / (benchmark.avg_roas * 2)) * 100) },
    { metric: 'Diversity', value: (insight.diversityScore || 0) * 100 },
    { metric: 'Health', value: ((insight.statusBreakdown.top_performer + insight.statusBreakdown.stable) / insight.totalCreatives) * 100 },
  ] : null;

  // Urgent alerts
  const urgentAlerts = [];
  if (insight) {
    if (insight.statusBreakdown.fatigued > 3) urgentAlerts.push({ type: 'warning', text: `${insight.statusBreakdown.fatigued} creatives are fatigued — consider refreshing or rotating them`, action: 'fatigue' });
    if (insight.wastedSpend > 10000) urgentAlerts.push({ type: 'danger', text: `${fmtUSD(insight.wastedSpend)} spent on underperforming creatives — pause them to save budget`, action: 'recommendations' });
    if (insight.diversityScore < 0.15) urgentAlerts.push({ type: 'info', text: `Your creative diversity is low — try new format + theme combinations`, action: 'explainability' });
  }

  return (
    <div>
      <div className="page-header">
        <h2>Your Creative Dashboard</h2>
        <p>Here's how your campaigns are performing across {stats.totalCampaigns} campaigns and {stats.totalCreatives} creatives</p>
      </div>

      {/* Urgent alerts */}
      {urgentAlerts.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
          {urgentAlerts.map((alert, i) => (
            <div key={i}
              onClick={() => onNavigate(alert.action)}
              style={{
                padding: '12px 18px', borderRadius: 12, fontSize: 13,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                cursor: 'pointer', transition: 'var(--transition)',
                background: alert.type === 'danger' ? 'var(--red-bg)' : alert.type === 'warning' ? 'var(--yellow-bg)' : 'var(--blue-bg)',
                border: `1px solid ${alert.type === 'danger' ? 'rgba(248,113,113,0.15)' : alert.type === 'warning' ? 'rgba(251,191,36,0.15)' : 'rgba(96,165,250,0.15)'}`,
              }}
            >
              <span style={{ color: 'var(--text-secondary)' }}>
                <strong style={{ color: alert.type === 'danger' ? 'var(--red)' : alert.type === 'warning' ? 'var(--yellow)' : 'var(--blue)' }}>
                  {alert.type === 'danger' ? '🚨' : alert.type === 'warning' ? '⚠️' : '💡'}
                </strong>{' '}
                {alert.text}
              </span>
              <span style={{ color: 'var(--accent)', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', marginLeft: 12 }}>View →</span>
            </div>
          ))}
        </div>
      )}

      {/* KPI Stats */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-label">Your Spend</div>
          <div className="stat-value">{fmtUSD(stats.totalSpend)}</div>
          <div className="stat-change" style={{ color: 'var(--text-muted)' }}>CPA: {fmtUSD(cpa)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Your Revenue</div>
          <div className="stat-value">{fmtUSD(stats.totalRevenue)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Return on Spend</div>
          <div className="stat-value" style={{ color: roas >= 1 ? 'var(--green)' : 'var(--red)', WebkitBackgroundClip: 'unset', WebkitTextFillColor: 'unset' }}>
            {roas.toFixed(2)}x
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Conversions</div>
          <div className="stat-value">{fmt(stats.totalConversions)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Active Creatives</div>
          <div className="stat-value">{fmt(stats.totalCreatives)}</div>
          <div className="stat-change positive">{stats.totalCampaigns} campaigns</div>
        </div>
        {insight && insight.wastedSpend > 0 && (
          <div className="stat-card">
            <div className="stat-label">Budget at Risk</div>
            <div className="stat-value" style={{ color: 'var(--red)', WebkitBackgroundClip: 'unset', WebkitTextFillColor: 'unset' }}>
              {fmtUSD(insight.wastedSpend + (insight.fatiguedSpendAtRisk || 0))}
            </div>
            <div className="stat-change negative">underperforming + fatigued</div>
          </div>
        )}
      </div>

      {/* Benchmark + Radar */}
      {benchmark && insight && (
        <div className="grid-2" style={{ marginBottom: 24 }}>
          <div className="card">
            <div className="card-header">
              <h3>📏 You vs Industry Average</h3>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{insight.vertical} vertical benchmark</span>
            </div>
            <BenchmarkBar label="Click-Through Rate" value={insight.ctr} benchmark={benchmark.avg_ctr} format="pct" higherIsBetter={true} />
            <BenchmarkBar label="Conversion Rate" value={insight.cvr} benchmark={benchmark.avg_cvr} format="pct" higherIsBetter={true} />
            <BenchmarkBar label="Return on Ad Spend" value={insight.roas} benchmark={benchmark.avg_roas} format="roas" higherIsBetter={true} />
            <BenchmarkBar label="Cost per Acquisition" value={insight.cpa} benchmark={benchmark.avg_cpa} format="usd" higherIsBetter={false} />
          </div>
          <div className="card">
            <div className="card-header"><h3>🎯 Your Performance Profile</h3></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <HealthScore stats={stats} />
              {radarData && (
                <ResponsiveContainer width="100%" height={210}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="var(--border)" />
                    <PolarAngleAxis dataKey="metric" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                    <Radar dataKey="value" stroke="var(--accent)" fill="var(--accent)" fillOpacity={0.15} strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid-2">
        {/* Creative Health */}
        <div className="card">
          <div className="card-header"><h3>Your Creative Health</h3></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <ResponsiveContainer width="48%" height={190}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" outerRadius={75} innerRadius={48} dataKey="value" paddingAngle={3} strokeWidth={0}>
                  {statusData.map((entry, i) => <Cell key={i} fill={statusColors[entry.key]} />)}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ flex: 1 }}>
              {statusData.map((s, i) => {
                const pct = stats.totalCreatives > 0 ? ((s.value / stats.totalCreatives) * 100).toFixed(0) : 0;
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: statusColors[s.key] }} />
                      <span>{s.name}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontWeight: 700, fontSize: 14 }}>{s.value}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{pct}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Country performance */}
        <div className="card">
          <div className="card-header"><h3>🌍 Your Performance by Country</h3></div>
          {countryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={countryData.slice(0, 8)} layout="vertical" margin={{ left: 50 }}>
                <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="country" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} axisLine={false} tickLine={false} width={45} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="roas" name="ROAS" radius={[0, 6, 6, 0]} barSize={18}>
                  {countryData.slice(0, 8).map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No country data available</div>
          )}
        </div>
      </div>

      {/* OS Breakdown */}
      {osData.length > 0 && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header"><h3>📱 Your Performance by Platform</h3></div>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(osData.length, 4)}, 1fr)`, gap: 14 }}>
            {osData.map((o, i) => (
              <div key={o.os} style={{ background: 'var(--bg-primary)', borderRadius: 12, padding: '16px 18px', borderLeft: `3px solid ${CHART_COLORS[i]}` }}>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>{o.os}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12 }}>
                  <div>
                    <div style={{ color: 'var(--text-muted)', marginBottom: 2 }}>ROAS</div>
                    <div style={{ fontWeight: 700, color: o.roas >= 1 ? 'var(--green)' : 'var(--red)', fontSize: 16 }}>{o.roas.toFixed(2)}x</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-muted)', marginBottom: 2 }}>CTR</div>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>{fmtPct(o.ctr)}</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-muted)', marginBottom: 2 }}>Spend</div>
                    <div style={{ fontWeight: 600 }}>{fmtUSD(o.spend)}</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-muted)', marginBottom: 2 }}>Conv.</div>
                    <div style={{ fontWeight: 600 }}>{fmt(o.conversions)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Campaign Efficiency */}
      {insight && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header"><h3>📋 Your Campaign Efficiency</h3></div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Campaign</th>
                <th>Spend</th>
                <th>Conversions</th>
                <th>CPA</th>
                <th>ROAS</th>
                <th>CTR</th>
                <th>Efficiency</th>
              </tr>
            </thead>
            <tbody>
              {insight.campaignEfficiency.map(c => {
                const effScore = c.roas > 0 ? Math.min(100, c.roas / (benchmark?.avg_roas || 2) * 100) : 0;
                return (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{c.app}</td>
                    <td>{fmtUSD(c.spend)}</td>
                    <td>{fmt(c.conversions)}</td>
                    <td style={{ color: c.cpa < (benchmark?.avg_cpa || 50) ? 'var(--green)' : 'var(--red)' }}>{fmtUSD(c.cpa)}</td>
                    <td style={{ fontWeight: 700, color: c.roas >= 1 ? 'var(--green)' : 'var(--red)' }}>{c.roas.toFixed(2)}x</td>
                    <td>{fmtPct(c.ctr)}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="bar-fill-bg" style={{ width: 50 }}>
                          <div className="bar-fill" style={{ width: `${effScore}%`, background: effScore > 70 ? 'var(--green)' : effScore > 40 ? 'var(--yellow)' : 'var(--red)' }} />
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{effScore.toFixed(0)}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Top Creatives */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <h3>🏆 Your Best Creatives</h3>
          <button className="tab active" onClick={() => onNavigate('explorer')}>See All →</button>
        </div>
        <div className="creatives-grid">
          {topCreatives.map(c => (
            <div key={c.id} className="creative-card">
              <img src={`/api/assets/${c.asset_file}`} alt={c.headline} loading="lazy" />
              <div className="info">
                <h4>{c.headline}</h4>
                <div className="meta">{c.format} · {c.theme}</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span className={`status-badge ${c.status}`}>{statusLabel(c.status)}</span>
                  <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--accent)' }}>{(c.perf_score * 100).toFixed(0)}</span>
                </div>
                <div className="metrics">
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
