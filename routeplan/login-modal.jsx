// Login / Register gate — mandatory auth before product access.
// Multi-model LLM provider support: DeepSeek, OpenAI, Moonshot, Zhipu, Qwen, Anthropic.
// Stores JWT token + user info in localStorage.

const { useState: useStateLogin, useEffect: useEffectLogin } = React;

const AVATAR_COLORS = [
  { bg: '#FDE8E8', fg: '#C53030' },
  { bg: '#E8F4E8', fg: '#2F855A' },
  { bg: '#FEF3E2', fg: '#C05621' },
  { bg: '#E8EAF6', fg: '#3F51B5' },
  { bg: '#F3E5F5', fg: '#7B1FA2' },
  { bg: '#E0F2F1', fg: '#00695C' },
];

function LoginModal({ open, onLogin }) {
  const [mode, setMode] = useStateLogin('login');
  const [name, setName] = useStateLogin('');
  const [password, setPassword] = useStateLogin('');
  const [city, setCity] = useStateLogin('北京');
  const [provider, setProvider] = useStateLogin('deepseek');
  const [apiKey, setApiKey] = useStateLogin('');
  const [avatarIdx, setAvatarIdx] = useStateLogin(0);
  const [cityPickerOpen, setCityPickerOpen] = useStateLogin(false);
  const [error, setError] = useStateLogin('');
  const [loading, setLoading] = useStateLogin(false);
  const [models, setModels] = useStateLogin([]);

  useEffectLogin(function() {
    if (open) {
      setName(''); setPassword(''); setCity('北京'); setProvider('deepseek');
      setApiKey(''); setAvatarIdx(0); setError(''); setLoading(false); setMode('login');
      // Fetch model providers
      fetch((window.API_BASE || '') + '/api/auth/models')
        .then(function(r) { return r.json(); })
        .then(function(data) { setModels(data || []); })
        .catch(function() {
          setModels([
            { id: 'deepseek', name: 'DeepSeek', region: '国内', apiKeyUrl: 'https://platform.deepseek.com/api_keys' },
            { id: 'openai', name: 'OpenAI', region: '国外', apiKeyUrl: 'https://platform.openai.com/api-keys' },
            { id: 'moonshot', name: 'Moonshot 月之暗面', region: '国内', apiKeyUrl: 'https://platform.moonshot.cn/console/api-keys' },
            { id: 'zhipu', name: '智谱 GLM', region: '国内', apiKeyUrl: 'https://open.bigmodel.cn/usercenter/apikeys' },
          ]);
        });
    }
  }, [open]);

  if (!open) return null;

  var ac = AVATAR_COLORS[avatarIdx];
  var currentModel = models.find(function(m) { return m.id === provider; });
  var apiKeyUrl = currentModel ? currentModel.apiKeyUrl : 'https://platform.deepseek.com/api_keys';

  async function handleSubmit() {
    var t = name.trim();
    if (!t) { setError('请输入昵称'); return; }
    if (t.length > 10) { setError('昵称最多10个字'); return; }
    if (!password || password.length < 4) { setError('密码至少4位'); return; }

    setLoading(true); setError('');
    try {
      var endpoint = mode === 'register' ? '/api/auth/register' : '/api/auth/login';
      var body = mode === 'register'
        ? { name: t, password: password, city: city, provider: provider, apiKey: apiKey.trim() || null }
        : { name: t, password: password };

      var res = await fetch((window.API_BASE || '') + endpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      var data = await res.json();

      if (!data.success) { setError(data.error || '操作失败'); setLoading(false); return; }

      localStorage.setItem('_authToken', data.token);
      var userObj = {
        userId: data.userId, name: data.name, avatarIdx: avatarIdx,
        preferredCity: city, provider: provider,
        hasApiKey: mode === 'register' && apiKey.trim() ? true : false,
      };
      localStorage.setItem('_authUser', JSON.stringify(userObj));

      setLoading(false);
      onLogin({
        userId: data.userId, name: data.name,
        profileName: city === '上海' ? '上海探索者' : '北京探索者',
        preferredCity: city, avgBudget: 150,
        favoriteCategories: [], preferenceTags: { '高评分': 0.5, '性价比': 0.5 },
        avoidTags: {}, historyActions: [], isCustom: true,
        avatarIdx: avatarIdx, token: data.token, provider: provider,
      });
    } catch(e) {
      setError('网络错误，请检查后端是否启动');
      setLoading(false);
    }
  }

  return (
    <div style={{
      position: 'absolute', inset: 0, background: '#FBFBFD',
      zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        width: 340, background: '#fff', borderRadius: 24,
        padding: '36px 28px 28px', boxShadow: '0 24px 80px rgba(0,0,0,0.12)',
        textAlign: 'center',
      }}>
        {/* Avatar */}
        <div style={{ marginBottom: 20 }}>
          <div style={{
            width: 72, height: 72, borderRadius: 22,
            background: ac.bg, color: ac.fg, fontSize: 32, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 12px', boxShadow: '0 6px 24px rgba(0,0,0,0.08)',
          }}>{name ? name.charAt(0) : '?'}</div>
          {mode === 'register' && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
              {AVATAR_COLORS.map(function(c, i) { return (
                <button key={i} onClick={function() { setAvatarIdx(i); }} style={{
                  width: 26, height: 26, borderRadius: 8, background: c.bg,
                  border: i === avatarIdx ? '2px solid #FF6633' : '2px solid transparent',
                  cursor: 'pointer', padding: 0,
                  transform: i === avatarIdx ? 'scale(1.2)' : 'scale(1)', transition: 'all 0.15s',
                }} />
              );})}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', marginBottom: 24, background: '#F2F2F7', borderRadius: 10, padding: 3 }}>
          <button onClick={function() { setMode('login'); setError(''); }} style={{
            flex: 1, padding: '10px', borderRadius: 8, border: 'none', cursor: 'pointer',
            fontFamily: 'inherit', fontSize: 15, fontWeight: 600,
            background: mode === 'login' ? '#fff' : 'transparent',
            color: mode === 'login' ? '#1A1A1A' : '#8E8E93',
            boxShadow: mode === 'login' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.2s',
          }}>登录</button>
          <button onClick={function() { setMode('register'); setError(''); }} style={{
            flex: 1, padding: '10px', borderRadius: 8, border: 'none', cursor: 'pointer',
            fontFamily: 'inherit', fontSize: 15, fontWeight: 600,
            background: mode === 'register' ? '#fff' : 'transparent',
            color: mode === 'register' ? '#1A1A1A' : '#8E8E93',
            boxShadow: mode === 'register' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.2s',
          }}>注册</button>
        </div>

        <div style={{ fontSize: 20, fontWeight: 700, color: '#1A1A1A', marginBottom: 4 }}>
          {mode === 'register' ? '创建账户' : '欢迎回来'}
        </div>
        <div style={{ fontSize: 13, color: '#8E8E93', marginBottom: 20 }}>
          {mode === 'register' ? '注册后即可使用个性化路线规划' : '登录以继续使用'}
        </div>

        <input type="text" placeholder="昵称" value={name}
          onChange={function(e) { setName(e.target.value); setError(''); }} maxLength={10} autoFocus
          style={{ width: '100%', padding: '13px 16px', marginBottom: 12, fontSize: 15, fontWeight: 500,
            color: '#1A1A1A', border: error ? '1.5px solid #E53E3E' : '1.5px solid #E8E8EA',
            borderRadius: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
            background: '#F7F7F8' }}
        />

        <input type="password" placeholder="密码" value={password}
          onChange={function(e) { setPassword(e.target.value); setError(''); }}
          style={{ width: '100%', padding: '13px 16px', marginBottom: 12, fontSize: 15, fontWeight: 500,
            color: '#1A1A1A', border: error ? '1.5px solid #E53E3E' : '1.5px solid #E8E8EA',
            borderRadius: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
            background: '#F7F7F8' }}
        />

        {mode === 'register' && (
          <>
            {/* City picker box — matches sidebar style */}
            <button onClick={function() { setCityPickerOpen(true); }} style={{
              width: '100%', padding: '13px 16px', marginBottom: 12,
              background: '#F7F7F8', border: '1.5px solid #E8E8EA', borderRadius: 14,
              cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <Icon name="MapPin" size={16} color="#FF6633" />
              <span style={{ flex: 1, textAlign: 'left', fontSize: 15, fontWeight: 500, color: '#1A1A1A' }}>{city || '北京'}</span>
              <Icon name="ChevronRight" size={14} color="#C7C7CC" />
            </button>

            {/* Full city picker */}
            {cityPickerOpen && window.CityPickerFullPage && (
              <window.CityPickerFullPage
                currentCity={city}
                onSelect={function(c) { setCity(c); setCityPickerOpen(false); }}
                onClose={function() { setCityPickerOpen(false); }}
              />
            )}

            {/* Model provider selector */}
            <select value={provider} onChange={function(e) { setProvider(e.target.value); }}
              style={{ width: '100%', padding: '12px 16px', marginBottom: 8, fontSize: 14, fontWeight: 500,
                color: '#1A1A1A', border: '1.5px solid #E8E8EA', borderRadius: 14, outline: 'none',
                fontFamily: 'inherit', boxSizing: 'border-box', background: '#F7F7F8',
                appearance: 'none', WebkitAppearance: 'none', cursor: 'pointer',
              }}>
              {models.map(function(m) { return (
                <option key={m.id} value={m.id}>{m.name} ({m.region})</option>
              );})}
            </select>

            <input type="text" placeholder="API Key（可选，填入后使用你的Key调用）" value={apiKey}
              onChange={function(e) { setApiKey(e.target.value); }}
              style={{ width: '100%', padding: '13px 16px', marginBottom: 6, fontSize: 13, fontWeight: 500,
                color: '#1A1A1A', border: '1.5px solid #E8E8EA', borderRadius: 14, outline: 'none',
                fontFamily: 'inherit', boxSizing: 'border-box', background: '#F7F7F8' }}
            />
            <a href={apiKeyUrl} target="_blank" rel="noopener" style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              fontSize: 12, color: '#2456a6', textDecoration: 'none', fontWeight: 500,
            }}>
              <Icon name="ExternalLink" size={12} color="#2456a6" />
              获取 {currentModel ? currentModel.name : 'DeepSeek'} API Key
            </a>
          </>
        )}

        {error && (
          <div style={{ fontSize: 13, color: '#E53E3E', marginTop: 12, marginBottom: 4, textAlign: 'left', padding: '0 4px' }}>
            {error}
          </div>
        )}

        <button onClick={handleSubmit} disabled={loading} style={{
          width: '100%', marginTop: error ? 8 : 20, padding: '14px',
          background: loading ? '#FFB899' : '#FF6633', color: '#fff',
          border: 'none', borderRadius: 14, fontSize: 16, fontWeight: 700,
          cursor: loading ? 'default' : 'pointer', fontFamily: 'inherit',
          boxShadow: '0 4px 16px rgba(255,102,51,0.3)', transition: 'all 0.2s',
        }}>
          {loading ? '请稍候...' : (mode === 'register' ? '注册并开始使用' : '登录')}
        </button>
      </div>
    </div>
  );
}

function getAuthToken() {
  try { return localStorage.getItem('_authToken'); } catch(e) { return null; }
}
function getAuthUser() {
  try { return JSON.parse(localStorage.getItem('_authUser') || 'null'); } catch(e) { return null; }
}

Object.assign(window, { LoginModal, getAuthToken, getAuthUser });
