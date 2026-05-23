// Chat home screen — welcome, user input, requirement card, route card.

const { useState: useStateChat, useEffect: useEffectChat, useRef: useRefChat } = React;

// ─── Top bar ───────────────────────────────────────────────────
function ChatTopBar({ onOpenHistory, historyCount }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '8px 12px 10px', background: '#F7F7F8',
      borderBottom: '1px solid rgba(0,0,0,0.04)'
    }}>
      <button style={{
        display: 'flex', alignItems: 'center', gap: 3,
        background: 'transparent', border: 'none', cursor: 'pointer',
        padding: '4px 6px', color: '#1a1a1a', fontSize: 14, fontWeight: 500
      }}>
        <Icon name="MapPin" size={14} color="#1a1a1a" />
        <span>北京</span>
        <Icon name="ChevronDown" size={13} color="#8e8e93" />
      </button>
      <div style={{ fontWeight: 600, fontSize: 16, color: '#1a1a1a' }}>路线助手</div>
      <button onClick={onOpenHistory} style={{
        position: 'relative',
        background: 'transparent', border: 'none', cursor: 'pointer',
        padding: 6, lineHeight: 0
      }}>
        <Icon name="Clock" size={18} color="#1d1d1f" />
        {historyCount > 0 && (
          <span className="num" style={{
            position: 'absolute', top: 2, right: 0,
            minWidth: 14, height: 14, padding: '0 4px',
            background: '#FF6633', color: '#fff',
            fontSize: 9, fontWeight: 700,
            borderRadius: 999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            lineHeight: 1,
          }}>{historyCount}</span>
        )}
      </button>
    </div>);

}

