// Chat home screen — welcome, user input, requirement card, route card.

const { useState: useStateChat, useEffect: useEffectChat, useRef: useRefChat } = React;

// ─── Top bar (redesigned: icon-forward, minimal text) ──────────
function ChatTopBar({ city, onCityClick, onMenuClick, onNewChat, title }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 14px', background: '#FBFBFD',
      borderBottom: '1px solid rgba(0,0,0,0.04)',
    }}>
      {/* Left: hamburger menu */}
      <button onClick={onMenuClick} style={{
        width: 36, height: 36, borderRadius: 10,
        background: 'transparent', border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 0,
      }}>
        <Icon name="Menu" size={22} color="#1A1A1A" />
      </button>

      {/* Center: title + city */}
      <div style={{ textAlign: 'center', flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 17, color: '#1A1A1A' }}>
          {title || '路线助手'}
        </div>
        <button onClick={onCityClick} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 11, color: '#8E8E93', fontWeight: 500,
          display: 'inline-flex', alignItems: 'center', gap: 2,
          padding: '2px 0 0', fontFamily: 'inherit',
        }}>
          <Icon name="MapPin" size={9} color="#C0C0C8" />
          {city || '北京'}
        </button>
      </div>

      {/* Right: new chat */}
      <button onClick={onNewChat} style={{
        width: 36, height: 36, borderRadius: 10,
        background: 'transparent', border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 0,
      }}>
        <Icon name="SquarePen" size={20} color="#1A1A1A" />
      </button>
    </div>);
}

