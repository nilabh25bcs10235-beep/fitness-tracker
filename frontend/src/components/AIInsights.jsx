import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { analyzeBodyImageVision } from '../lib/visionAnalysis';
import ReactiveField from './reactive/ReactiveField';
import ImageAnalysisProgress from './ImageAnalysisProgress';
import BodyScanResults from './BodyScanResults';

const QUICK_PROMPTS = [
  'What should I eat for dinner to hit my protein goal?',
  'Give me a quick dairy-free snack idea',
  'How am I doing on calories today?',
  'Suggest a pre-workout meal',
];

function formatWhen(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function buildUserContext(user) {
  if (!user) return {};
  return {
    age: user.age,
    weight_kg: user.weight_kg,
    height_cm: user.height_cm,
    gender: user.gender,
    goal: user.goal,
    dietary_restrictions: user.dietary_restrictions,
  };
}

export default function AIInsights({ user }) {
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(true);
  const [showManage, setShowManage] = useState(false);
  const [bodyResult, setBodyResult] = useState(null);
  const [bodyLoading, setBodyLoading] = useState(false);
  const [bodyPreview, setBodyPreview] = useState(null);
  const [bodyProgress, setBodyProgress] = useState({ stageIndex: 0, stageLabel: '', progress: 0 });
  const [bodyDragOver, setBodyDragOver] = useState(false);
  const [error, setError] = useState('');
  const chatEndRef = useRef(null);
  const bodyFileRef = useRef(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const loadConversation = useCallback(async (id) => {
    const conv = await api.getCoachConversation(id);
    setConversationId(conv.id);
    setMessages(conv.messages || []);
    setError('');
  }, []);

  const refreshConversationList = useCallback(async () => {
    const list = await api.listCoachConversations();
    setConversations(list);
    return list;
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await refreshConversationList();
        if (cancelled) return;
        if (list.length > 0) {
          await loadConversation(list[0].id);
        } else {
          const conv = await api.createCoachConversation();
          if (cancelled) return;
          setConversationId(conv.id);
          setMessages([]);
          await refreshConversationList();
        }
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setInitLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [loadConversation, refreshConversationList]);

  const sendMessage = async (text) => {
    const content = (text || query).trim();
    if (!content || !conversationId || loading) return;

    const optimistic = {
      id: `tmp-${Date.now()}`,
      role: 'user',
      content,
      suggestions: [],
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setQuery('');
    setLoading(true);
    setError('');

    try {
      const res = await api.sendCoachMessage(conversationId, content);
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== optimistic.id),
        optimistic,
        res.message,
      ]);
      await refreshConversationList();
    } catch (e) {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setQuery(content);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const startNewConversation = async () => {
    setLoading(true);
    setError('');
    try {
      const conv = await api.createCoachConversation();
      setConversationId(conv.id);
      setMessages([]);
      setQuery('');
      setShowManage(false);
      await refreshConversationList();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const openConversation = async (id) => {
    setLoading(true);
    setError('');
    try {
      await loadConversation(id);
      setShowManage(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteConversation = async (id) => {
    setError('');
    try {
      await api.deleteCoachConversation(id);
      const list = await refreshConversationList();
      if (id === conversationId) {
        if (list.length > 0) {
          await loadConversation(list[0].id);
        } else {
          const conv = await api.createCoachConversation();
          setConversationId(conv.id);
          setMessages([]);
          await refreshConversationList();
        }
      }
    } catch (e) {
      setError(e.message);
    }
  };

  const processBodyFile = async (file) => {
    if (!file?.type?.startsWith('image/')) return;

    if (bodyPreview) URL.revokeObjectURL(bodyPreview);
    setBodyPreview(URL.createObjectURL(file));
    setBodyLoading(true);
    setBodyResult(null);
    setBodyProgress({ stageIndex: 0, stageLabel: 'Vision scan', progress: 0 });
    setError('');

    try {
      const res = await analyzeBodyImageVision(file, buildUserContext(user), {
        onProgress: setBodyProgress,
      });
      setBodyResult(res);
    } catch (err) {
      setError(err.message);
      setBodyPreview(null);
    } finally {
      setBodyLoading(false);
    }
  };

  const handleBodyUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) processBodyFile(file);
    e.target.value = '';
  };

  const handleBodyDrop = (e) => {
    e.preventDefault();
    setBodyDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processBodyFile(file);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const activeTitle = conversations.find((c) => c.id === conversationId)?.title || 'AI Coach';

  return (
    <div>
      <div className="card ai-greeting-card card-lively">
        <div className="coach-header">
          <div>
            <h2>AI Coach</h2>
            <p className="ai-greeting">HI HOW CAN I HELP YOU TODAY?</p>
          </div>
          <div className="coach-actions">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={startNewConversation}
              disabled={loading || initLoading}
            >
              New conversation
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setShowManage((v) => !v)}
              disabled={initLoading}
            >
              Manage conversations
            </button>
          </div>
        </div>
        <p style={{ color: 'var(--muted)' }}>
          Chat about nutrition and training, or upload a full-body photo for BMI and goal advice.
        </p>
      </div>

      {showManage && (
        <div className="card coach-manage-panel">
          <div className="coach-manage-header">
            <h3>Your conversations</h3>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowManage(false)}>
              Close
            </button>
          </div>
          {conversations.length === 0 ? (
            <p style={{ color: 'var(--muted)' }}>No conversations yet. Start chatting below.</p>
          ) : (
            <ul className="coach-convo-list">
              {conversations.map((c) => (
                <li key={c.id} className={c.id === conversationId ? 'active' : ''}>
                  <button type="button" className="coach-convo-open" onClick={() => openConversation(c.id)}>
                    <span className="coach-convo-title">{c.title}</span>
                    <span className="coach-convo-meta">
                      {c.message_count} messages · {formatWhen(c.updated_at)}
                    </span>
                    {c.preview && <span className="coach-convo-preview">{c.preview}</span>}
                  </button>
                  <button
                    type="button"
                    className="coach-convo-delete"
                    onClick={() => deleteConversation(c.id)}
                    aria-label={`Delete ${c.title}`}
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="card coach-chat-card card-lively">
        <div className="coach-chat-title">
          <span>{activeTitle}</span>
          <span className="ai-status on">✓ AI Coach Online</span>
        </div>

        <div className="coach-chat-thread">
          {initLoading ? (
            <p style={{ color: 'var(--muted)' }}>Loading conversation...</p>
          ) : messages.length === 0 ? (
            <p className="coach-chat-empty">Ask anything — follow-up questions work too.</p>
          ) : (
            messages.map((m) => (
              <div key={m.id} className={`coach-bubble coach-bubble-${m.role}`}>
                <p>{m.content}</p>
                {m.role === 'assistant' && m.suggestions?.length > 0 && (
                  <ul className="coach-suggestions">
                    {m.suggestions.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                )}
                <span className="coach-bubble-time">{formatWhen(m.created_at)}</span>
              </div>
            ))
          )}
          {loading && (
            <div className="coach-bubble coach-bubble-assistant coach-bubble-thinking">
              <p>Thinking...</p>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <div className="chip-row" style={{ marginBottom: '1rem' }}>
          {QUICK_PROMPTS.map((p) => (
            <button
              key={p}
              type="button"
              className="chip"
              style={{ cursor: 'pointer' }}
              onClick={() => sendMessage(p)}
              disabled={loading || initLoading}
            >
              {p}
            </button>
          ))}
        </div>

        <div className="coach-input-row">
          <ReactiveField
            theme="chat"
            as="textarea"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Continue the conversation..."
            disabled={loading || initLoading || !conversationId}
            rows={2}
          />
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => sendMessage()}
            disabled={loading || initLoading || !conversationId || !query.trim()}
          >
            {loading ? 'Sending...' : 'Send'}
          </button>
        </div>
        {error && <p className="error">{error}</p>}
      </div>

      <div className="card card-lively body-scan-card">
        <div className="body-scan-header">
          <div>
            <h3>Body Scan</h3>
            <p className="body-scan-sub">
              Upload a full-body photo. Groq vision and text models cross-check your profile
              through 5 review passes before delivering a full body composition report.
            </p>
          </div>
          <span className="scan-badge">Vision + Text AI</span>
        </div>

        <div
          className={`scan-upload-zone body-scan-upload ${bodyDragOver ? 'drag-over' : ''} ${bodyPreview ? 'has-preview' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setBodyDragOver(true); }}
          onDragLeave={() => setBodyDragOver(false)}
          onDrop={handleBodyDrop}
          onClick={() => bodyFileRef.current?.click()}
          onKeyDown={(e) => e.key === 'Enter' && bodyFileRef.current?.click()}
          role="button"
          tabIndex={0}
        >
          <input
            ref={bodyFileRef}
            type="file"
            accept="image/*"
            onChange={handleBodyUpload}
            disabled={bodyLoading}
          />
          {bodyPreview ? (
            <img src={bodyPreview} alt="Body scan preview" className="scan-upload-preview" />
          ) : (
            <>
              <div className="scan-upload-icon">🧍</div>
              <p className="scan-upload-title">Drop full-body photo here</p>
              <p className="scan-upload-hint">Stand straight, good lighting · click or drag to upload</p>
            </>
          )}
        </div>

        <ImageAnalysisProgress
          active={bodyLoading}
          stageIndex={bodyProgress.stageIndex}
          stageLabel={bodyProgress.stageLabel}
        />

        {!bodyLoading && bodyResult && (
          <BodyScanResults result={bodyResult} previewUrl={bodyPreview} />
        )}
      </div>
    </div>
  );
}