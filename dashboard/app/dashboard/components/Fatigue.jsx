import { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { fmtPct, fmtUSD, statusLabel, CHART_COLORS } from '../utils';

export default function Fatigue({ data, insight }) {
  const [selectedId, setSelectedId] = useState(null);

  const fatigued = useMemo(() =>
    data.creatives
      .filter(c => c.status === 'fatigued')
      .sort((a, b) => a.fatigue_day - b.fatigue_day),
    [data]
  );

  const atRisk = useMemo(() =>
    data.creatives
      .filter(c => c.status === 'stable' && c.ctr_decay < -0.4)
      .sort((a, b) => a.ctr_decay - b.ctr_decay)
      .slice(0, 20),
    [data]
  );

  const totalFatiguedSpend = useMemo(() =>
    fatigued.reduce((s, c) => s + c.spend, 0),
    [fatigued]
  );

  const avgFatigueDay = useMemo(() =>
    fatigued.length > 0 ? fatigued.reduce((s, c) => s + (c.fatigue_day || 0), 0) / fatigued.length : 0,
    [fatigued]
  );

  // Find which formats/themes fatigue fastest
  const fatigueByFormat = useMemo(() => {
    const groups = {};
    fatigued.forEach(c => {
      if (!groups[c.format]) groups[c.format] = { days: [], count: 0 };
      groups[c.format].days.push(c.fatigue_day || 0);
      groups[c.format].count++;
    });
    return Object.entries(groups)
      .map(([f, g]) => ({ format: f, avgDay: g.days.reduce((a, b) => a + b, 0) / g.days.length, count: g.count }))
      .sort((a, b) => a.avgDay - b.avgDay);
  }, [fatigued]);

  const selected = selectedId
    ? data.creatives.find(c => c.id === selectedId)
    : fatigued[0];

  const ts = selected ? (data.timeSeries[selected.id] || []) : [];

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: 13, boxShadow: 'var(--shadow)' }}>
        <div style={{ fontWeight: 600 }}>Day {payload[0]?.payload?.day}</div>
        {payload.map((p, i) => (
          <div key={i} style={{ color: p.color, marginTop: 4 }}>{p.name}: {fmtPct(p.value)}</div>
        ))}
      </div>
    );
  };

  return (
    <div>
      <div className="page-header">
        <h2>⏳ Your Fatigue Alerts</h2>
        <p>These creatives are losing effectiveness — act now before they waste your budget</p>
      </div>

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-label">Fatigued Creatives</div>
          <div className="stat-value" style={{ color: 'var(--yellow)' }}>{fatigued.length}</div>
          <div className="stat-change negative">{((fatigued.length / Math.max(1, data.creatives.length)) * 100).toFixed(0)}% of portfolio</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Spend at Risk</div>
          <div className="stat-value" style={{ color: 'var(--red)' }}>{fmtUSD(totalFatiguedSpend)}</div>
          <div className="stat-change negative">on fatigued assets</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Avg Fatigue Day</div>
          <div className="stat-value">{avgFatigueDay.toFixed(0)}</div>
          <div className="stat-change" style={{ color: 'var(--text-muted)' }}>days until decay</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">At-Risk (Declining)</div>
          <div className="stat-value" style={{ color: 'var(--red)' }}>{atRisk.length}</div>
          <div className="stat-change negative">stable but CTR ↓40%+</div>
        </div>
      </div>

      {/* Fatigue by format insight */}
      {fatigueByFormat.length > 0 && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header"><h3>📊 Which Formats Fatigue Fastest?</h3></div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {fatigueByFormat.map((f, i) => (
              <div key={f.format} style={{
                flex: '1 1 140px', background: 'var(--bg-secondary)', borderRadius: 8, padding: '14px 16px',
                borderLeft: `3px solid ${CHART_COLORS[i]}`,
              }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{f.format}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: f.avgDay < avgFatigueDay ? 'var(--red)' : 'var(--green)' }}>
                  Day {f.avgDay.toFixed(0)}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{f.count} fatigued creatives</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid-2">
        <div className="card" style={{ maxHeight: 500, overflowY: 'auto' }}>
          <div className="card-header"><h3>⚠️ Fatigued Creatives</h3></div>
          {fatigued.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
              🎉 No fatigued creatives — your portfolio is healthy!
            </div>
          ) : fatigued.map(c => (
            <div
              key={c.id}
              onClick={() => setSelectedId(c.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 8,
                cursor: 'pointer', marginBottom: 4, transition: 'var(--transition)',
                background: selected?.id === c.id ? 'var(--bg-card-hover)' : 'transparent',
                border: selected?.id === c.id ? '1px solid var(--accent)' : '1px solid transparent',
              }}
            >
              <img src={`/api/assets/${c.asset_file}`} alt="" style={{ width: 48, height: 36, objectFit: 'cover', borderRadius: 4 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.headline}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.format} · Day {c.fatigue_day} · {fmtUSD(c.spend)}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 12, color: 'var(--red)', fontWeight: 600 }}>{(c.ctr_decay * 100).toFixed(0)}%</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>CTR decay</div>
              </div>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="card-header">
            <h3>📉 Performance Over Time {selected ? `— "${selected.headline}"` : ''}</h3>
          </div>
          {selected && ts.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={ts}>
                  <XAxis dataKey="day" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} label={{ value: 'Days Since Launch', position: 'bottom', fill: 'var(--text-muted)', fontSize: 11, offset: -5 }} />
                  <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => (v * 100).toFixed(1) + '%'} />
                  <Tooltip content={<CustomTooltip />} />
                  {selected.fatigue_day && (
                    <ReferenceLine x={selected.fatigue_day} stroke="var(--yellow)" strokeDasharray="5 5" label={{ value: `⚠️ Day ${selected.fatigue_day}`, fill: 'var(--yellow)', fontSize: 11 }} />
                  )}
                  <Line type="monotone" dataKey="ctr" name="CTR" stroke="var(--accent)" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="cvr" name="CVR" stroke="var(--green)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
              <div style={{ marginTop: 12, padding: '14px 16px', background: 'var(--yellow-bg)', borderRadius: 8, fontSize: 13, lineHeight: 1.6 }}>
                <strong style={{ color: 'var(--yellow)' }}>⚠️ Fatigue Analysis:</strong>
                <div style={{ color: 'var(--text-secondary)', marginTop: 4 }}>
                  CTR dropped <strong>{Math.abs(selected.ctr_decay * 100).toFixed(0)}%</strong> from {fmtPct(selected.first_7d_ctr)} → {fmtPct(selected.last_7d_ctr)} after day {selected.fatigue_day || '~14'}.
                  This creative has consumed <strong>{fmtUSD(selected.spend)}</strong>.
                </div>
                <div style={{ color: 'var(--text-secondary)', marginTop: 6 }}>
                  <strong style={{ color: 'var(--green)' }}>💡 Suggestion:</strong> The "{selected.theme}" theme + "{selected.format}" format initially worked well.
                  Consider creating a variant with fresh visuals (different {selected.dominant_color !== 'blue' ? 'blue' : 'green'} palette, updated copy) to capture renewed attention.
                </div>
              </div>
            </>
          ) : (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Select a creative to view its performance trend</div>
          )}
        </div>
      </div>

      {/* At-Risk Creatives */}
      {atRisk.length > 0 && (
        <div className="card" style={{ marginTop: 20 }}>
          <div className="card-header"><h3>🚨 At-Risk Creatives (Stable but CTR Declining &gt;40%)</h3></div>
          <div className="creatives-grid">
            {atRisk.slice(0, 8).map(c => (
              <div key={c.id} className="creative-card" onClick={() => setSelectedId(c.id)}>
                <img src={`/api/assets/${c.asset_file}`} alt="" loading="lazy" />
                <div className="info">
                  <h4>{c.headline}</h4>
                  <div className="meta">{c.format} · {c.theme} · {fmtUSD(c.spend)}</div>
                  <div className="metrics">
                    <div className="metric"><div className="label">CTR Decay</div><div className="val" style={{ color: 'var(--red)' }}>{(c.ctr_decay * 100).toFixed(0)}%</div></div>
                    <div className="metric"><div className="label">Days Active</div><div className="val">{c.days_active}</div></div>
                    <div className="metric"><div className="label">ROAS</div><div className="val">{c.roas.toFixed(2)}x</div></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
