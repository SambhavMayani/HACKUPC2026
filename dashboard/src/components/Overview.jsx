import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis } from 'recharts';
import { fmt, fmtUSD, fmtPct, CHART_COLORS, statusLabel } from '../utils';

const statusColors = { top_performer: '#34d399', stable: '#60a5fa', fatigued: '#fbbf24', underperformer: '#f87171' };

const ChartTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg-card-solid)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', fontSize: 12, boxShadow: 'var(--shadow)' }}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{payload[0]?.payload?.name || payload[0]?.payload?.vertical || payload[0]?.payload?.country || payload[0]?.payload?.format || payload[0]?.payload?.os}</div>
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
          {displayVal} <span style={{ fontSize: 10, fontWeight: 500, color: 'var(--text-muted)' }}>vs {displayBench} avg</span>
          <span style={{ marginLeft: 4, fontSize: 10 }}>{isGood ? '▲' : '▼'} {Math.abs(delta).toFixed(0)}%</span>
        </span>
      </div>
      <div className="bar-fill-bg">
        <div className="bar-fill" style={{
          width: `${Math.min(100, (value / (benchmark * 2)) * 100)}%`,
          background: isGood ? 'var(--green)' : 'var(--red)',
        }} />
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
      <div style={{ position: 'relative', width: 110, height: 110, margin: '0 auto 8px' }}>
        <svg viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="6" />
          <circle cx="50" cy="50" r="42" fill="none" stroke={color} strokeWidth="6"
            strokeDasharray={`${normalizedScore * 2.64} 264`}
            strokeLinecap="round" style={{ transition: 'stroke-dasharray 1s ease' }} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 800, color, letterSpacing: '-1px' }}>{normalizedScore}</div>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Score</div>
        </div>
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, color }}>{label}</div>
    </div>
  );
}

