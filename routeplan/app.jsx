// Main app — orchestrates chat state machine + page transitions, mounts iOS frame.
//
// State machine (`chatState.stage`):
//   welcome     — initial home
//   completing  — scene-tap path: SystemPromptCard + NeedCompletionCard Q&A
//   nl_followup — NL path: too vague, asking 1-2 followup questions
//   nl_conflict — NL path: constraints contradict, user picks priority
//   generating  — spinner before route output
//   route       — multi-route output (RouteOptionsCard, 1-3 routes)

const { useState: useStateApp, useEffect: useEffectApp, useLayoutEffect: useLayoutEffectApp } = React;

function PhoneStage({ children }) {
  const [scale, setScale] = useStateApp(1);
  const FRAME_W = 402, FRAME_H = 874;

  useLayoutEffectApp(() => {
    const compute = () => {
      const padding = 32;
      const availW = window.innerWidth - padding * 2;
      const availH = window.innerHeight - padding * 2;
      const s = Math.min(1, availW / FRAME_W, availH / FRAME_H);
      setScale(s);
    };
    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, []);

  return (
    <div className="stage">
      <div style={{ width: FRAME_W * scale, height: FRAME_H * scale, position: 'relative' }}>
        <div style={{
          transformOrigin: 'top left',
          transform: `scale(${scale})`,
          width: FRAME_W, height: FRAME_H,
          position: 'absolute', top: 0, left: 0,
        }}>
          {children}
        </div>
      </div>
    </div>
  );
}

const INITIAL_STATE = {
  stage: 'welcome',
  userText: '',
  scene: null,
  answers: {},        // scene-tap or nl-followup answers
  defaulted: false,   // user tapped "先按默认推荐看看"
  nl: null,           // analyzer result {branch, extracted, assumed, questions, conditions, ...}
  conflictPriority: null,
  activeChip: null,   // chip label that drove the current generation (drives summary banner)
  routes: null,       // API response routes for RouteOptionsCard
  sessionId: null,    // backend session id
  detailRoute: null,  // selected route for detail page
};

function App() {
  const [page, setPage] = useStateApp('chat');
  const [chatState, setChatState] = useStateApp(INITIAL_STATE);
  const [history, setHistory] = useStateApp([]); // top-right history panel data
  const [historyOpen, setHistoryOpen] = useStateApp(false);
  const [toast, setToast] = useStateApp(null);

  // Push a snapshot into top-right history every time we land on 'route'.
  // Replays load the snapshot back into chatState and SUPPRESS recording.
  const recordRef = React.useRef({ suppress: false });

  useEffectApp(() => {
    if (chatState.stage !== 'route') return;
    if (recordRef.current.suppress) {
      recordRef.current.suppress = false;
      return;
    }
    const entry = {
      ts: Date.now(),
      timeLabel: '刚刚',
      kind: chatState.activeChip ? 'chip' : (chatState.userText ? 'nl' : 'scene'),
      chipLabel: chatState.activeChip,
      scene: chatState.scene,
      userText: chatState.userText,
      answers: chatState.answers,
      defaulted: chatState.defaulted,
      nl: chatState.nl,
      conflictPriority: chatState.conflictPriority,
      activeChip: chatState.activeChip,
      routes: chatState.routes,
      sessionId: chatState.sessionId,
    };
    setHistory((h) => [...h, entry]);
  }, [chatState.stage, chatState.activeChip, chatState.userText, chatState.scene]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1800);
  };

  // ─── NL path entry (composer send) ───────────────────────────
  const handleSend = (text) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const analysis = window.analyzeNL(trimmed);
    const base = {
      ...INITIAL_STATE,
      userText: trimmed,
      scene: analysis.scene,
      nl: analysis,
    };

    if (analysis.branch === 'complete' || analysis.branch === 'assumption') {
      setChatState({ ...base, stage: 'generating' });
      window.planWithFallback(trimmed, analysis.scene, {}).then((result) => {
        setChatState((s) => ({ ...s, stage: 'route', routes: result.routes, sessionId: result.sessionId }));
      });
    } else if (analysis.branch === 'followup') {
      setChatState({ ...base, stage: 'nl_followup' });
    } else if (analysis.branch === 'conflict') {
      setChatState({ ...base, stage: 'nl_conflict' });
    }
  };

  // ─── NL followup: record answer, auto-generate when all done ─
  const handleNLFollowupAnswer = (qid, value) => {
    setChatState((s) => {
      const nextAnswers = { ...s.answers, [qid]: value };
      const allDone = s.nl.questions.every((q) => nextAnswers[q.id]);
      if (allDone) {
        const nextScene = nextAnswers.scene && window.SCENARIOS[nextAnswers.scene]
          ? nextAnswers.scene
          : s.scene || '朋友聚会';
        const query = window.buildQueryFromScene(nextScene, nextAnswers);
        window.planWithFallback(query, nextScene, nextAnswers).then((result) => {
          setChatState((s2) => ({ ...s2, stage: 'route', routes: result.routes, sessionId: result.sessionId }));
        });
        return { ...s, answers: nextAnswers, stage: 'generating' };
      }
      return { ...s, answers: nextAnswers };
    });
  };

  // ─── NL conflict: user picked their priority ─────────────────
  const handleConflictPriority = (priority) => {
    setChatState((s) => {
      const query = `${s.userText}，优先${priority.label}`;
      window.planWithFallback(query, s.scene || '朋友聚会', s.answers).then((result) => {
        setChatState((s2) => ({ ...s2, stage: 'route', routes: result.routes, sessionId: result.sessionId }));
      });
      return { ...s, stage: 'generating', conflictPriority: priority };
    });
  };

  // ─── Scene-tap entry (welcome grid) ──────────────────────────
  const handlePickScene = (scene) => {
    setChatState({
      ...INITIAL_STATE,
      stage: 'completing',
      scene,
    });
  };

  // ─── Scene-tap: record answer, auto-generate on last one ─────
  const handleAnswer = (qid, value) => {
    setChatState((s) => {
      const nextAnswers = { ...s.answers, [qid]: value };
      const cfg = window.SCENARIOS && window.SCENARIOS[s.scene];
      const allDone = cfg && cfg.questions.every((q) => nextAnswers[q.id]);
      if (allDone) {
        const query = window.buildQueryFromScene(s.scene, nextAnswers);
        window.planWithFallback(query, s.scene, nextAnswers).then((result) => {
          setChatState((s2) => ({ ...s2, stage: 'route', routes: result.routes, sessionId: result.sessionId }));
        });
        return { ...s, answers: nextAnswers, stage: 'generating' };
      }
      return { ...s, answers: nextAnswers };
    });
  };

  // ─── Scene-tap: tertiary "先按默认推荐看看" ──────────────────
  const handleSkipCompletion = () => {
    setChatState((s) => {
      const query = window.buildQueryFromScene(s.scene, s.answers);
      window.planWithFallback(query, s.scene, s.answers).then((result) => {
        setChatState((s2) => ({ ...s2, stage: 'route', routes: result.routes, sessionId: result.sessionId }));
      });
      return { ...s, stage: 'generating', defaulted: true };
    });
  };

  // ─── Tap an answered pill to revise it ───────────────────────
  const handleEditAnswer = (qid) => {
    setChatState((s) => {
      const next = { ...s.answers };
      delete next[qid];
      // Revert to the matching completing stage (scene-tap vs nl-followup)
      const stage = s.nl?.branch === 'followup' ? 'nl_followup' : 'completing';
      return { ...s, answers: next, stage };
    });
  };

  // ─── Top-of-completion "换一个" — back home ──────────────────
  const handleResetScene = () => setChatState(INITIAL_STATE);

  const handleAddMore = () => showToast('请在下方继续补充你的需求');

  const handleChip = (label) => {
    setChatState((s) => {
      if (s.stage !== 'route') return s;
      const sid = s.sessionId || window.getSessionId();
      window.adjustWithFallback(sid, label, s.routes).then((result) => {
        setChatState((s2) => ({ ...s2, stage: 'route', routes: result.routes, sessionId: result.sessionId || sid }));
      });
      return { ...s, stage: 'generating', activeChip: label };
    });
  };

  const handleOpenHistory = () => setHistoryOpen(true);
  const handleCloseHistory = () => setHistoryOpen(false);
  const handleNewConversation = () => {
    recordRef.current.suppress = true;
    setHistoryOpen(false);
    setChatState(INITIAL_STATE);
  };
  const handleReplayHistory = (idx) => {
    const entry = history[idx];
    if (!entry) return;
    recordRef.current.suppress = true;
    setHistoryOpen(false);
    setChatState({
      ...INITIAL_STATE,
      stage: 'route',
      scene: entry.scene,
      userText: entry.userText || '',
      answers: entry.answers || {},
      defaulted: !!entry.defaulted,
      nl: entry.nl || null,
      conflictPriority: entry.conflictPriority || null,
      activeChip: entry.activeChip || null,
      routes: entry.routes || null,
      sessionId: entry.sessionId || null,
    });
  };

  return (
    <PhoneStage>
      <IOSDevice width={402} height={874} dark={false}>
        <div style={{
          position: 'absolute', top: 47, left: 0, right: 0, bottom: 0,
          overflow: 'hidden',
        }}>
          {page === 'chat' && (
            <ChatScreen
              chatState={chatState}
              onSend={handleSend}
              onPickScene={handlePickScene}
              onAnswer={handleAnswer}
              onSkipCompletion={handleSkipCompletion}
              onEditAnswer={handleEditAnswer}
              onResetScene={handleResetScene}
              onNLFollowupAnswer={handleNLFollowupAnswer}
              onConflictPriority={handleConflictPriority}
              onAddMore={handleAddMore}
              onOpenDetail={(route) => { setChatState((s) => ({ ...s, detailRoute: route })); setPage('detail'); }}
              onNav={() => showToast('已模拟跳转导航')}
              onAdjust={() => showToast('请告诉我你希望怎么调整')}
              onSwap={() => showToast('已为你换一条候选路线')}
              onChip={handleChip}
              toast={toast}
              history={history}
              historyOpen={historyOpen}
              onOpenHistory={handleOpenHistory}
              onCloseHistory={handleCloseHistory}
              onReplayHistory={handleReplayHistory}
              onNewConversation={handleNewConversation}
            />
          )}
          {page === 'detail' && (
            <RouteDetailScreen
              route={chatState.detailRoute}
              onBack={() => setPage('chat')}
              toast={toast}
              setToast={setToast}
            />
          )}
        </div>
      </IOSDevice>
    </PhoneStage>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
