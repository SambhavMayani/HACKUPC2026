import { useState, useRef, useEffect } from 'react';

const API_URL = 'https://ai.hackclub.com/proxy/v1/chat/completions';
const API_KEY = 'sk-hc-v1-b3c463038e7e43afaef110e4a4fa548fa28d333ac9174e619f1e1feed58e5d51';

function buildSystemPrompt(data, insight, account) {
  const { stats, creatives, traitAnalysis, countryPerf, osPerf } = data;

  const top5 = [...creatives].sort((a, b) => b.perf_score - a.perf_score).slice(0, 5);
  const worst5 = [...creatives].sort((a, b) => a.perf_score - b.perf_score).slice(0, 5);
  const fatigued = creatives.filter(c => c.status === 'fatigued').slice(0, 10);

  return `You are a Creative Intelligence Advisor for ${account}, a ${insight?.vertical} advertiser using Smadex's ad platform.
You help marketing professionals optimize their ad creative performance. You are their dedicated analyst.

ALWAYS refer to the user's data as "your" — "your creatives", "your campaigns", "your spend".
Never expose data from other advertisers. Benchmarks are anonymous "industry averages".
Give actionable, specific advice a marketing engineer can execute.

${account}'s PORTFOLIO:
- ${stats.totalCreatives} creatives across ${stats.totalCampaigns} campaigns
- Spend: $${(stats.totalSpend).toFixed(0)} | Revenue: $${(stats.totalRevenue).toFixed(0)}
- ROAS: ${(stats.totalRevenue / stats.totalSpend).toFixed(2)}x
- Status: ${stats.statusBreakdown.top_performer} top performers, ${stats.statusBreakdown.stable} stable, ${stats.statusBreakdown.fatigued} fatigued, ${stats.statusBreakdown.underperformer} underperforming
${insight ? `- Wasted spend: $${insight.wastedSpend.toFixed(0)} | Fatigued spend at risk: $${(insight.fatiguedSpendAtRisk || 0).toFixed(0)}` : ''}
${insight ? `- CPA: $${insight.cpa.toFixed(2)} | Creative diversity: ${(insight.diversityScore * 100).toFixed(0)}%` : ''}

TOP 5 CREATIVES:
${top5.map(c => `- #${c.id} "${c.headline}" (${c.format}, ${c.theme}): CTR=${(c.ctr * 100).toFixed(3)}%, ROAS=${c.roas.toFixed(2)}x, Score=${(c.perf_score * 100).toFixed(0)}`).join('\n')}

WORST 5:
${worst5.map(c => `- #${c.id} "${c.headline}" (${c.format}): CTR=${(c.ctr * 100).toFixed(3)}%, ROAS=${c.roas.toFixed(2)}x, Spend=$${c.spend.toFixed(0)}`).join('\n')}

FATIGUED CREATIVES:
${fatigued.map(c => `- #${c.id} "${c.headline}": fatigue day ${c.fatigue_day}, CTR decay ${(c.ctr_decay * 100).toFixed(0)}%`).join('\n')}

BEST TRAITS FOR YOUR PORTFOLIO:
${Object.entries(traitAnalysis || {}).slice(0, 4).map(([trait, entries]) => `- ${trait}: ${entries.slice(0, 3).map(e => `${e.value} (score ${(e.avg_perf * 100).toFixed(0)})`).join(', ')}`).join('\n')}

COUNTRY PERFORMANCE: ${Object.entries(countryPerf).slice(0, 8).map(([c, p]) => `${c}: ROAS=${p.roas.toFixed(2)}x`).join(', ')}
PLATFORM: ${Object.entries(osPerf).map(([o, p]) => `${o}: ROAS=${p.roas.toFixed(2)}x`).join(', ')}

Be concise, use specific numbers from the data above, format with markdown. Always give actionable next steps.`;
}

export default function Copilot({ data, insight, account }) {
  const [messages, setMessages] = useState([{
    role: 'assistant',
    content: `👋 Hey! I'm your Creative Intelligence Advisor.\n\nI've analyzed your ${data.stats.totalCreatives} creatives across ${data.stats.totalCampaigns} campaigns. Ask me anything about your performance.\n\n**Try asking:**\n- "How are my creatives doing?"\n- "Where am I wasting budget?"\n- "What creative should I make next?"\n- "Which countries work best for me?"\n- "Why is my top creative performing well?"`
  }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    const q = input.trim();
    if (!q || loading) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: q }]);
    setLoading(true);

    try {
      const systemPrompt = buildSystemPrompt(data, insight, account);
      const apiMessages = [
        { role: 'system', content: systemPrompt },
        ...messages.filter((_, i) => i > 0).map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: q },
      ];

      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'google/gemini-3-flash-preview', messages: apiMessages }),
      });

      const json = await res.json();
      const reply = json.choices?.[0]?.message?.content || 'Sorry, I couldn\'t generate a response. Please try again.';
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ Connection issue. Please check your network and try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const renderMarkdown = (text) => {
    return text.split('\n').map((line, i) => {
      if (line.startsWith('### ')) return <h4 key={i} style={{ fontSize: 15, fontWeight: 700, marginTop: 12, marginBottom: 4 }}>{line.slice(4)}</h4>;
      if (line.startsWith('## ')) return <h3 key={i} style={{ fontSize: 16, fontWeight: 700, marginTop: 12, marginBottom: 4 }}>{line.slice(3)}</h3>;
      if (line.startsWith('- ')) return <div key={i} style={{ paddingLeft: 16, position: 'relative', marginTop: 2 }}><span style={{ position: 'absolute', left: 4 }}>•</span>{renderInline(line.slice(2))}</div>;
      if (line.trim() === '') return <br key={i} />;
      return <p key={i} style={{ marginTop: 4 }}>{renderInline(line)}</p>;
    });
  };

  const renderInline = (text) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>;
      return part;
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
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
          {quickQuestions.map((q, i) => (
            <button key={i} onClick={() => setInput(q)}
              style={{
                background: 'var(--bg-card-solid)', border: '1px solid var(--border)', borderRadius: 20,
                padding: '6px 14px', color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer',
                fontFamily: 'Inter, sans-serif', transition: 'var(--transition)',
              }}
              onMouseOver={e => { e.target.style.borderColor = 'var(--accent)'; e.target.style.color = 'var(--accent)'; }}
              onMouseOut={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.color = 'var(--text-secondary)'; }}
            >
              {q}
            </button>
          ))}
        </div>

        <div className="copilot-messages">
          {messages.map((msg, i) => (
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
            onChange={e => setInput(e.target.value)}
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
