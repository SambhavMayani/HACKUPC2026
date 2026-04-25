import { useState, useRef, useEffect } from 'react';

const API_URL = 'https://ai.hackclub.com/proxy/v1/chat/completions';
const API_KEY = 'sk-hc-v1-b3c463038e7e43afaef110e4a4fa548fa28d333ac9174e619f1e1feed58e5d51';

function buildSystemPrompt(data, advInsight, selectedAdvertiser) {
  const { stats, creatives, traitAnalysis, countryPerf, osPerf } = data;

  const top5 = [...creatives].sort((a, b) => b.perf_score - a.perf_score).slice(0, 5);
  const worst5 = [...creatives].sort((a, b) => a.perf_score - b.perf_score).slice(0, 5);
  const fatigued = creatives.filter(c => c.status === 'fatigued').slice(0, 10);

  const topFormats = traitAnalysis?.format?.slice(0, 5) || [];
  const topThemes = traitAnalysis?.theme?.slice(0, 5) || [];

  const isCompany = selectedAdvertiser !== 'all';
  const companyContext = isCompany && advInsight ? `
COMPANY: ${advInsight.name} (${advInsight.vertical}, ${advInsight.region})
- ${advInsight.totalCreatives} creatives, ${advInsight.totalCampaigns} campaigns
- Spend: $${(advInsight.totalSpend).toFixed(0)} | Revenue: $${(advInsight.totalRevenue).toFixed(0)}
- ROAS: ${advInsight.roas.toFixed(2)}x | CPA: $${advInsight.cpa.toFixed(2)} | CTR: ${(advInsight.ctr * 100).toFixed(3)}%
- Status: ${advInsight.statusBreakdown.top_performer} top, ${advInsight.statusBreakdown.stable} stable, ${advInsight.statusBreakdown.fatigued} fatigued, ${advInsight.statusBreakdown.underperformer} under
- Wasted spend on underperformers: $${advInsight.wastedSpend.toFixed(0)}
- Spend at risk (fatigued): $${advInsight.fatiguedSpendAtRisk.toFixed(0)}
- Creative diversity score: ${(advInsight.diversityScore * 100).toFixed(0)}%
- Best format: ${advInsight.advTraits?.format?.[0]?.value || '—'} (score ${((advInsight.advTraits?.format?.[0]?.avg_perf || 0) * 100).toFixed(0)})
- Best theme: ${advInsight.advTraits?.theme?.[0]?.value || '—'} (score ${((advInsight.advTraits?.theme?.[0]?.avg_perf || 0) * 100).toFixed(0)})
- Best hook: ${advInsight.advTraits?.hook_type?.[0]?.value || '—'}
- Country perf: ${Object.entries(advInsight.countryPerf || {}).slice(0, 5).map(([c, p]) => `${c}: ROAS ${p.roas.toFixed(2)}x`).join(', ')}
- OS perf: ${Object.entries(advInsight.osPerf || {}).map(([o, p]) => `${o}: ROAS ${p.roas.toFixed(2)}x`).join(', ')}
` : '';

  return `You are the Creative Intelligence AI Copilot for Smadex, helping marketers understand their ad creative performance.
${isCompany ? `You are currently assisting ${advInsight.name} in the ${advInsight.vertical} vertical.` : 'You have access to data across all 36 advertisers.'}

${companyContext}

DATASET SUMMARY:
- ${stats.totalCreatives} creatives across ${stats.totalCampaigns} campaigns
- Total spend: $${(stats.totalSpend).toFixed(0)} | Total revenue: $${(stats.totalRevenue).toFixed(0)}
- Overall ROAS: ${(stats.totalRevenue / stats.totalSpend).toFixed(2)}x
- Status: ${stats.statusBreakdown.top_performer} top, ${stats.statusBreakdown.stable} stable, ${stats.statusBreakdown.fatigued} fatigued, ${stats.statusBreakdown.underperformer} under

TOP 5 CREATIVES:
${top5.map(c => `- #${c.id} "${c.headline}" (${c.advertiser}, ${c.format}): CTR=${(c.ctr * 100).toFixed(3)}%, ROAS=${c.roas.toFixed(2)}x, Score=${(c.perf_score * 100).toFixed(0)}`).join('\n')}

WORST 5:
${worst5.map(c => `- #${c.id} "${c.headline}" (${c.advertiser}): CTR=${(c.ctr * 100).toFixed(3)}%, ROAS=${c.roas.toFixed(2)}x`).join('\n')}

FATIGUED (sample):
${fatigued.map(c => `- #${c.id} "${c.headline}": fatigue day ${c.fatigue_day}, CTR decay ${(c.ctr_decay * 100).toFixed(0)}%`).join('\n')}

TOP FORMATS: ${topFormats.map(f => `${f.value} (score ${(f.avg_perf * 100).toFixed(0)})`).join(', ')}
TOP THEMES: ${topThemes.map(t => `${t.value} (score ${(t.avg_perf * 100).toFixed(0)})`).join(', ')}

COUNTRY: ${Object.entries(countryPerf).slice(0, 10).map(([c, p]) => `${c}: ROAS=${p.roas.toFixed(2)}x`).join(', ')}
OS: ${Object.entries(osPerf).map(([o, p]) => `${o}: ROAS=${p.roas.toFixed(2)}x`).join(', ')}

Be specific with numbers. Give actionable advice. Format with markdown. Be concise and useful for marketing professionals.`;
}

export default function Copilot({ data, advInsight, selectedAdvertiser }) {
  const isCompany = selectedAdvertiser !== 'all';
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Reset messages when advertiser changes
  useEffect(() => {
    setMessages([{
      role: 'assistant',
      content: isCompany
        ? `👋 Hi! I'm your Creative Intelligence Copilot for **${selectedAdvertiser}**.\n\nI have full access to your ${advInsight?.totalCreatives || 0} creatives across ${advInsight?.totalCampaigns || 0} campaigns.\n\n**Try asking:**\n- "How is my portfolio performing?"\n- "Which creatives should I pause?"\n- "What format works best for us?"\n- "Where am I wasting budget?"\n- "What should I test next?"`
        : `👋 Hi! I'm your Creative Intelligence Copilot.\n\nI have access to data across all 36 companies and 1,080 creatives.\n\n**Try asking:**\n- "Which company has the best ROAS?"\n- "Compare gaming vs ecommerce performance"\n- "What creative traits drive the best results?"\n- "Show me the most fatigued creatives"`
    }]);
  }, [selectedAdvertiser]);

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
      const systemPrompt = buildSystemPrompt(data, advInsight, selectedAdvertiser);
      const apiMessages = [
        { role: 'system', content: systemPrompt },
        ...messages.filter((m, i) => i > 0).map(m => ({ role: m.role, content: m.content })),
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
      setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ Failed to reach the AI service. Please check your connection and try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
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

  // Quick questions
  const quickQuestions = isCompany
    ? ['How am I performing?', 'Where am I wasting budget?', 'What should I test next?', 'Which creative should I scale?']
    : ['Best performing company?', 'Compare verticals', 'Top creative traits', 'Biggest fatigue risks'];

  return (
    <div>
      <div className="page-header">
        <h2>🤖 AI Copilot {isCompany && <span style={{ fontSize: 16, color: 'var(--accent)' }}>— {selectedAdvertiser}</span>}</h2>
        <p>Ask questions about {isCompany ? 'your' : 'all'} creative data in natural language</p>
      </div>

      <div className="copilot-container">
        {/* Quick question buttons */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
          {quickQuestions.map((q, i) => (
            <button
              key={i}
              onClick={() => { setInput(q); }}
              style={{
                background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20,
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
                <span style={{ color: 'var(--text-muted)' }}>Analyzing {isCompany ? selectedAdvertiser + "'s" : 'your'} data...</span>
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
            placeholder={`Ask about ${isCompany ? selectedAdvertiser + "'s" : 'your'} creative performance...`}
            rows={1}
          />
          <button className="copilot-send" onClick={send} disabled={loading || !input.trim()}>
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