// ─── Sidebar ────────────────────────────────────────────────────
function Sidebar({ open, onClose, currentUser, onLogout, history, onReplayHistory, favorites, onOpenDetail, city, onCityChange }) {
  var [favList, setFavList] = useStateChat([]);
  useEffectChat(function() {
    if (open && window.getFavorites) {
      window.getFavorites().then(function(f) { setFavList(f || []); }).catch(function() {});
    }
  }, [open]);

  if (!open) return null;

  return (
    <div>
      <div onClick={onClose} style={{
        position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)',
        zIndex: 100,
      }} />
      <div style={{
        position: 'absolute', top: 0, left: 0, bottom: 0,
        width: 285, background: '#FFF', zIndex: 101,
        display: 'flex', flexDirection: 'column',
        boxShadow: '8px 0 40px rgba(0,0,0,0.06)',
        animation: 'slideInLeft 0.22s ease-out',
      }}>
        {/* User profile card */}
        <div style={{ padding: '24px 18px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 16,
              background: 'linear-gradient(135deg, #FFE4D0, #FFC8AA)',
              color: '#E94A1A', fontSize: 20, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, boxShadow: '0 2px 8px rgba(233,74,26,0.12)',
            }}>
              {currentUser ? currentUser.name.charAt(0) : '?'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#1A1A1A' }}>
                {currentUser ? currentUser.name : '未登录'}
              </div>
              <div style={{ fontSize: 12, color: '#8E8E93', marginTop: 2 }}>
                {currentUser && currentUser.profileName ? currentUser.profileName : city}
              </div>
            </div>
          </div>
        </div>

        {/* New chat button */}
        <div style={{ padding: '0 18px 16px' }}>
          <button onClick={function() { onClose(); }} style={{
            width: '100%', padding: '11px 0',
            background: '#FF6633', color: '#fff', border: 'none',
            borderRadius: 14, fontSize: 14, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            boxShadow: '0 2px 12px rgba(255,102,51,0.25)',
          }}>
            <Icon name="Plus" size={16} color="#fff" /> 新对话
          </button>
        </div>

        {/* City picker */}
        <div style={{ display: 'flex', gap: 8, padding: '0 18px', marginBottom: 18 }}>
          {['北京', '上海'].map(function(c) { return (
            <button key={c} onClick={function() { if (onCityChange) onCityChange(c); }} style={{
              flex: 1, padding: '9px 0', fontSize: 13, fontWeight: 600,
              color: city === c ? '#FF6633' : '#8E8E93',
              background: city === c ? '#FFF5F0' : '#F7F7F8',
              border: city === c ? '1.5px solid #FFC8AA' : '1px solid transparent',
              borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit',
              transition: 'all 0.15s',
            }}>{c}</button>
          );})}
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: '#F0F0F3', margin: '0 18px' }} />

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px' }}>
          {/* Favorites */}
          {favList.length > 0 && (
            <div style={{ marginBottom: 22 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#8E8E93', marginBottom: 10, letterSpacing: 0.3 }}>
                <Icon name="Bookmark" size={13} color="#8E8E93" style={{ marginRight: 5 }} />收藏
              </div>
              {favList.slice(0, 8).map(function(f) { return (
                <div key={f.id} onClick={function() {
                  try { var route = JSON.parse(f.routeJson); if (onOpenDetail) onOpenDetail(route); onClose(); } catch(e) {}
                }} style={{
                  padding: '11px 14px', cursor: 'pointer', borderRadius: 12,
                  background: '#F9F9FB', marginBottom: 6,
                  border: '1px solid #F0F0F3', transition: 'all 0.15s',
                }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1A1A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {f.routeName || '路线'}
                  </div>
                  <div style={{ fontSize: 11, color: '#8E8E93', marginTop: 3 }}>{f.totalTime || ''} · ¥{f.totalCost || 0}</div>
                </div>
              );})}
            </div>
          )}

          {/* History */}
          {history && history.length > 0 && (
            <div style={{ marginBottom: 22 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#8E8E93', marginBottom: 10, letterSpacing: 0.3 }}>
                <Icon name="Clock" size={13} color="#8E8E93" style={{ marginRight: 5 }} />历史对话
              </div>
              {history.slice(0, 12).map(function(h, i) { return (
                <div key={i} onClick={function() { if (onReplayHistory) onReplayHistory(i); onClose(); }} style={{
                  padding: '11px 14px', cursor: 'pointer', borderRadius: 12,
                  background: '#F9F9FB', marginBottom: 6,
                  border: '1px solid #F0F0F3', transition: 'all 0.15s',
                }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1A1A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {h.scene || '对话'}
                  </div>
                  <div style={{ fontSize: 11, color: '#8E8E93', marginTop: 3 }}>{h.firstQuery ? h.firstQuery.substring(0, 28) : h.timeLabel}</div>
                </div>
              );})}
            </div>
          )}
        </div>

        {/* Logout */}
        <div style={{ padding: '12px 18px 18px' }}>
          <button onClick={function() { if (onLogout) onLogout(); onClose(); }} style={{
            width: '100%', padding: '11px 0',
            background: '#FFF', border: '1.5px solid #EDEDEF', borderRadius: 14,
            fontSize: 13, fontWeight: 600, color: '#8E8E93',
            cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            <Icon name="LogOut" size={14} color="#8E8E93" /> 退出登录
          </button>
        </div>
      </div>
      <style>{`
        @keyframes slideInLeft {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}

// ─── City picker bottom sheet ──────────────────────────────────
const CITIES = [
  { name: '北京', district: '朝阳·海淀·东城' },
  { name: '上海', district: '黄浦·浦东·静安' },
];

function CityPickerSheet({ open, currentCity, onSelect, onClose }) {
  if (!open) return null;
  return (
    <div onClick={onClose} className="fade-up" style={{
      position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)',
      zIndex: 160, display: 'flex', alignItems: 'flex-end', justifyContent: 'center'
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: '100%', maxWidth: 420, maxHeight: '50%',
        background: '#fff', borderRadius: '20px 20px 0 0',
        overflow: 'hidden', display: 'flex', flexDirection: 'column',
        animation: 'sheetUp 0.24s ease-out'
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 6px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 999, background: '#D1D1D6' }} />
        </div>
        <div style={{ padding: '6px 20px 12px', fontSize: 16, fontWeight: 700, color: '#1a1a1a' }}>
          选择城市
        </div>
        <div style={{ padding: '0 16px 20px', overflowY: 'auto' }}>
          {CITIES.map((c) => (
            <button key={c.name} onClick={() => { onSelect(c.name); onClose(); }} style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 12px', marginBottom: 8,
              background: currentCity === c.name ? '#FFF1E5' : '#F7F7F8',
              border: currentCity === c.name ? '1.5px solid #FFC8AA' : '1px solid #EDEDEF',
              borderRadius: 12, cursor: 'pointer',
            }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a', textAlign: 'left' }}>{c.name}</div>
                <div style={{ fontSize: 12, color: '#8e8e93', textAlign: 'left', marginTop: 2 }}>{c.district}</div>
              </div>
              {currentCity === c.name && <Icon name="Check" size={18} color="#FF6633" />}
            </button>
          ))}
        </div>
      </div>
      <style>{`
        @keyframes sheetUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

// ─── Welcome panel (initial state) ─────────────────────────────
const QUICK_CARDS = [
{ label: '朋友聚会', icon: 'Users', hint: '好吃好聊', bg: '#FFF1E5', fg: '#E94A1A' },
{ label: '情侣约会', icon: 'Heart', hint: '安静出片', bg: '#FDE8E8', fg: '#C53030' },
{ label: '一个人放松', icon: 'Coffee', hint: '咖啡书店', bg: '#E8F4E8', fg: '#2F855A' },
{ label: '亲子遛娃', icon: 'Baby', hint: '遛娃乐园', bg: '#FEF3E2', fg: '#C05621' },
{ label: '下班回血', icon: 'Soup', hint: '快吃暖胃', bg: '#E6EEF8', fg: '#2456a6' },
{ label: '临时救场', icon: 'Zap', hint: '附近立刻', bg: '#F3E5F5', fg: '#7B1FA2' }];


// Card tint mapping — peach / green / blue cycle, matches the home mock.
const CARD_TINTS = [
{ bg: '#FFF1E5', fg: '#E94A1A' },
{ bg: '#EAF6EC', fg: '#2c7a44' },
{ bg: '#E6EEF8', fg: '#2456a6' }];

// Expose to other scripts (need-completion.jsx, etc.)
window.CARD_TINTS = CARD_TINTS;


// Demo entry points removed — the composer carries the typed path now.

function WelcomeBlock({ onPickScene }) {
  return (
    <div className="fade-up" style={{ padding: '20px 18px 0' }}>
      {/* Hero — simplified */}
      <div style={{ marginBottom: 32, textAlign: 'center' }}>
        <h1 style={{
          margin: 0, fontSize: 26, fontWeight: 800, color: '#1A1A1A',
          letterSpacing: -1, lineHeight: 1.1, marginBottom: 8,
        }}>今天去哪？</h1>
        <p style={{
          margin: 0, fontSize: 14, color: '#8E8E93', lineHeight: 1.5,
        }}>
          选一个场景，或直接说出你的需求
        </p>
      </div>

      {/* Scene grid — large icon cards */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10,
      }}>
        {QUICK_CARDS.map(function(c) {
          return (
            <button key={c.label} onClick={function() { onPickScene(c.label); }} style={{
              background: '#fff', border: '1px solid #EDEDEF', borderRadius: 16,
              padding: '20px 16px', textAlign: 'center', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
              transition: 'all 0.15s', fontFamily: 'inherit',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            }}>
              <div style={{
                width: 56, height: 56, borderRadius: 16,
                background: c.bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon name={c.icon} size={28} color={c.fg} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16, color: '#1A1A1A', marginBottom: 2 }}>
                  {c.label}
                </div>
                <div style={{ fontSize: 12, color: '#8E8E93' }}>{c.hint}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── User bubble ───────────────────────────────────────────────
function UserBubble({ text }) {
  return (
    <div className="fade-up" style={{
      display: 'flex', justifyContent: 'flex-end', padding: '0 16px', marginBottom: 14
    }}>
      <div style={{
        background: '#FF6633',
        color: '#fff', fontSize: 14.5, lineHeight: 1.55,
        padding: '11px 14px', borderRadius: '16px 4px 16px 16px',
        maxWidth: '78%'
      }}>{text}</div>
    </div>);

}

// ─── Assistant message wrapper ─────────────────────────────────
function AssistantMsg({ children, label }) {
  return (
    <div className="fade-up" style={{ display: 'flex', gap: 10, padding: '0 16px', marginBottom: 14 }}>
      <AssistantAvatar size={32} />
      <div style={{ flex: 1, minWidth: 0 }}>
        {label && <div style={{ fontSize: 11.5, color: '#8e8e93', marginBottom: 4 }}>{label}</div>}
        {children}
      </div>
    </div>);

}

// ─── Loading bubble ───────────────────────────────────────────
function LoadingMsg({ text }) {
  return (
    <AssistantMsg label="路线助手 · 处理中">
      <div style={{
        background: '#fff', border: '1px solid #EDEDEF',
        borderRadius: '4px 16px 16px 16px', padding: '12px 14px',
        fontSize: 14, color: '#1d1d1f', lineHeight: 1.55,
        display: 'flex', alignItems: 'center', gap: 10
      }}>
        <LoadingDots />
        <span>{text}</span>
      </div>
    </AssistantMsg>);

}

// ─── Requirement understanding card ────────────────────────────
function RequirementCard({ onConfirm, onAddMore }) {
  return (
    <AssistantMsg label="路线助手 · 需求整理">
      <div style={{
        background: '#fff', border: '1px solid #EDEDEF', borderRadius: 16,
        padding: '14px 14px 12px', boxShadow: '0 1px 0 rgba(0,0,0,0.02)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <Icon name="ListChecks" size={15} color="#FF6633" />
          <span style={{ fontSize: 14, fontWeight: 600 }}>我先帮你整理一下需求</span>
        </div>
        <div style={{ fontSize: 12, color: '#8e8e93', marginBottom: 12 }}>
          有「<span style={{ color: '#1d63b8' }}>可改</span>」标记的字段你可以点开调整
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {REQUIREMENTS.map((r) =>
          <div key={r.label} style={{
            display: 'flex', alignItems: 'flex-start', gap: 10,
            padding: '9px 11px',
            background: '#F7F7F8', borderRadius: 10
          }}>
              <div style={{
              width: 22, height: 22, borderRadius: 6,
              background: '#fff', border: '1px solid #EDEDEF',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, marginTop: 1
            }}>
                <Icon name={r.icon} size={12} color="#6E6E73" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11.5, color: '#8e8e93', marginBottom: 2 }}>{r.label}</div>
                <div style={{ fontSize: 13.5, color: '#1a1a1a', lineHeight: 1.4 }}>{r.value}</div>
              </div>
              {r.status === 'inferred' &&
            <span style={{
              fontSize: 11, color: '#1d63b8', background: '#E6EEF8',
              padding: '2px 7px', borderRadius: 999, fontWeight: 500,
              display: 'inline-flex', alignItems: 'center', gap: 3, flexShrink: 0
            }}>
                  <Icon name="Pencil" size={10} />
                  可改
                </span>
            }
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <SecondaryBtn onClick={onAddMore} icon="Plus" size="md">我再补充一下</SecondaryBtn>
          <div style={{ flex: 1 }}>
            <PrimaryBtn onClick={onConfirm} icon="Sparkles" full size="md">确认，生成路线</PrimaryBtn>
          </div>
        </div>
      </div>
    </AssistantMsg>);

}

// ─── Route summary card (main push) ────────────────────────────
function RouteCard({ onOpenDetail, onNav, onAdjust, onChip }) {
  const r = MOCK_ROUTE;
  return (
    <AssistantMsg label="路线助手 · 为你定制">
      <div style={{
        background: '#fff', border: '1px solid #EDEDEF', borderRadius: 16,
        overflow: 'hidden',
        boxShadow: '0 4px 14px rgba(180, 100, 40, 0.06)'
      }}>
        {/* header strip */}
        <div style={{
          padding: '12px 14px 10px',
          background: 'linear-gradient(180deg, #FFF6EC 0%, #FFFFFF 100%)',
          borderBottom: '1px solid #EDEDEF'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <Icon name="Sparkles" size={14} color="#FF6633" />
            <span style={{ fontSize: 12.5, color: '#E94A1A', fontWeight: 600, letterSpacing: 0.3 }}>
              为你生成一条主推路线
            </span>
          </div>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#1a1a1a', marginBottom: 8 }}>
            {r.route_name}
          </div>

          {/* sequence */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
            {(window.MOCK_PLACES || MOCK_PLACES).map((p, i) =>
            <React.Fragment key={p.id}>
                <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                background: '#fff', border: '1px solid #EDEDEF',
                padding: '4px 9px 4px 4px', borderRadius: 999
              }}>
                  <span style={{
                  width: 17, height: 17, borderRadius: 999,
                  background: '#FF6633', color: '#fff',
                  fontSize: 10.5, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }} className="num">{i + 1}</span>
                  <span style={{ fontSize: 12, color: '#1a1a1a', fontWeight: 500 }}>{p.short}</span>
                </div>
                {i < (window.MOCK_PLACES || MOCK_PLACES).length - 1 &&
              <Icon name="ArrowRight" size={12} color="#c5beb1" />
              }
              </React.Fragment>
            )}
          </div>
        </div>

        {/* stats grid */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1,
          background: '#EDEDEF'
        }}>
          {[
          { l: '预计耗时', v: r.total_time, icon: 'Clock' },
          { l: '人均预算', v: r.total_budget, icon: 'Wallet' },
          { l: '总步行', v: r.total_distance, icon: 'Footprints' },
          { l: '交通方式', v: '地铁 10 号线', icon: 'TrainFront' }].
          map((s, i) =>
          <div key={i} style={{
            background: '#fff', padding: '9px 12px',
            display: 'flex', flexDirection: 'column', gap: 2
          }}>
              <div style={{
              fontSize: 11, color: '#8e8e93',
              display: 'flex', alignItems: 'center', gap: 4
            }}>
                <Icon name={s.icon} size={11} color="#8e8e93" />
                {s.l}
              </div>
              <div className={s.l !== '交通方式' ? 'num' : ''} style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a' }}>{s.v}</div>
            </div>
          )}
        </div>

        {/* risk row */}
        <div style={{
          padding: '10px 14px',
          display: 'flex', alignItems: 'flex-start', gap: 6,
          fontSize: 12.5, color: '#D14600',
          background: '#FFFBF4',
          borderTop: '1px solid #EDEDEF',
          borderBottom: '1px solid #EDEDEF',
          lineHeight: 1.45
        }}>
          <Icon name="AlertTriangle" size={13} color="#D14600" style={{ marginTop: 2 }} />
          <span><strong style={{ fontWeight: 600 }}>留意：</strong>{r.risk_summary}</span>
        </div>

        {/* reasoning */}
        <div style={{ padding: '12px 14px' }}>
          <div style={{
            fontSize: 12, color: '#6E6E73', marginBottom: 6,
            display: 'flex', alignItems: 'center', gap: 4
          }}>
            <Icon name="MessageCircleHeart" size={12} color="#6E6E73" />
            我为什么选这条
          </div>
          <div style={{ fontSize: 13.5, lineHeight: 1.6, color: '#1d1d1f' }}>
            {r.recommendation_reason}
          </div>
        </div>

        {/* actions */}
        <div style={{
          display: 'flex', gap: 8, padding: '0 14px 14px'
        }}>
          <div style={{ flex: 1.4 }}>
            <PrimaryBtn onClick={onOpenDetail} icon="Map" full size="md">查看路线详情</PrimaryBtn>
          </div>
          <SecondaryBtn onClick={onNav} icon="Navigation">导航第一站</SecondaryBtn>
        </div>
        <button onClick={onAdjust} style={{
          width: '100%', padding: '10px', background: '#F7F7F8',
          border: 'none', borderTop: '1px solid #EDEDEF',
          fontSize: 13, color: '#1d1d1f', fontWeight: 500,
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5
        }}>
          <Icon name="Wand2" size={13} color="#1d1d1f" />
          帮我调整这条路线
        </button>
      </div>

      {/* quick-edit chips */}
      <div style={{ marginTop: 10, marginBottom: 2 }}>
        <div style={{ fontSize: 11.5, color: '#8e8e93', marginBottom: 6 }}>快捷调整 ↓</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {['更便宜一点', '少走路', '不想排队', '换个口味', '更适合拍照', '改成地铁优先', '加一个咖啡店'].map((c) =>
          <Chip key={c} onClick={() => onChip(c)}>{c}</Chip>
          )}
        </div>
      </div>
    </AssistantMsg>);

}

// ─── Composer ──────────────────────────────────────────────────
function Composer({ value, onChange, onSend, placeholder }) {
  const [voiceMode, setVoiceMode] = useStateChat(false);
  const [recording, setRecording] = useStateChat(false);

  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0,
      background: 'linear-gradient(180deg, rgba(247,247,248,0) 0%, #F7F7F8 22%)',
      padding: '12px 10px 22px', zIndex: 20
    }}>
      {voiceMode ? (
        /* Voice mode */
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={function() { setVoiceMode(false); }} style={{
            width: 44, height: 44, borderRadius: 22,
            background: '#fff', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
          }}>
            <Icon name="Keyboard" size={20} color="#48484A" />
          </button>
          <button
            onMouseDown={function() { setRecording(true); }}
            onMouseUp={function() { setRecording(false); window.showToast && window.showToast('语音识别开发中'); }}
            onMouseLeave={function() { setRecording(false); }}
            style={{
              flex: 1, padding: '16px', borderRadius: 22,
              background: recording ? '#FF6633' : '#fff',
              border: 'none', cursor: 'pointer',
              fontSize: 15, fontWeight: 600, color: recording ? '#fff' : '#8E8E93',
              fontFamily: 'inherit', textAlign: 'center',
              boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
              transition: 'all 0.15s',
            }}>
            {recording ? '松开结束' : '按住说话'}
          </button>
        </div>
      ) : (
        /* Keyboard mode — borderless floating */
        <div style={{
          background: '#fff', borderRadius: 24,
          padding: '8px 8px 6px 14px',
          boxShadow: '0 2px 20px rgba(0,0,0,0.06)',
        }}>
          <textarea value={value}
            onChange={function(e) { onChange(e.target.value); }}
            placeholder={placeholder || '告诉我你想去哪、和谁、预算多少…'}
            rows={1}
            style={{
              width: '100%', border: 'none', outline: 'none', resize: 'none',
              fontSize: 14, lineHeight: 1.5, fontFamily: 'inherit',
              padding: '6px 0 4px', maxHeight: 80, background: 'transparent',
              color: '#1a1a1a', boxSizing: 'border-box',
            }} />
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            paddingTop: 4,
          }}>
            <button onClick={function() { setVoiceMode(true); }} style={{
              width: 36, height: 36, borderRadius: 20,
              background: '#fff', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 0, boxShadow: '0 1px 6px rgba(0,0,0,0.08)',
              marginLeft: -2,
            }}>
              <Icon name="Mic" size={17} color="#8E8E93" />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button onClick={function() { window.showToast && window.showToast('上传/拍照功能开发中'); }} style={{
                width: 36, height: 36, borderRadius: 20,
                background: '#fff', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: 0, boxShadow: '0 1px 6px rgba(0,0,0,0.08)',
              }}>
                <Icon name="PlusCircle" size={18} color="#8E8E93" />
              </button>
              <button onClick={onSend} disabled={!value.trim()} style={{
                width: 36, height: 36, borderRadius: 20,
                background: value.trim() ? '#FF6633' : '#F2F2F7',
                border: 'none', cursor: value.trim() ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, transition: 'all 0.15s',
                boxShadow: value.trim() ? '0 2px 10px rgba(255,102,51,0.3)' : 'none',
              }}>
                <Icon name="ArrowUp" size={16} color={value.trim() ? '#fff' : '#C7C7CC'} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>);
}

// ─── Branch-aware summary node above the route output ──────────
function buildSummaryNode(s) {
  if (s.activeChip) {
    return <ChipAdjustmentSummary chip={s.activeChip} />;
  }
  if (!s.nl) return null; // scene-tap → fall back to ParsingSummary
  if (s.nl.branch === 'complete') {
    return <CompleteSummary scene={s.scene} extracted={s.nl.extracted} />;
  }
  if (s.nl.branch === 'assumption') {
    return <AssumptionBanner scene={s.scene} extracted={s.nl.extracted} assumed={s.nl.assumed} />;
  }
  if (s.nl.branch === 'conflict') {
    return <ConflictSummary scene={s.scene} priority={s.conflictPriority} />;
  }
  if (s.nl.branch === 'followup') {
    return <FollowupSummary scene={s.scene} raw={s.nl.raw} answers={s.answers} />;
  }
  return null;
}

// ─── Loading text per branch ───────────────────────────────────
function loadingTextFor(s) {
  if (s.nl) return window.nlLoadingText(s.nl.branch);
  if (s.defaulted) return '按默认设定为你挑路线，马上好…';
  return '正在结合店铺信息、大家的真实评价和交通情况，为你生成路线…';
}

// ─── Main chat screen ──────────────────────────────────────────
function ChatScreen({
  chatState, toast,
  onSend, onPickScene, onAnswer, onSkipCompletion, onEditAnswer, onResetScene,
  onNLFollowupAnswer, onConflictPriority,
  onAddMore, onOpenDetail, onNav, onAdjust, onSwap, onChip,
  history, historyOpen, onOpenHistory, onCloseHistory, onReplayHistory, onNewConversation,
  city, onCityChange,
  currentUser, onUserChange, onLogout,
}) {
  const [input, setInput] = useStateChat('');
  const [sidebarOpen, setSidebarOpen] = useStateChat(false);
  const [cityPickerOpen, setCityPickerOpen] = useStateChat(false);
  const [favoritesOpen, setFavoritesOpen] = useStateChat(false);
  const [shareOpen, setShareOpen] = useStateChat(false);
  const [shareRoute, setShareRoute] = useStateChat(null);
  const scrollRef = useRefChat(null);

  // Wire up shared state for cross-component SharePanel access
  useEffectChat(() => {
    window._setShareOpen = function(open) {
      setShareOpen(open);
      if (!open) {
        window._shareRoute = null;
      } else {
        setShareRoute(window._shareRoute);
      }
    };
    return () => { delete window._setShareOpen; };
  }, []);

  // auto-scroll to top only on new conversation entry (welcome/completing/followup/conflict)
  // — NOT on route adjustments (stage stays 'route')
  var prevStageRef = useRefChat(null);
  useEffectChat(() => {
    if (scrollRef.current && chatState.stage !== 'route' && chatState.stage !== 'generating') {
      scrollRef.current.scrollTop = 0;
    }
    prevStageRef.current = chatState.stage;
  }, [chatState.stage, chatState.userText]);

  const handleSendInput = () => {
    if (!input.trim()) return;
    onSend(input.trim());
    setInput('');
  };

  const handleTag = (t) => setInput((v) => v ? v + ' ' + t : t);

  // Whether the conversation is on the NL (typed) path
  const isNLPath = !!chatState.userText;
  const stage = chatState.stage;
  const convoMessages = chatState.conversationMessages || [];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#F7F7F8' }}>
      <ChatTopBar
        city={city}
        onCityClick={() => setCityPickerOpen(true)}
        onMenuClick={() => setSidebarOpen(true)}
        onNewChat={onNewConversation || (function() { window.location.reload(); })}
      />

      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        currentUser={currentUser}
        onLogout={onLogout}
        history={history}
        onReplayHistory={onReplayHistory}
        favorites={null}
        onOpenDetail={onOpenDetail}
        city={city}
        onCityChange={onCityChange}
      />

      <CityPickerSheet
        open={cityPickerOpen}
        currentCity={city || '北京'}
        onSelect={(c) => { onCityChange && onCityChange(c); }}
        onClose={() => setCityPickerOpen(false)}
      />

      <div ref={scrollRef} className="frame-scroll" style={{
        flex: 1, overflowY: 'auto', overflowX: 'hidden',
        paddingBottom: 180,
      }}>
        {/* ── Conversation message list (all past messages) ── */}
        {convoMessages.length > 0 && (
          <div style={{ padding: '12px 0 6px' }}>
            {convoMessages.map(function(msg, idx) {
              if (msg.type === 'user') {
                return <UserBubble key={msg._key || idx} text={msg.text} />;
              }
              if (msg.type === 'route') {
                return (
                  <div key={msg._key || idx} style={{ marginBottom: 14 }}>
                    {msg.chipLabel && (
                      <div style={{ padding: '4px 20px 6px', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: 999,
                          background: '#FF6633', color: '#fff',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <Icon name="SlidersHorizontal" size={14} color="#fff" />
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>
                          已按「{msg.chipLabel}」调整
                        </span>
                      </div>
                    )}
                    <RouteOptionsCard
                      scene={msg.scene || '朋友聚会'}
                      answers={msg.answers || {}}
                      defaulted={!!msg.defaulted}
                      routes={msg.routes || []}
                      onOpenDetail={onOpenDetail}
                      onSwap={null}
                      onChip={null}
                      readOnly={true}
                      city={city}
                    />
                  </div>
                );
              }
              return null;
            })}
          </div>
        )}

        {/* ── Welcome (only when no conversation history) ── */}
        {stage === 'welcome' && convoMessages.length === 0 && (
          <WelcomeBlock onPickScene={onPickScene} />
        )}

        {/* ── Scene-tap completing ── */}
        {stage === 'completing' && (
          <>
            <div style={{ height: 6 }} />
            <SystemPromptCard scene={chatState.scene} onChangeScene={onResetScene} />
            <div style={{ height: 4 }} />
            <NeedCompletionCard
              scene={chatState.scene}
              answers={chatState.answers}
              onAnswer={onAnswer}
              onSkip={onSkipCompletion}
              onEditAnswer={onEditAnswer}
            />
            <div style={{ height: 40 }} />
          </>
        )}

        {/* ── NL: followup questions ── */}
        {isNLPath && stage === 'nl_followup' && (
          <FollowupCard
            rawText={chatState.userText}
            questions={chatState.nl.questions}
            answers={chatState.answers}
            onAnswer={onNLFollowupAnswer}
          />
        )}

        {/* ── NL: conflict resolution ── */}
        {isNLPath && stage === 'nl_conflict' && (
          <ConflictCard
            scene={chatState.scene}
            conditions={chatState.nl.conditions}
            onPickPriority={onConflictPriority}
          />
        )}

        {/* ── Generating (both paths) ── */}
        {stage === 'generating' && (
          <>
            {!isNLPath && convoMessages.length === 0 && (
              <>
                <div style={{ height: 8 }} />
                <SystemPromptCard scene={chatState.scene} onChangeScene={onResetScene} />
                <div style={{ height: 8 }} />
              </>
            )}
            {!isNLPath && convoMessages.length > 0 && <div style={{ height: 8 }} />}
            <LoadingMsg text={loadingTextFor(chatState)} />
          </>
        )}

        {/* ── Route result (both paths) ── */}
        {stage === 'route' && (
          <>
            {!isNLPath && convoMessages.length === 0 && (
              <>
                <div style={{ height: 8 }} />
                <SystemPromptCard scene={chatState.scene} onChangeScene={onResetScene} />
              </>
            )}
            <RouteOptionsCard
              scene={chatState.scene || '朋友聚会'}
              answers={chatState.answers}
              defaulted={chatState.defaulted}
              summaryNode={buildSummaryNode(chatState)}
              routes={chatState.routes}
              onOpenDetail={onOpenDetail}
              onSwap={onSwap}
              onChip={onChip}
              city={city}
            />
          </>
        )}

        <div style={{ height: 20 }} />
      </div>

      <Composer
        value={input}
        onChange={setInput}
        onSend={handleSendInput}
        onTag={handleTag}
        showTags={stage !== 'welcome'}
      />

      <Toast message={toast} />
      <HistoryPanel
        open={!!historyOpen}
        history={history || []}
        onClose={onCloseHistory}
        onReplay={onReplayHistory}
        onNewConversation={onNewConversation}
      />
      {window.FavoritesPanel && (
        <window.FavoritesPanel
          open={favoritesOpen}
          onClose={() => setFavoritesOpen(false)}
          onOpenDetail={onOpenDetail}
        />
      )}
      {window.SharePanel && (
        <window.SharePanel
          open={shareOpen}
          onClose={() => { setShareOpen(false); window._shareRoute = null; }}
          route={shareRoute}
        />
      )}
    </div>
  );
}

// ─── User picker bottom sheet (visual card style) ──────────────
function UserPickerSheet({ open, currentUser, onSelect, onClose, onAddUser }) {
  const [profiles, setProfiles] = useStateChat([]);

  var customColors = [
    { bg: '#E8EAF6', fg: '#3F51B5' },
    { bg: '#F3E5F5', fg: '#7B1FA2' },
    { bg: '#E0F2F1', fg: '#00695C' },
  ];

  useEffectChat(() => {
    if (open) {
      // Load mock profiles + custom users
      var p1 = window.getUserProfiles ? window.getUserProfiles() : Promise.resolve([]);
      Promise.resolve(p1).then(function(mock) {
        var custom = [];
        try { custom = JSON.parse(localStorage.getItem('_customUsers') || '[]'); } catch(e) {}
        setProfiles([].concat(mock || [], custom));
      });
    }
  }, [open]);

  if (!open) return null;

  function getAvatarStyle(p) {
    if (p.isCustom) {
      var ci = (p.avatarIdx || 0) % customColors.length;
      return customColors[ci];
    }
    if (p.userId === 'user_001') return { bg: '#FDE8E8', fg: '#C53030', label: '约会' };
    if (p.userId === 'user_002') return { bg: '#E8F4E8', fg: '#2F855A', label: '效率' };
    if (p.userId === 'user_003') return { bg: '#FEF3E2', fg: '#C05621', label: '探店' };
    return { bg: '#EDEDEF', fg: '#8E8E93', label: '' };
  }

  return (
    <div onClick={onClose} className="fade-up" style={{
      position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)',
      zIndex: 160, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }}>
      <div onClick={function(e) { e.stopPropagation(); }} style={{
        width: '100%', maxWidth: 420, background: '#fff',
        borderRadius: '20px 20px 0 0', overflow: 'hidden',
        animation: 'slideUp 0.28s ease-out', paddingBottom: 34,
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 8px' }}>
          <div style={{ width: 32, height: 4, borderRadius: 999, background: '#D1D1D6' }} />
        </div>
        <div style={{ fontSize: 17, fontWeight: 700, textAlign: 'center', padding: '8px 0 16px', color: '#1A1A1A' }}>
          切换用户
        </div>

        {/* Cards grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, padding: '0 16px' }}>
          {/* Profile cards */}
          {profiles.map(function(p) {
            var av = getAvatarStyle(p);
            var isActive = currentUser && currentUser.userId === p.userId;
            return (
              <div key={p.userId} onClick={function() { onSelect(p); }} style={{
                padding: '16px 12px', borderRadius: 14,
                background: isActive ? '#FFF7F0' : '#F7F7F8',
                border: isActive ? '2px solid #FFC8AA' : '2px solid transparent',
                cursor: 'pointer', textAlign: 'center',
                position: 'relative',
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 14,
                  background: av.bg, color: av.fg,
                  fontSize: 20, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 8px',
                }}>{p.name.charAt(0)}</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#1A1A1A' }}>{p.name}</div>
                {av.label && (
                  <span style={{
                    display: 'inline-block', marginTop: 4,
                    fontSize: 10, fontWeight: 500, color: av.fg,
                    background: av.bg, padding: '2px 6px', borderRadius: 6,
                  }}>{av.label}</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Add account */}
        <button onClick={function() { onAddUser ? onAddUser() : onSelect(null); }} style={{
          margin: '16px 16px 0', width: 'calc(100% - 32px)',
          padding: '12px', borderRadius: 12,
          background: '#FF6633', color: '#fff', border: 'none',
          fontSize: 15, fontWeight: 600, cursor: 'pointer',
          fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
          <Icon name="UserPlus" size={18} color="#fff" />
          创建新用户
        </button>
      </div>
    </div>
  );
}

Object.assign(window, { ChatScreen, ChatTopBar, CityPickerSheet, Sidebar, CITIES });