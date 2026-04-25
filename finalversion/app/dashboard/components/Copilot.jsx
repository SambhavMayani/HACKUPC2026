import { useState, useRef, useEffect } from 'react';

function buildCopilotContext(data, insight, account) {
  const { stats, creatives, traitAnalysis, countryPerf, osPerf } = data;

  const top5 = [...creatives].sort((a, b) => b.perf_score - a.perf_score).slice(0, 5);
  const worst5 = [...creatives].sort((a, b) => a.perf_score - b.perf_score).slice(0, 5);
  const fatigued = creatives.filter(c => c.status === 'fatigued').slice(0, 10);

  const summarizeCreative = (c) => ({
    id: c.id,
    headline: c.headline,
    campaignId: c.campaign_id,
    format: c.format,
    theme: c.theme,
    status: c.status,
    ctr: c.ctr,
    cvr: c.cvr,
    roas: c.roas,
    spend: c.spend,
    revenue: c.revenue,
    perfScore: c.perf_score,
    fatigueDay: c.fatigue_day,
    ctrDecay: c.ctr_decay,
  });

  return {
    account,
    vertical: insight?.vertical,
    region: insight?.region,
    portfolio: {
      ...stats,
      roas: stats.totalRevenue / Math.max(stats.totalSpend, 1),
      wastedSpend: insight?.wastedSpend,
      fatiguedSpendAtRisk: insight?.fatiguedSpendAtRisk,
      cpa: insight?.cpa,
      diversityScore: insight?.diversityScore,
    },
    topCreatives: top5.map(summarizeCreative),
    worstCreatives: worst5.map(summarizeCreative),
    fatiguedCreatives: fatigued.map(summarizeCreative),
    bestTraits: Object.fromEntries(Object.entries(traitAnalysis || {}).slice(0, 4)),
    countryPerf,
    osPerf,
    allowedScope: {
      advertisers: [account],
      creativeIds: creatives.map(c => String(c.id)),
      campaignIds: data.campaigns.map(c => String(c.id)),
      headlines: creatives.map(c => c.headline),
    },
  };
}

function renderEntityLinks(text, actions) {
  if (!actions) return text;

  const nodes = [];
  const pattern = /\b(Creative(?:\s+IDs?|\s+ID)?|Campaigns?)\s+((?:\d{5,6})(?:\s*(?:,|and|&)\s*\d{5,6})*)/gi;
  let lastIndex = 0;
  let match;

  while ((match = pattern.exec(text))) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));

    const kind = match[1].toLowerCase().startsWith('creative') ? 'creative' : 'campaign';
    const ids = match[2].match(/\d{5,6}/g) || [];
    nodes.push(`${match[1]} `);

    ids.forEach((id, idIndex) => {
      if (idIndex > 0) nodes.push(idIndex === ids.length - 1 ? ' and ' : ', ');
      const canLink = kind === 'creative' ? actions.hasCreative(id) : actions.hasCampaign(id);
      nodes.push(canLink ? (
        <button
          key={`${kind}-${id}-${match.index}-${idIndex}`}
          type="button"
          className="copilot-entity-link"
          onClick={() => (kind === 'creative' ? actions.onOpenCreative(id) : actions.onOpenCampaign(id))}
        >
          {id}
        </button>
      ) : id);
    });

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes.length ? nodes : text;
}

function initialMessages(data) {
  return [{
    role: 'assistant',
    content: `👋 Hey! I'm your Creative Intelligence Advisor.\n\nI've analyzed your ${data.stats.totalCreatives} creatives across ${data.stats.totalCampaigns} campaigns. Ask me anything about your performance.\n\n**Try asking:**\n- "How are my creatives doing?"\n- "Where am I wasting budget?"\n- "What creative should I make next?"\n- "Which countries work best for me?"\n- "Why is my top creative performing well?"`
  }];
}