// ─── Welcome panel (initial state) ─────────────────────────────
const QUICK_CARDS = [
{ label: '朋友聚会', icon: 'Users', hint: '好吃 · 好聊' },
{ label: '情侣约会', icon: 'Heart', hint: '安静 · 出片' },
{ label: '一个人放松', icon: 'Coffee', hint: '咖啡 · 书店' },
{ label: '亲子遛娃', icon: 'Baby', hint: '室内 · 安全' },
{ label: '下班回血', icon: 'Soup', hint: '快吃 · 暖胃' },
{ label: '临时救场', icon: 'Zap', hint: '附近 · 立刻' }];


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
    <div className="fade-up" style={{ padding: '14px 18px 0' }}>
      {/* Hero */}
      <div style={{ marginBottom: 26 }}>
        <h1 style={{
          margin: 0,
          fontSize: 28, fontWeight: 700, color: '#1a1a1a',
          letterSpacing: -0.5, lineHeight: 1.2, marginBottom: 10,
        }}>不知道去哪？</h1>
        <p style={{
          margin: 0, fontSize: 13.5, color: '#6E6E73',
          lineHeight: 1.65,
        }}>
          先选一个场景，或直接输入需求<br/>
          我会帮你补齐时间、地点和预算，生成一条可直接出发的路线
        </p>
      </div>

      {/* Section label */}
      <div style={{
        marginBottom: 4,
        fontSize: 15, fontWeight: 600, color: '#1a1a1a',
      }}>常见场景</div>
      <div style={{ fontSize: 12, color: '#8e8e93', marginBottom: 14 }}>
        也可以直接在下方输入需求
      </div>

      {/* Scene grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 22,
      }}>
        {QUICK_CARDS.map((c, i) => {
          const tint = CARD_TINTS[i % CARD_TINTS.length];
          return (
            <button key={c.label} onClick={() => onPickScene(c.label)} style={{
              background: '#fff', border: '1px solid #EDEDEF', borderRadius: 14,
              padding: '14px 14px', textAlign: 'left', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', gap: 10, minHeight: 116,
              transition: 'all 0.15s', fontFamily: 'inherit',
            }}>
              <div style={{
                width: 34, height: 34, borderRadius: 10,
                background: tint.bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon name={c.icon} size={17} color={tint.fg} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15.5, color: '#1a1a1a', marginBottom: 4 }}>{c.label}</div>
                <div style={{ fontSize: 12.5, color: '#8e8e93' }}>{c.hint}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>);

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
            {MOCK_PLACES.map((p, i) =>
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
                {i < MOCK_PLACES.length - 1 &&
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
  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0,
      background: 'linear-gradient(180deg, rgba(247,247,248,0) 0%, #F7F7F8 22%)',
      padding: '20px 12px 26px', zIndex: 20
    }}>
      <div style={{
        display: 'flex', alignItems: 'flex-end', gap: 8,
        background: '#fff', border: '1px solid #EDEDEF', borderRadius: 22,
        padding: '6px 6px 6px 14px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
      }}>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || '告诉我你想去哪、和谁、预算多少…'}
          rows={1}
          style={{
            flex: 1, border: 'none', outline: 'none', resize: 'none',
            fontSize: 14, lineHeight: 1.5, fontFamily: 'inherit',
            padding: '7px 0', maxHeight: 80, background: 'transparent',
            color: '#1a1a1a'
          }} />
        <button onClick={onSend} disabled={!value.trim()} style={{
          width: 34, height: 34, borderRadius: 999,
          background: value.trim() ? '#FF6633' : '#E5E5E7',
          border: 'none', cursor: value.trim() ? 'pointer' : 'default',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
          transition: 'all 0.15s'
        }}>
          <Icon name="ArrowUp" size={17} color="#fff" strokeWidth={2.5} />
        </button>
      </div>
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
}) {
  const [input, setInput] = useStateChat('');
  const scrollRef = useRefChat(null);

  // auto-scroll to bottom on new messages
  useEffectChat(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight + 200;
    }
  }, [chatState.stage, chatState.userText, Object.keys(chatState.answers || {}).length]);

  const handleSendInput = () => {
    if (!input.trim()) return;
    onSend(input.trim());
    setInput('');
  };

  const handleTag = (t) => setInput((v) => v ? v + ' ' + t : t);

  // Whether the conversation is on the NL (typed) path
  const isNLPath = !!chatState.userText;
  const stage = chatState.stage;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#F7F7F8' }}>
      <ChatTopBar onOpenHistory={onOpenHistory} historyCount={(history || []).length} />

      <div ref={scrollRef} className="frame-scroll" style={{
        flex: 1, overflowY: 'auto', overflowX: 'hidden',
        paddingBottom: 180,
      }}>
        {/* welcome */}
        {stage === 'welcome' && (
          <WelcomeBlock onPickScene={onPickScene} />
        )}

        {/* scene-tap completing — NO user bubble */}
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

        {/* NL paths — always start with user bubble */}
        {isNLPath && stage !== 'welcome' && (
          <>
            <div style={{ height: 16 }} />
            <UserBubble text={chatState.userText} />

            {stage === 'nl_followup' && (
              <FollowupCard
                rawText={chatState.userText}
                questions={chatState.nl.questions}
                answers={chatState.answers}
                onAnswer={onNLFollowupAnswer}
              />
            )}

            {stage === 'nl_conflict' && (
              <ConflictCard
                scene={chatState.scene}
                conditions={chatState.nl.conditions}
                onPickPriority={onConflictPriority}
              />
            )}

            {stage === 'generating' && (
              <LoadingMsg text={loadingTextFor(chatState)} />
            )}

            {stage === 'route' && (
              <RouteOptionsCard
                scene={chatState.scene || '朋友聚会'}
                answers={chatState.answers}
                defaulted={chatState.defaulted}
                summaryNode={buildSummaryNode(chatState)}
                routes={chatState.routes}
                onOpenDetail={onOpenDetail}
                onSwap={onSwap}
                onChip={onChip}
              />
            )}
            <div style={{ height: 40 }} />
          </>
        )}

        {/* Scene-tap → generating / route — NO user bubble */}
        {!isNLPath && (stage === 'generating' || stage === 'route') && (
          <>
            <div style={{ height: 8 }} />
            <SystemPromptCard scene={chatState.scene} onChangeScene={onResetScene} />
            {stage === 'generating' && (
              <>
                <div style={{ height: 8 }} />
                <LoadingMsg text={loadingTextFor(chatState)} />
              </>
            )}
            {stage === 'route' && (
              <RouteOptionsCard
                scene={chatState.scene}
                answers={chatState.answers}
                defaulted={chatState.defaulted}
                routes={chatState.routes}
                onOpenDetail={onOpenDetail}
                onSwap={onSwap}
                onChip={onChip}
              />
            )}
            <div style={{ height: 40 }} />
          </>
        )}
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
    </div>
  );
}

Object.assign(window, { ChatScreen });