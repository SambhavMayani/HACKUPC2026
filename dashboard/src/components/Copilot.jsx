import { useState, useRef, useEffect } from 'react';

const API_URL = 'https://ai.hackclub.com/proxy/v1/chat/completions';
const API_KEY = 'sk-hc-v1-b3c463038e7e43afaef110e4a4fa548fa28d333ac9174e619f1e1feed58e5d51';

function buildSystemPrompt(data) {
  const { stats, creatives, campaigns, traitAnalysis, countryPerf, osPerf } = data;

  const top5 = [...creatives].sort((a, b) => b.perf_score - a.perf_score).slice(0, 5);
  const worst5 = [...creatives].sort((a, b) => a.perf_score - b.perf_score).slice(0, 5);
  const fatigued = creatives.filter(c => c.status === 'fatigued').slice(0, 10);

  const topFormats = traitAnalysis.format?.slice(0, 5) || [];
  const topThemes = traitAnalysis.theme?.slice(0, 5) || [];

  return `You are the Creative Intelligence AI Copilot for Smadex, helping advertisers understand their ad creative performance.

DATASET SUMMARY:
- ${stats.totalCreatives} creatives across ${stats.totalCampaigns} campaigns from ${stats.totalAdvertisers} advertisers
- Total spend: $${(stats.totalSpend / 1e6).toFixed(2)}M | Total revenue: $${(stats.totalRevenue / 1e6).toFixed(2)}M
- Overall ROAS: ${(stats.totalRevenue / stats.totalSpend).toFixed(2)}x
- Status breakdown: ${stats.statusBreakdown.top_performer} top performers, ${stats.statusBreakdown.stable} stable, ${stats.statusBreakdown.fatigued} fatigued, ${stats.statusBreakdown.underperformer} underperformers
- Verticals: gaming, ecommerce, fintech, travel, food_delivery, entertainment (180 creatives each)
- Formats: interstitial (344), native (289), rewarded_video (200), banner (199), playable (48)

TOP 5 CREATIVES BY PERFORMANCE SCORE:
${top5.map(c => `- #${c.id} "${c.headline}" (${c.advertiser}, ${c.vertical}, ${c.format}): CTR=${(c.ctr * 100).toFixed(3)}%, CVR=${(c.cvr * 100).toFixed(1)}%, ROAS=${c.roas.toFixed(2)}x, Score=${(c.perf_score * 100).toFixed(0)}`).join('\n')}

WORST 5 CREATIVES:
${worst5.map(c => `- #${c.id} "${c.headline}" (${c.advertiser}, ${c.vertical}, ${c.format}): CTR=${(c.ctr * 100).toFixed(3)}%, ROAS=${c.roas.toFixed(2)}x, Score=${(c.perf_score * 100).toFixed(0)}`).join('\n')}

FATIGUED CREATIVES (sample):
${fatigued.map(c => `- #${c.id} "${c.headline}": fatigue day ${c.fatigue_day}, CTR decay ${(c.ctr_decay * 100).toFixed(0)}%`).join('\n')}

TOP PERFORMING FORMATS: ${topFormats.map(f => `${f.value} (avg score ${(f.avg_perf * 100).toFixed(0)})`).join(', ')}
TOP PERFORMING THEMES: ${topThemes.map(t => `${t.value} (avg score ${(t.avg_perf * 100).toFixed(0)})`).join(', ')}

COUNTRY PERFORMANCE: ${Object.entries(countryPerf).slice(0, 10).map(([c, p]) => `${c}: ROAS=${p.roas.toFixed(2)}x`).join(', ')}
OS PERFORMANCE: ${Object.entries(osPerf).map(([o, p]) => `${o}: ROAS=${p.roas.toFixed(2)}x`).join(', ')}

Answer questions conversationally and helpfully. Use specific numbers. Give actionable advice. Format with markdown. Keep responses focused and concise.`;
}

export default function Copilot({ data }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: '👋 Hi! I\'m your Creative Intelligence Copilot. Ask me anything about your creative performance — which creatives are working, what\'s fatiguing, where to invest next, or any other question about your campaigns.\n\n**Try asking:**\n- "Which creatives should I scale up?"\n- "What format performs best for gaming?"\n- "Show me fatigued creatives for ecommerce"\n- "What should I test next?"' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const systemPrompt = useRef(buildSystemPrompt(data));

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
      const apiMessages = [
        { role: 'system', content: systemPrompt.current },
        ...messages.filter(m => m.role !== 'assistant' || messages.indexOf(m) > 0).map(m => ({ role: m.role, content: m.content })),
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

  // Simple markdown rendering
  const renderMarkdown = (text) => {
    return text.split('\n').map((line, i) => {
      if (line.startsWith('### ')) return <h4 key={i} style={{ fontSize: 15, fontWeight: 700, marginTop: 12, marginBottom: 4 }}>{line.slice(4)}</h4>;
      if (line.startsWith('## ')) return <h3 key={i} style={{ fontSize: 16, fontWeight: 700, marginTop: 12, marginBottom: 4 }}>{line.slice(3)}</h3>;
      if (line.startsWith('**') && line.endsWith('**')) return <strong key={i} style={{ display: 'block', marginTop: 8 }}>{line.slice(2, -2)}</strong>;
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

  return (
    <div>
      <div className="page-header">
        <h2>🤖 AI Copilot</h2>
        <p>Ask questions about your creative data in natural language</p>
      </div>

      <div className="copilot-container">
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
                <span style={{ color: 'var(--text-muted)' }}>Analyzing your data...</span>
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
            placeholder="Ask about your creative performance..."
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