export default function Copilot({
  data,
  insight,
  account,
  messages,
  onMessagesChange,
  input,
  onInputChange,
  includeNews,
  onIncludeNewsChange,
  onOpenCampaign,
  onOpenCreative,
}) {
  const visibleMessages = messages || initialMessages(data);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const linkActions = {
    hasCreative: (id) => data.creatives.some(c => String(c.id) === String(id)),
    hasCampaign: (id) => data.campaigns.some(c => String(c.id) === String(id)),
    onOpenCreative: (id) => onOpenCreative?.(id),
    onOpenCampaign: (id) => onOpenCampaign?.(id),
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [visibleMessages]);

  const send = async () => {
    const q = input.trim();
    if (!q || loading) return;
    onInputChange('');
    const nextMessages = [...visibleMessages, { role: 'user', content: q }];
    onMessagesChange(nextMessages);
    setLoading(true);

    try {
      const res = await fetch('/api/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: q,
          context: buildCopilotContext(data, insight, account),
          includeNews,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'AI request failed');
      }
      const reply = json.content || 'Sorry, I couldn\'t generate a response. Please try again.';
      onMessagesChange([...nextMessages, { role: 'assistant', content: reply }]);
    } catch (err) {
      onMessagesChange([...nextMessages, { role: 'assistant', content: `⚠️ ${err.message || 'Connection issue. Please check your network and try again.'}` }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const renderMarkdown = (text) => {
    return text.split('\n').map((line, i) => {
      if (line.startsWith('### ')) return <h4 key={i} style={{ fontSize: 15, fontWeight: 700, marginTop: 12, marginBottom: 4 }}>{renderInline(line.slice(4))}</h4>;
      if (line.startsWith('## ')) return <h3 key={i} style={{ fontSize: 16, fontWeight: 700, marginTop: 12, marginBottom: 4 }}>{renderInline(line.slice(3))}</h3>;
      if (line.startsWith('- ')) return <div key={i} style={{ paddingLeft: 16, position: 'relative', marginTop: 2 }}><span style={{ position: 'absolute', left: 4 }}>•</span>{renderInline(line.slice(2))}</div>;
      if (line.trim() === '') return <br key={i} />;
      return <p key={i} style={{ marginTop: 4 }}>{renderInline(line)}</p>;
    });
  };

  const renderInline = (text) => {
    const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) return <strong key={i}>{renderEntityLinks(part.slice(2, -2), linkActions)}</strong>;
      if (part.startsWith('*') && part.endsWith('*')) return <em key={i}>{renderEntityLinks(part.slice(1, -1), linkActions)}</em>;
      if (part.startsWith('`') && part.endsWith('`')) return <code key={i}>{part.slice(1, -1)}</code>;
      const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (linkMatch) return <a key={i} href={linkMatch[2]} target="_blank" rel="noreferrer">{linkMatch[1]}</a>;
      return renderEntityLinks(part, linkActions);
    });
  };

  const quickQuestions = [
    'How am I doing overall?',
    'Where am I wasting budget?',
    'What should I create next?',
    'Which creatives should I scale?',
    'Which country performs best?',
  ];

  return (
    <div>
      <div className="page-header">
        <h2>🤖 Your AI Advisor</h2>
        <p>Ask questions about your creative performance in natural language</p>
      </div>

      <div className="copilot-container">
        <div className="copilot-toolbar">
          {quickQuestions.map((q, i) => (
            <button key={i} type="button" className="quick-question" onClick={() => onInputChange(q)}>
              {q}
            </button>
          ))}
          <label className="news-toggle">
            <input
              type="checkbox"
              checked={includeNews}
              onChange={e => onIncludeNewsChange(e.target.checked)}
            />
            <span>Include current trend news</span>
          </label>
        </div>

        <div className="copilot-messages">
          {visibleMessages.map((msg, i) => (
            <div key={i} className={`copilot-msg ${msg.role}`}>
              {msg.role === 'assistant' ? renderMarkdown(msg.content) : msg.content}
            </div>
          ))}
          {loading && (
            <div className="copilot-msg assistant">
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                <span style={{ color: 'var(--text-muted)' }}>Analyzing your data…</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="copilot-input-area">
          <textarea
            className="copilot-input"
            value={input}
            onChange={e => onInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your creative performance…"
            rows={1}
          />
          <button className="copilot-send" onClick={send} disabled={loading || !input.trim()}>Send</button>
        </div>
      </div>
    </div>
  );
}