export default function Overview({ data, fullData, advInsight, benchmark, onNavigate, selectedAdvertiser }) {
  const { stats, creatives, campaigns } = data;
  const isCompanyView = selectedAdvertiser !== 'all';

  const statusData = Object.entries(stats.statusBreakdown).map(([k, v]) => ({ name: statusLabel(k), value: v, key: k }));

  const countryData = Object.entries(data.countryPerf)
    .map(([country, p]) => ({ country, ...p }))
    .sort((a, b) => b.roas - a.roas);

  const osData = Object.entries(data.osPerf || {})
    .map(([os, p]) => ({ os, ...p }))
    .sort((a, b) => b.roas - a.roas);

  const topCreatives = [...creatives].sort((a, b) => b.perf_score - a.perf_score).slice(0, 6);

  const formatPerf = {};
  creatives.forEach(c => {
    if (!formatPerf[c.format]) formatPerf[c.format] = { format: c.format, spend: 0, revenue: 0, impressions: 0, count: 0 };
    formatPerf[c.format].spend += c.spend;
    formatPerf[c.format].revenue += c.revenue;
    formatPerf[c.format].impressions += c.impressions;
    formatPerf[c.format].count++;
  });
  const formatData = Object.values(formatPerf).map(f => ({
    ...f,
    roas: f.spend > 0 ? f.revenue / f.spend : 0,
    ctr: f.impressions > 0 ? f.spend / f.impressions : 0,
  })).sort((a, b) => b.roas - a.roas);

  // Radar data for company view
  const radarData = isCompanyView && advInsight && benchmark ? [
    { metric: 'CTR', value: Math.min(100, (advInsight.ctr / (benchmark.avg_ctr * 2)) * 100), fullMark: 100 },
    { metric: 'CVR', value: Math.min(100, (advInsight.cvr / (benchmark.avg_cvr * 2)) * 100), fullMark: 100 },
    { metric: 'ROAS', value: Math.min(100, (advInsight.roas / (benchmark.avg_roas * 2)) * 100), fullMark: 100 },
    { metric: 'Diversity', value: (advInsight.diversityScore || 0) * 100, fullMark: 100 },
    { metric: 'Health', value: ((advInsight.statusBreakdown.top_performer + advInsight.statusBreakdown.stable) / advInsight.totalCreatives) * 100, fullMark: 100 },
  ] : null;

  const roas = stats.totalSpend > 0 ? stats.totalRevenue / stats.totalSpend : 0;

  return (
    <div>
      <div className="page-header">
        <h2>{isCompanyView ? `${selectedAdvertiser} Dashboard` : 'Creative Intelligence Overview'}</h2>
        <p>{isCompanyView
          ? `${advInsight?.vertical} · ${advInsight?.region} · ${advInsight?.totalCampaigns} campaigns`
          : 'Real-time snapshot of creative performance across all companies'
        }</p>
      </div>

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-label">Creatives</div>
          <div className="stat-value">{fmt(stats.totalCreatives)}</div>
          <div className="stat-change positive">{stats.totalCampaigns} campaigns</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Spend</div>
          <div className="stat-value">{fmtUSD(stats.totalSpend)}</div>
          {isCompanyView && advInsight && <div className="stat-change" style={{ color: 'var(--text-muted)' }}>CPA: {fmtUSD(advInsight.cpa)}</div>}
        </div>
        <div className="stat-card">
          <div className="stat-label">Revenue</div>
          <div className="stat-value">{fmtUSD(stats.totalRevenue)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">ROAS</div>
          <div className="stat-value" style={{ color: roas >= 1 ? 'var(--green)' : 'var(--red)', WebkitBackgroundClip: 'unset', WebkitTextFillColor: 'unset' }}>
            {roas.toFixed(2)}x
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Conversions</div>
          <div className="stat-value">{fmt(stats.totalConversions)}</div>
        </div>
        {isCompanyView && advInsight && (
          <div className="stat-card">
            <div className="stat-label">Wasted Spend</div>
            <div className="stat-value" style={{ color: advInsight.wastedSpend > 0 ? 'var(--red)' : 'var(--green)', WebkitBackgroundClip: 'unset', WebkitTextFillColor: 'unset' }}>
              {fmtUSD(advInsight.wastedSpend)}
            </div>
            <div className="stat-change negative">on underperformers</div>
          </div>
        )}
      </div>

      {/* Benchmark + Radar (company view) */}
      {isCompanyView && benchmark && advInsight && (
        <div className="grid-2" style={{ marginBottom: 24 }}>
          <div className="card">
            <div className="card-header">
              <h3>📏 Performance vs {advInsight.vertical} Average</h3>
              <span className="status-badge stable">{benchmark.count} competitors</span>
            </div>
            <BenchmarkBar label="Click-Through Rate" value={advInsight.ctr} benchmark={benchmark.avg_ctr} format="pct" higherIsBetter={true} />
            <BenchmarkBar label="Conversion Rate" value={advInsight.cvr} benchmark={benchmark.avg_cvr} format="pct" higherIsBetter={true} />
            <BenchmarkBar label="Return on Ad Spend" value={advInsight.roas} benchmark={benchmark.avg_roas} format="roas" higherIsBetter={true} />
            <BenchmarkBar label="Cost per Acquisition" value={advInsight.cpa} benchmark={benchmark.avg_cpa} format="usd" higherIsBetter={false} />
          </div>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div className="card-header" style={{ width: '100%' }}>
              <h3>🎯 Company Performance Profile</h3>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, width: '100%' }}>
              <HealthScore stats={stats} />
              {radarData && (
                <ResponsiveContainer width="100%" height={220}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="var(--border)" />
                    <PolarAngleAxis dataKey="metric" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                    <Radar dataKey="value" stroke="var(--accent)" fill="var(--accent)" fillOpacity={0.15} strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
              )}
            </div>
            {advInsight.fatiguedSpendAtRisk > 0 && (
              <div style={{ width: '100%', marginTop: 12, padding: '10px 14px', background: 'var(--yellow-bg)', borderRadius: 10, fontSize: 13, border: '1px solid rgba(251,191,36,0.12)' }}>
                ⚠️ <strong style={{ color: 'var(--yellow)' }}>{fmtUSD(advInsight.fatiguedSpendAtRisk)}</strong>
                <span style={{ color: 'var(--text-secondary)' }}> at risk on fatigued creatives</span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid-2">
        <div className="card">
          <div className="card-header"><h3>Creative Health Distribution</h3></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <ResponsiveContainer width="48%" height={200}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" outerRadius={80} innerRadius={52} dataKey="value" paddingAngle={3} strokeWidth={0}>
                  {statusData.map((entry, i) => <Cell key={i} fill={statusColors[entry.key]} />)}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ flex: 1 }}>
              {statusData.map((s, i) => {
                const pct = stats.totalCreatives > 0 ? ((s.value / stats.totalCreatives) * 100).toFixed(0) : 0;
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: statusColors[s.key] }} />
                      <span>{s.name}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 700, fontSize: 14 }}>{s.value}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{pct}%</span>
                    </div>
                  </div>
                );
              })}
              {!isCompanyView && <HealthScore stats={stats} />}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>{isCompanyView ? '🌍 Performance by Country' : '📊 ROAS by Format'}</h3>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={isCompanyView ? countryData.slice(0, 8) : formatData} layout="vertical" margin={{ left: 70 }}>
              <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey={isCompanyView ? 'country' : 'format'} tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} axisLine={false} tickLine={false} width={65} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="roas" name="ROAS" radius={[0, 6, 6, 0]} barSize={18}>
                {(isCompanyView ? countryData.slice(0, 8) : formatData).map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* OS breakdown */}
      {osData.length > 0 && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header"><h3>📱 Performance by Platform</h3></div>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(osData.length, 4)}, 1fr)`, gap: 16 }}>
            {osData.map((o, i) => (
              <div key={o.os} style={{
                background: 'var(--bg-primary)', borderRadius: 12, padding: '16px 18px',
                borderLeft: `3px solid ${CHART_COLORS[i]}`,
              }}>
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

      {/* Campaign Efficiency Table (company view) */}
      {isCompanyView && advInsight && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header"><h3>📋 Campaign Efficiency</h3></div>
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
              {advInsight.campaignEfficiency.map(c => {
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
                        <div className="bar-fill-bg" style={{ width: 60 }}>
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

      {/* Company Leaderboard (global view) */}
      {!isCompanyView && fullData && (
        <div className="card">
          <div className="card-header"><h3>🏢 Company Leaderboard</h3></div>
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Company</th>
                <th>Vertical</th>
                <th>Region</th>
                <th>Creatives</th>
                <th>Spend</th>
                <th>ROAS</th>
                <th>CPA</th>
                <th>Diversity</th>
                <th>Health</th>
              </tr>
            </thead>
            <tbody>
              {Object.values(fullData.advertiserInsights)
                .sort((a, b) => b.roas - a.roas)
                .map((a, i) => {
                  const healthPct = ((a.statusBreakdown.top_performer + a.statusBreakdown.stable) / a.totalCreatives * 100).toFixed(0);
                  return (
                    <tr key={a.name}>
                      <td style={{ fontWeight: 700, color: i < 3 ? 'var(--accent)' : 'var(--text-muted)', fontSize: 14 }}>{i + 1}</td>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{a.name}</td>
                      <td>{a.vertical}</td>
                      <td>{a.region}</td>
                      <td>{a.totalCreatives}</td>
                      <td>{fmtUSD(a.totalSpend)}</td>
                      <td style={{ fontWeight: 700, color: a.roas >= 2 ? 'var(--green)' : a.roas >= 1 ? 'var(--blue)' : 'var(--red)' }}>
                        {a.roas.toFixed(2)}x
                      </td>
                      <td>{fmtUSD(a.cpa)}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div className="bar-fill-bg" style={{ width: 40 }}>
                            <div className="bar-fill" style={{ width: `${(a.diversityScore || 0) * 100}%`, background: 'var(--accent)' }} />
                          </div>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{((a.diversityScore || 0) * 100).toFixed(0)}%</span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                          {a.statusBreakdown.top_performer > 0 && <span className="status-badge top_performer" style={{ fontSize: 9, padding: '1px 6px' }}>{a.statusBreakdown.top_performer}</span>}
                          {a.statusBreakdown.fatigued > 0 && <span className="status-badge fatigued" style={{ fontSize: 9, padding: '1px 6px' }}>{a.statusBreakdown.fatigued}</span>}
                          {a.statusBreakdown.underperformer > 0 && <span className="status-badge underperformer" style={{ fontSize: 9, padding: '1px 6px' }}>{a.statusBreakdown.underperformer}</span>}
                          <span style={{ fontSize: 11, color: healthPct >= 60 ? 'var(--green)' : 'var(--text-muted)' }}>{healthPct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
