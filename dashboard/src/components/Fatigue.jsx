import { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { fmtPct, statusLabel, CHART_COLORS } from '../utils';

export default function Fatigue({ data }) {
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

  const selected = selectedId
    ? data.creatives.find(c => c.id === selectedId)
    : fatigued[0];

  const ts = selected ? (data.timeSeries[selected.id] || []) : [];

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: 13 }}>
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
        <h2>⏳ Creative Fatigue Detection</h2>
        <p>Identify creatives losing effectiveness over time and at-risk assets</p>
      </div>

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-label">Fatigued Creatives</div>
          <div className="stat-value" style={{ color: 'var(--yellow)' }}>{fatigued.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">At Risk (Stable but Declining)</div>
          <div className="stat-value" style={{ color: 'var(--red)' }}>{atRisk.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Avg Fatigue Day</div>
          <div className="stat-value">{fatigued.length > 0 ? (fatigued.reduce((s, c) => s + (c.fatigue_day || 0), 0) / fatigued.length).toFixed(0) : '—'}</div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card" style={{ maxHeight: 500, overflowY: 'auto' }}>
          <div className="card-header"><h3>⚠️ Fatigued Creatives</h3></div>
          {fatigued.map(c => (
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
              <img src={`/${c.asset_file}`} alt="" style={{ width: 48, height: 36, objectFit: 'cover', borderRadius: 4 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.headline}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.advertiser} · Fatigue day {c.fatigue_day}</div>
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
            <h3>📉 CTR Over Time {selected ? `— #${selected.id}` : ''}</h3>
          </div>
          {selected && ts.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={ts}>
                  <XAxis dataKey="day" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => (v * 100).toFixed(1) + '%'} />
                  <Tooltip content={<CustomTooltip />} />
                  {selected.fatigue_day && (
                    <ReferenceLine x={selected.fatigue_day} stroke="var(--yellow)" strokeDasharray="5 5" label={{ value: 'Fatigue', fill: 'var(--yellow)', fontSize: 11 }} />
                  )}
                  <Line type="monotone" dataKey="ctr" name="CTR" stroke="var(--accent)" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="cvr" name="CVR" stroke="var(--green)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
              <div style={{ marginTop: 12, padding: '12px 16px', background: 'var(--yellow-bg)', borderRadius: 8, fontSize: 13 }}>
                <strong style={{ color: 'var(--yellow)' }}>⚠️ Fatigue Insight:</strong>
                <span style={{ color: 'var(--text-secondary)', marginLeft: 8 }}>
                  This creative's CTR dropped {Math.abs(selected.ctr_decay * 100).toFixed(0)}% after day {selected.fatigue_day || '~14'}.
                  First 7d CTR was {fmtPct(selected.first_7d_ctr)} → last 7d {fmtPct(selected.last_7d_ctr)}.
                  Consider rotating or refreshing this asset.
                </span>
              </div>
            </>
          ) : (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Select a creative to view its trend</div>
          )}
        </div>
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-header"><h3>🚨 At-Risk Creatives (Stable but CTR Declining &gt;40%)</h3></div>
        <div className="creatives-grid">
          {atRisk.slice(0, 8).map(c => (
            <div key={c.id} className="creative-card" onClick={() => setSelectedId(c.id)}>
              <img src={`/${c.asset_file}`} alt="" loading="lazy" />
              <div className="info">
                <h4>{c.headline}</h4>
                <div className="meta">{c.advertiser} · {c.format}</div>
                <div className="metrics">
                  <div className="metric"><div className="label">CTR Decay</div><div className="val" style={{ color: 'var(--red)' }}>{(c.ctr_decay * 100).toFixed(0)}%</div></div>
                  <div className="metric"><div className="label">Days Active</div><div className="val">{c.days_active}</div></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
