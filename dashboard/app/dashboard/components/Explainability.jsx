import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { BarChart3, Check, Dna, FlaskConical, Lightbulb, MessageCircle, MousePointerClick, Palette, Ruler, Shapes, TrendingDown, Trophy, X } from 'lucide-react';
import { fmtPct, fmtUSD, explainPerformance, getTopTraits, statusLabel, CHART_COLORS } from '../utils';

export default function Explainability({ data, insight, benchmark }) {
  const topPerformers = useMemo(() =>
    data.creatives.filter(c => c.status === 'top_performer').sort((a, b) => b.perf_score - a.perf_score),
    [data]
  );

  const traitData = useMemo(() => {
    const source = data.traitAnalysis || {};
    const result = {};
    const traits = ['format', 'theme', 'hook_type', 'dominant_color', 'emotional_tone', 'language'];
    for (const trait of traits) {
      const entries = (source[trait] || []).slice(0, 8);
      result[trait] = entries.map(e => ({
        name: e.value,
        perf: +(e.avg_perf * 100).toFixed(1),
        count: e.count,
      }));
    }
    return result;
  }, [data]);

  const traits = ['format', 'theme', 'hook_type', 'dominant_color', 'emotional_tone', 'language'];
  const traitLabels = { format: 'Ad Format', theme: 'Creative Theme', hook_type: 'Hook Type', dominant_color: 'Color Palette', emotional_tone: 'Emotional Tone', language: 'Language' };

  // Winning formula
  const winningFormula = useMemo(() => {
    if (topPerformers.length === 0) return null;
    const counts = { format: {}, theme: {}, hook_type: {}, dominant_color: {}, emotional_tone: {} };
    topPerformers.forEach(c => {
      for (const k of Object.keys(counts)) {
        const v = c[k] || 'unknown';
        counts[k][v] = (counts[k][v] || 0) + 1;
      }
    });
    const bestOf = {};
    for (const [k, m] of Object.entries(counts)) {
      bestOf[k] = Object.entries(m).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';
    }
    return bestOf;
  }, [topPerformers]);

  // Attribute correlations — compare top half vs bottom half by perf_score
  // (using median split instead of status label, since many advertisers have 0 top_performers)
  const attrCorrelations = useMemo(() => {
    const attrs = ['novelty', 'readability', 'brand_visibility', 'clutter', 'motion', 'text_density'];
    const cs = [...data.creatives].sort((a, b) => b.perf_score - a.perf_score);
    const midpoint = Math.floor(cs.length / 2);
    const top = cs.slice(0, Math.max(midpoint, 1));
    const rest = cs.slice(midpoint);
    return attrs.map(attr => {
      const topAvg = top.length > 0 ? top.reduce((s, c) => s + (c[attr] || 0), 0) / top.length : 0;
      const restAvg = rest.length > 0 ? rest.reduce((s, c) => s + (c[attr] || 0), 0) / rest.length : 0;
      return { attr, topAvg, restAvg, diff: topAvg - restAvg, absDiff: Math.abs(topAvg - restAvg) };
    }).sort((a, b) => b.absDiff - a.absDiff);
  }, [data]);

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0]?.payload;
    return (
      <div style={{ background: 'var(--bg-card-solid)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', fontSize: 12, boxShadow: 'var(--shadow)' }}>
        <div style={{ fontWeight: 600 }}>{d?.name}</div>
        <div style={{ color: 'var(--accent)', marginTop: 4 }}>Avg Score: {d?.perf}</div>
        <div style={{ color: 'var(--text-muted)', marginTop: 2 }}>{d?.count} creatives</div>
      </div>
    );
  };

  return (
    <div>
      <div className="page-header">
        <h2><Lightbulb size={22} /> Why Your Creatives Work (or Don't)</h2>
        <p>Understand the traits driving your best and worst performance</p>
      </div>

      {/* Winning Formula */}
      {winningFormula && (
        <div className="card" style={{ marginBottom: 24, background: 'linear-gradient(135deg, rgba(124,108,240,0.06), rgba(52,211,153,0.04))' }}>
          <div className="card-header"><h3><Dna size={18} /> Your Winning Creative Formula</h3></div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
            Based on your {topPerformers.length} top-performing creatives, this is the profile you should replicate:
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {[
              ['Format', winningFormula.format, Ruler],
              ['Theme', winningFormula.theme, Palette],
              ['Hook', winningFormula.hook_type, MousePointerClick],
              ['Color', winningFormula.dominant_color, Shapes],
              ['Tone', winningFormula.emotional_tone, MessageCircle],
            ].map(([label, val, Icon]) => (
              <div key={label} style={{ background: 'var(--bg-card-solid)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 18px', minWidth: 130 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}><Icon size={13} /> {label}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--accent)' }}>{val}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* What separates winners */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header"><h3><FlaskConical size={18} /> What Separates Your Winners</h3></div>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
          Comparing attribute values of your top performers vs the rest of your portfolio
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
          {attrCorrelations.map(a => (
            <div key={a.attr} style={{ background: 'var(--bg-primary)', borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, textTransform: 'capitalize' }}>{a.attr.replace('_', ' ')}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: a.diff > 0 ? 'var(--green)' : 'var(--red)' }}>
                  {a.diff > 0 ? '+' : ''}{(a.diff * 100).toFixed(0)}%
                </span>
              </div>
              <div style={{ display: 'flex', gap: 12, fontSize: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ color: 'var(--text-muted)', marginBottom: 2 }}>Your Best Creatives</div>
                  <div className="bar-fill-bg">
                    <div className="bar-fill" style={{ width: `${a.topAvg * 100}%`, background: 'var(--green)' }} />
                  </div>
                  <div style={{ color: 'var(--green)', fontWeight: 600, marginTop: 2 }}>{(a.topAvg * 100).toFixed(0)}%</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: 'var(--text-muted)', marginBottom: 2 }}>The Rest</div>
                  <div className="bar-fill-bg">
                    <div className="bar-fill" style={{ width: `${a.restAvg * 100}%`, background: 'var(--text-muted)' }} />
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontWeight: 600, marginTop: 2 }}>{(a.restAvg * 100).toFixed(0)}%</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Performers */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header"><h3><Trophy size={18} /> Your Top Performers — Why They Work</h3></div>
        <div className="creatives-grid">
          {topPerformers.slice(0, 6).map(c => {
            const reasons = explainPerformance(c);
            const cTraits = getTopTraits(c);
            return (
              <div key={c.id} className="creative-card">
                <img src={`/api/assets/${c.asset_file}`} alt={c.headline} loading="lazy" />
                <div className="info">
                  <h4>{c.headline}</h4>
                  <div className="meta">{c.format} · {c.theme}</div>
                  <span className={`status-badge ${c.status}`}>{statusLabel(c.status)}</span>
                  <div style={{ marginTop: 10 }}>
                    {reasons.map((r, i) => (
                      <div key={i} style={{ fontSize: 12, marginBottom: 4, display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                        <Check size={13} style={{ color: 'var(--green)', flexShrink: 0, marginTop: 1 }} />
                        <span style={{ color: 'var(--text-secondary)' }}>{r}</span>
                      </div>
                    ))}
                  </div>
                  {cTraits.length > 0 && (
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 8 }}>
                      {cTraits.slice(0, 4).map((t, i) => (
                        <span key={i} style={{ fontSize: 10, background: 'rgba(124,108,240,0.1)', border: '1px solid var(--border-accent)', padding: '3px 8px', borderRadius: 12, color: 'var(--accent-light)' }}>{t}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Trait Analysis */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header"><h3><BarChart3 size={18} /> What Works Best in Your Portfolio</h3></div>
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

      {/* Underperformers */}
      <div className="card">
        <div className="card-header"><h3><TrendingDown size={18} /> Your Underperformers — What's Going Wrong</h3></div>
        <div className="creatives-grid">
          {data.creatives.filter(c => c.status === 'underperformer').sort((a, b) => a.perf_score - b.perf_score).slice(0, 6).map(c => {
            const reasons = explainPerformance(c);
            return (
              <div key={c.id} className="creative-card">
                <img src={`/api/assets/${c.asset_file}`} alt={c.headline} loading="lazy" />
                <div className="info">
                  <h4>{c.headline}</h4>
                  <div className="meta">{c.format} · Spent {fmtUSD(c.spend)}</div>
                  <span className={`status-badge ${c.status}`}>{statusLabel(c.status)}</span>
                  <div style={{ marginTop: 10 }}>
                    {reasons.map((r, i) => (
                      <div key={i} style={{ fontSize: 12, marginBottom: 4, display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                        <X size={13} style={{ color: 'var(--red)', flexShrink: 0, marginTop: 1 }} />
                        <span style={{ color: 'var(--text-secondary)' }}>{r}</span>
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
