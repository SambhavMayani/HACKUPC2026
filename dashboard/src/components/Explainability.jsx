import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { fmtPct, explainPerformance, getTopTraits, statusLabel, CHART_COLORS } from '../utils';

export default function Explainability({ data }) {
  const topPerformers = useMemo(() =>
    data.creatives.filter(c => c.status === 'top_performer').sort((a, b) => b.perf_score - a.perf_score),
    [data]
  );

  const traitData = useMemo(() => {
    const result = {};
    for (const [trait, entries] of Object.entries(data.traitAnalysis)) {
      result[trait] = entries.slice(0, 8).map(e => ({
        name: e.value,
        perf: +(e.avg_perf * 100).toFixed(1),
        ctr: e.avg_ctr,
        count: e.count,
      }));
    }
    return result;
  }, [data]);

  const traits = ['format', 'theme', 'hook_type', 'dominant_color', 'emotional_tone', 'language'];
  const traitLabels = { format: 'Ad Format', theme: 'Creative Theme', hook_type: 'Hook Type', dominant_color: 'Dominant Color', emotional_tone: 'Emotional Tone', language: 'Language' };

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0]?.payload;
    return (
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: 13 }}>
        <div style={{ fontWeight: 600 }}>{d?.name}</div>
        <div style={{ color: 'var(--accent)', marginTop: 4 }}>Avg Score: {d?.perf}</div>
        <div style={{ color: 'var(--text-muted)', marginTop: 2 }}>Count: {d?.count}</div>
      </div>
    );
  };

  return (
    <div>
      <div className="page-header">
        <h2>💡 Explainability Layer</h2>
        <p>Understand why creatives perform well or poorly — trait analysis & performance drivers</p>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header"><h3>🏆 Top Performers — Why They Work</h3></div>
        <div className="creatives-grid">
          {topPerformers.slice(0, 6).map(c => {
            const reasons = explainPerformance(c);
            const traits = getTopTraits(c);
            return (
              <div key={c.id} className="creative-card">
                <img src={`/${c.asset_file}`} alt={c.headline} loading="lazy" />
                <div className="info">
                  <h4>{c.headline}</h4>
                  <div className="meta">{c.advertiser} · {c.vertical}</div>
                  <span className={`status-badge ${c.status}`}>{statusLabel(c.status)}</span>
                  <div style={{ marginTop: 10 }}>
                    {reasons.map((r, i) => (
                      <div key={i} style={{ fontSize: 12, color: 'var(--green)', marginBottom: 4, display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                        <span>✓</span><span style={{ color: 'var(--text-secondary)' }}>{r}</span>
                      </div>
                    ))}
                  </div>
                  {traits.length > 0 && (
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 8 }}>
                      {traits.slice(0, 4).map((t, i) => (
                        <span key={i} style={{ fontSize: 10, background: 'var(--bg-secondary)', padding: '2px 8px', borderRadius: 10, color: 'var(--text-muted)' }}>{t}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header"><h3>📊 Performance by Creative Trait</h3></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: 24 }}>
          {traits.map(trait => (
            <div key={trait}>
              <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: 'var(--text-secondary)' }}>{traitLabels[trait]}</h4>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={traitData[trait]} layout="vertical" margin={{ left: 80 }}>
                  <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} axisLine={false} tickLine={false} width={75} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="perf" name="Avg Score" radius={[0, 4, 4, 0]} barSize={16}>
                    {(traitData[trait] || []).map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h3>📉 Underperformers — What's Going Wrong</h3></div>
        <div className="creatives-grid">
          {data.creatives.filter(c => c.status === 'underperformer').sort((a, b) => a.perf_score - b.perf_score).slice(0, 6).map(c => {
            const reasons = explainPerformance(c);
            return (
              <div key={c.id} className="creative-card">
                <img src={`/${c.asset_file}`} alt={c.headline} loading="lazy" />
                <div className="info">
                  <h4>{c.headline}</h4>
                  <div className="meta">{c.advertiser} · {c.vertical}</div>
                  <span className={`status-badge ${c.status}`}>{statusLabel(c.status)}</span>
                  <div style={{ marginTop: 10 }}>
                    {reasons.map((r, i) => (
                      <div key={i} style={{ fontSize: 12, color: 'var(--red)', marginBottom: 4, display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                        <span>✗</span><span style={{ color: 'var(--text-secondary)' }}>{r}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
