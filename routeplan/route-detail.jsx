// Route detail page — map, overview, vertical timeline, bottom action bar.

const { useState: useStateRD, useEffect: useEffectRD, useRef: useRefRD } = React;

// ─── Build detail data from route (API or mock fallback) ────
function buildDetailData(route) {
  const hasRaw = route && route._raw && (route._raw.segments || []).length > 0;

  if (hasRaw) {
    const raw = route._raw;
    const segments = raw.segments || [];

    const places = segments.map((seg, i) => {
      const poi = seg.poi || {};
      const openStr = poi.openTime && poi.closeTime
        ? `${poi.openTime} - ${poi.closeTime}` : '—';
      return {
        id: poi.id || `poi-${i}`,
        name: poi.name || '未知地点',
        short: poi.name || '未知地点',
        category: poi.subCategory || poi.category || '',
        rating: poi.rating || 0,
        review_count: 0,
        avg_price: Math.round(poi.avgCost || 0),
        distance: i === 0 ? '距出发地' : '',
        opening_hours: openStr,
        current_status: '营业中',
        current_status_short: '营业中',
        status_tone: 'green',
        wait_time: (poi.queueTime || 0) > 0 ? `约 ${Math.round(poi.queueTime)} 分钟` : '无需排队',
        tags: poi.tags || [],
        risk_tags: [],
        recommendation_reason: poi.description || '',
        imageUrl: poi.imageUrl || '',
        address: poi.address || '',
        lng: poi.lng,
        lat: poi.lat,
      };
    });

    // Fill in distances between stations
    for (let i = 1; i < places.length; i++) {
      const prevSeg = segments[i];
      const tm = prevSeg.travelTimeFromPrevious || 0;
      const mode = prevSeg.travelMode || 'WALKING';
      const mPerMin = mode === 'DRIVING' ? 400 : 80;
      const meters = Math.round(tm * mPerMin);
      places[i].distance = `距上一站 ${meters >= 1000 ? (meters / 1000).toFixed(1) + 'km' : meters + 'm'}`;
    }

    const transport = segments.map((seg, i) => {
      const mode = seg.travelMode || 'WALKING';
      const timeMin = Math.round(seg.travelTimeFromPrevious || 0);
      const mPerMin = mode === 'DRIVING' ? 400 : 80;
      const meters = Math.round(timeMin * mPerMin);
      return {
        from: i === 0 ? '当前位置' : (segments[i - 1].poi && segments[i - 1].poi.name || '上一站'),
        to: seg.poi && seg.poi.name || '下一站',
        mode: mode === 'DRIVING' ? '驾车' : '步行',
        icon: mode === 'DRIVING' ? 'Car' : 'Footprints',
        time: `${timeMin} 分钟`,
        walking_time: `${timeMin} 分钟`,
        distance: meters >= 1000 ? (meters / 1000).toFixed(1) + 'km' : meters + 'm',
      };
    });

    if (places.length > 0) {
      transport.push({
        from: places[places.length - 1].name,
        to: '返程',
        mode: '地铁 / 打车',
        icon: 'Home',
        walking_time: '5 分钟',
        distance: '',
      });
    }

    const routeInfo = {
      route_name: raw.name || route.route_name || '推荐路线',
      total_time: route.total_time || '—',
      total_avg_per_person: Math.round(raw.totalCost || 0),
      total_budget: `约 ${Math.round(raw.totalCost || 0)} 元`,
      total_distance: route.total_distance || '—',
      transport_summary: route.transport || '',
      risk_summary: (raw.violatedSoftConstraints || []).map(function (c) { return c.description || c.name || ''; }).filter(Boolean).join('；') || '',
      recommendation_reason: raw.description || route.reason || '',
    };

    return { places: places, transport: transport, routeInfo: routeInfo, stationCount: places.length };
  }

  // Fallback: use mock globals, but overlay the route name/title from the selected route
  var mockRoute = (window.MOCK_ROUTE ? Object.assign({}, window.MOCK_ROUTE) : {});
  if (route) {
    if (route.route_name) mockRoute.route_name = route.route_name;
    if (route.total_time) mockRoute.total_time = route.total_time;
    if (route.total_avg != null) mockRoute.total_avg_per_person = route.total_avg;
    if (route.total_distance) mockRoute.total_distance = route.total_distance;
  }
  return {
    places: window.MOCK_PLACES || [],
    transport: window.MOCK_TRANSPORT || [],
    routeInfo: mockRoute,
    stationCount: (window.MOCK_PLACES || []).length,
  };
}

// ─── Gaode Map (replaces mock SVG) ──────────────────────────
function GaodeMap({ places, activeIdx, onMarker, expanded = false }) {
  const containerRef = useRefRD(null);
  const mapRef = useRefRD(null);
  const markersRef = useRefRD([]);
  const H = expanded ? 360 : 220;
  const amapReady = typeof window.AMap !== 'undefined';

  // Fallback to mock SVG if AMap not loaded
  if (!amapReady) {
    return <MockMapFallback places={places} activeIdx={activeIdx} onMarker={onMarker} expanded={expanded} />;
  }

  // Create map, markers, and polyline — only when AMap is ready and places change
  useEffectRD(() => {
    if (!containerRef.current || !window.AMap) return;

    // Destroy previous map if any
    if (mapRef.current) {
      mapRef.current.destroy();
      mapRef.current = null;
    }

    // Determine center: use first real Beijing coordinate, or Beijing center
    var center = [116.3972, 39.9163];
    for (var k = 0; k < places.length; k++) {
      if (places[k].lng && places[k].lat && places[k].lng > 115.0 && places[k].lng < 118.0) {
        center = [places[k].lng, places[k].lat];
        break;
      }
    }

    var map = new window.AMap.Map(containerRef.current, {
      zoom: 13,
      center: center,
      viewMode: '2D',
      resizeEnable: true,
    });
    mapRef.current = map;

    // Check for real coordinates (explicit null check — 0.0 is falsy in JS)
    function isValidCoord(lng, lat) {
      return lng != null && lat != null && !isNaN(lng) && !isNaN(lat)
        && Math.abs(lng) > 0.5 && Math.abs(lat) > 0.5;
    }
    var hasReal = places.some(function(p) { return isValidCoord(p.lng, p.lat); });
    var centers = [{ lng: 116.3972, lat: 39.9163 }, { lng: 116.4072, lat: 39.9203 }, { lng: 116.3872, lat: 39.9123 },
                   { lng: 116.4172, lat: 39.9083 }, { lng: 116.3772, lat: 39.9243 }];

    const markers = places.map(function(p, i) {
      var lng, lat;
      if (isValidCoord(p.lng, p.lat)) {
        lng = p.lng;
        lat = p.lat;
      } else {
        var c = centers[i % centers.length];
        lng = c.lng;
        lat = c.lat;
      }

      var marker = new window.AMap.Marker({
        position: [lng, lat],
        title: p.name || p.short,
        label: {
          content: '<span style="background:#fff;color:#FF6633;border:2px solid #FF6633;border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;">' + (i + 1) + '</span>',
          offset: new window.AMap.Pixel(0, -30),
        },
        zIndex: 100,
      });

      marker.on('click', (function(idx) { return function() { onMarker && onMarker(idx); }; })(i));
      marker._idx = i;
      map.add(marker);
      return marker;
    });
    markersRef.current = markers;

    // Draw route polyline
    if (places.length >= 2) {
      var path = [];
      for (var j = 0; j < markers.length; j++) {
        var pos = markers[j].getPosition();
        path.push([pos.lng, pos.lat]);
      }
      var polyline = new window.AMap.Polyline({
        path: path,
        strokeColor: '#FF6633',
        strokeWeight: 5,
        strokeOpacity: 0.85,
        lineJoin: 'round',
        showDir: true,
      });
      map.add(polyline);
      map.setFitView(null, false, [60, 60, 60, 60]);
    } else if (places.length === 1) {
      var mp = markers[0].getPosition();
      map.setCenter([mp.lng, mp.lat]);
      map.setZoom(15);
    }

    return function() {
      map.destroy();
      mapRef.current = null;
    };
  }, [places]);

  // Update marker styles when activeIdx changes (no map destroy)
  useEffectRD(function() {
    if (!markersRef.current) return;
    for (var i = 0; i < markersRef.current.length; i++) {
      var m = markersRef.current[i];
      var isActive = i === activeIdx;
      try {
        m.setLabel({
          content: '<span style="background:' + (isActive ? '#FF6633' : '#fff') + ';color:' + (isActive ? '#fff' : '#FF6633') + ';border:2px solid #FF6633;border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;">' + (i + 1) + '</span>',
          offset: new window.AMap.Pixel(0, -30),
        });
        m.setzIndex(isActive ? 120 : 100);
      } catch(e) {}
    }
  }, [activeIdx]);

  return (
    <div style={{
      position: 'relative', width: '100%', height: H, overflow: 'hidden',
      borderRadius: expanded ? 0 : 14,
    }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      {/* expand button */}
      {!expanded && (
        <button style={{
          position: 'absolute', right: 10, bottom: 10, zIndex: 4,
          background: '#fff', border: 'none', borderRadius: 10,
          padding: '7px 11px', fontSize: 12, fontWeight: 500,
          display: 'inline-flex', alignItems: 'center', gap: 4,
          boxShadow: '0 2px 6px rgba(0,0,0,0.08)', cursor: 'pointer',
          color: '#1d1d1f',
        }}>
          <Icon name="Maximize2" size={12} />
          展开地图
        </button>
      )}
    </div>
  );
}

// ─── SVG fallback when AMap is unavailable ───────────────────
function MockMapFallback({ places, activeIdx, onMarker, expanded = false }) {
  const W = 398,H = expanded ? 360 : 220;

  // base streets (procedural-ish)
  const streets = [
  { d: 'M -10 70 L 410 95', w: 1.5 },
  { d: 'M -10 140 L 410 120', w: 1 },
  { d: 'M -10 185 L 410 210', w: 1.2 },
  { d: 'M 80 -10 L 60 260', w: 1.2 },
  { d: 'M 180 -10 L 200 260', w: 1.5 },
  { d: 'M 295 -10 L 285 260', w: 1 }];


  // place positions — readjusted for label clearance
  const pts = places.map((p, i) => ({
    ...p, idx: i,
    x: (p.mock_x || (i + 1) * 25) / 100 * W,
    y: (p.mock_y || 60 + i * 30) / 100 * H + 6
  }));
  const me = { x: 42, y: H - 26 };

  // Route segments — show the fastest / most-convenient mode per leg.
  // `side` = perpendicular offset direction (+1 / -1) to keep labels off the line.
  // `gap`  = how far perpendicular to the line in px (raised so labels never sit on the line).
  const segments = [
  { from: me, to: pts[0], mode: '地铁', time: '8 min', icon: 'TrainFront', color: '#2456a6', side: -1, gap: 40, t: 0.42 },
  { from: pts[0], to: pts[1], mode: '步行', time: '9 min', icon: 'Footprints', color: '#2c7a44', side: -1, gap: 30, t: 0.5 },
  { from: pts[1], to: pts[2], mode: '步行', time: '6 min', icon: 'Footprints', color: '#2c7a44', side: 1, gap: 28, t: 0.5 }];


  // route polyline
  const path = `M ${me.x} ${me.y} ` + pts.map((p) => `L ${p.x} ${p.y}`).join(' ');

  // Place name labels — above or below the marker (never to the side).
  const labelOrientation = ['above', 'below', 'above'];
  const labelPos = (p, i) => {
    if (labelOrientation[i] === 'above') {
      return { left: p.x, top: p.y - 14, transform: 'translate(-50%, -100%)' };
    }
    return { left: p.x, top: p.y + 14, transform: 'translate(-50%, 0)' };
  };

  return (
    <div style={{
      position: 'relative', width: '100%', height: H, overflow: 'hidden',
      background: 'linear-gradient(180deg, #F4F1E8 0%, #ECE7D8 100%)',
      borderRadius: expanded ? 0 : 14
    }}>
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice"
      style={{ position: 'absolute', inset: 0 }}>
        {/* blocks */}
        <rect x="20" y="20" width="120" height="52" rx="4" fill="#F4F1E7" opacity="0.6" />
        <rect x="160" y="14" width="100" height="46" rx="4" fill="#F4F1E7" opacity="0.6" />
        <rect x="280" y="18" width="100" height="60" rx="4" fill="#F4F1E7" opacity="0.6" />
        <rect x="30" y="108" width="80" height="60" rx="4" fill="#F4F1E7" opacity="0.6" />
        <rect x="220" y="118" width="120" height="48" rx="4" fill="#F4F1E7" opacity="0.6" />
        <rect x="120" y="180" width="60" height="48" rx="4" fill="#F4F1E7" opacity="0.6" />
        <rect x="260" y="190" width="100" height="40" rx="4" fill="#F4F1E7" opacity="0.6" />

        {/* streets */}
        {streets.map((s, i) =>
        <path key={i} d={s.d} stroke="#fff" strokeWidth={s.w * 4} fill="none" strokeLinecap="round" />
        )}
        {streets.map((s, i) =>
        <path key={'b' + i} d={s.d} stroke="#D8D4C7" strokeWidth={s.w} fill="none" strokeLinecap="round" />
        )}

        {/* route polyline */}
        <path d={path} stroke="#FF6633" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.92" />
        <path d={path} stroke="#fff" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeDasharray="2 5" opacity="0.85" />

        {/* current location */}
        <circle cx={me.x} cy={me.y} r="14" fill="#2456a6" opacity="0.18" className="pulse-ring" />
        <circle cx={me.x} cy={me.y} r="7" fill="#fff" />
        <circle cx={me.x} cy={me.y} r="4.5" fill="#2456a6" />

        {/* markers */}
        {pts.map((p) =>
        <g key={p.id} onClick={() => onMarker && onMarker(p.idx)} style={{ cursor: 'pointer' }}>
            <circle cx={p.x} cy={p.y + 4} r="6" fill="#000" opacity="0.16" />
            <circle cx={p.x} cy={p.y} r={p.idx === activeIdx ? 17 : 14} fill="#fff" stroke={p.idx === activeIdx ? '#FF6633' : '#C8C8CC'} strokeWidth="2" />
            <circle cx={p.x} cy={p.y} r={p.idx === activeIdx ? 12 : 9} fill="#FF6633" />
            <text x={p.x} y={p.y + 4} textAnchor="middle" fontSize="11" fontWeight="700" fill="#fff" fontFamily="DM Sans">
              {p.idx + 1}
            </text>
          </g>
        )}
      </svg>

      {/* "my location" label */}
      <div style={{
        position: 'absolute', left: me.x + 14, top: me.y - 9,
        background: 'rgba(255,255,255,0.96)',
        border: '0.5px solid rgba(0,0,0,0.05)',
        borderRadius: 5, padding: '2px 6px',
        fontSize: 10.5, fontWeight: 600, color: '#2456a6',
        whiteSpace: 'nowrap', boxShadow: '0 1px 2px rgba(0,0,0,0.06)'
      }}>我的位置</div>

      {/* Place name labels — directly above or below each marker */}
      {pts.map((p, i) => {
        const pos = labelPos(p, i);
        const isActive = i === activeIdx;
        return (
          <button
            key={'lbl-' + p.id}
            onClick={() => onMarker && onMarker(i)}
            style={{
              position: 'absolute', ...pos,
              background: isActive ? '#FF6633' : 'rgba(255,255,255,0.97)',
              color: isActive ? '#fff' : '#1a1a1a',
              border: isActive ? 'none' : '0.5px solid rgba(0,0,0,0.06)',
              borderRadius: 6, padding: '3px 8px',
              fontSize: 11, fontWeight: 600,
              whiteSpace: 'nowrap', cursor: 'pointer',
              boxShadow: isActive ?
              '0 2px 6px rgba(242, 98, 24, 0.35)' :
              '0 1px 3px rgba(0,0,0,0.1)',
              zIndex: 4, lineHeight: 1.2,
              fontFamily: 'inherit'
            }}>
            {p.short}
          </button>);

      })}

      {/* Transport-mode labels — sit along the route line, rotated to follow.
                     Perpendicular gap raised so the pill never touches the orange line. */}
      {segments.map((s, i) => {
        const dx = s.to.x - s.from.x;
        const dy = s.to.y - s.from.y;
        const len = Math.hypot(dx, dy) || 1;
        const ux = dx / len,uy = dy / len;
        const nx = -uy * s.side,ny = ux * s.side;
        const offset = s.gap;
        const t = s.t == null ? 0.5 : s.t;
        const mx = s.from.x + dx * t + nx * offset;
        const my = s.from.y + dy * t + ny * offset;
        let angleDeg = Math.atan2(dy, dx) * 180 / Math.PI;
        if (angleDeg > 90) angleDeg -= 180;else
        if (angleDeg < -90) angleDeg += 180;
        return (
          <div key={'seg-' + i} style={{
            position: 'absolute', left: mx, top: my,
            transform: `translate(-50%, -50%) rotate(${angleDeg}deg)`,
            transformOrigin: 'center',
            background: '#fff',
            border: '0.5px solid rgba(0,0,0,0.05)',
            borderRadius: 999, padding: '3px 9px 3px 6px',
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: 10.5, fontWeight: 600, color: s.color,
            whiteSpace: 'nowrap',
            boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
            zIndex: 3, pointerEvents: 'none',
            lineHeight: 1
          }}>
            <Icon name={s.icon} size={11} color={s.color} />
            <span>{s.mode}</span>
            <span className="num" style={{ color: '#48484A', fontWeight: 600 }}>{s.time}</span>
          </div>);

      })}

      {/* Top-left price summary chip — answers "how much per person" without leaving the map */}
      <div style={{
        position: 'absolute', left: 10, top: 10, zIndex: 4,
        display: 'inline-flex', alignItems: 'center', gap: 5,
        background: 'rgba(255,255,255,0.96)',
        border: '0.5px solid rgba(0,0,0,0.05)',
        borderRadius: 10, padding: '5px 9px 5px 8px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        fontSize: 11.5, color: '#1d1d1f',
        whiteSpace: 'nowrap', lineHeight: 1, opacity: "0"
      }}>
        <Icon name="Wallet" size={12} color="#1a1a1a" />
        <span></span>
        <span className="num" style={{ fontWeight: 700, color: '#1a1a1a' }}>¥{MOCK_ROUTE.total_avg_per_person}</span>
      </div>

      {/* expand button */}
      {!expanded &&
      <button style={{
        position: 'absolute', right: 10, bottom: 10, zIndex: 4,
        background: '#fff', border: 'none', borderRadius: 10,
        padding: '7px 11px', fontSize: 12, fontWeight: 500,
        display: 'inline-flex', alignItems: 'center', gap: 4,
        boxShadow: '0 2px 6px rgba(0,0,0,0.08)', cursor: 'pointer',
        color: '#1d1d1f'
      }}>
          <Icon name="Maximize2" size={12} />
          展开地图
        </button>
      }
    </div>);

}

// ─── Top nav bar ───────────────────────────────────────────────
function DetailTopBar({ onBack, onSave, onShare, saved, title }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '6px 8px 8px', background: '#F7F7F8',
      borderBottom: '1px solid rgba(0,0,0,0.04)'
    }}>
      <button onClick={onBack} style={{
        width: 36, height: 36, borderRadius: 999, border: 'none',
        background: 'transparent', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        <Icon name="ChevronLeft" size={22} color="#1a1a1a" />
      </button>
      <div style={{ fontWeight: 600, fontSize: 16, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 240 }}>{title || '路线详情'}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <button onClick={onSave} title="收藏路线" style={{
          width: 36, height: 36, borderRadius: 999, border: 'none',
          background: 'transparent', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <Icon
            name={saved ? 'BookmarkCheck' : 'Bookmark'}
            size={18}
            color={saved ? '#FF6633' : '#1a1a1a'}
          />
        </button>
        <button onClick={onShare} title="分享" style={{
          width: 36, height: 36, borderRadius: 999, border: 'none',
          background: 'transparent', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <Icon name="Share2" size={18} color="#1a1a1a" />
        </button>
      </div>
    </div>);

}

// ─── Image lightbox (click-to-enlarge) ─────────────────────────
function ImageLightbox({ open, place, imgIdx, onClose, onNav }) {
  useEffectRD(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();else
      if (e.key === 'ArrowLeft') onNav(-1);else
      if (e.key === 'ArrowRight') onNav(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose, onNav]);

  if (!open || !place) return null;
  const palettes = [
  ['#FFE4D0', '#FFD4B8'],
  ['#FFD4B8', '#FFC094'],
  ['#FFE9DA', '#FFD8C0']];

  const pal = palettes[place.imgPalette || 0];
  const total = 4;
  const hasImage = imgIdx === 0 && place.imageUrl && place.imageUrl.length > 0;
  return (
    <div onClick={onClose} className="fade-up" style={{
      position: 'absolute', inset: 0, background: 'rgba(15, 12, 8, 0.92)',
      zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20, cursor: 'pointer'
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: '88%', aspectRatio: '4/3', borderRadius: 14,
        background: hasImage ? '#1a1a1a' : `repeating-linear-gradient(135deg, ${pal[0]} 0 14px, ${pal[1]} 14px 28px)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#48484A', fontFamily: 'inherit', fontSize: 13,
        textAlign: 'center', lineHeight: 1.5,
        boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
        position: 'relative', overflow: 'hidden'
      }}>
        {hasImage ? (
          <img src={place.imageUrl} alt={place.name} style={{
            width: '100%', height: '100%', objectFit: 'contain',
            display: 'block'
          }} />
        ) : (
          <span>店铺实拍<br />{place.name}<br />图 {imgIdx + 1} / {total}</span>
        )}
      </div>

      <button onClick={(e) => {e.stopPropagation();onClose();}} style={{
        position: 'absolute', top: 14, right: 14, width: 36, height: 36, borderRadius: 999,
        background: 'rgba(255,255,255,0.14)', border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)'
      }}>
        <Icon name="X" size={18} color="#fff" />
      </button>

      <button onClick={(e) => {e.stopPropagation();onNav(-1);}} style={{
        position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
        width: 36, height: 36, borderRadius: 999,
        background: 'rgba(255,255,255,0.14)', border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        <Icon name="ChevronLeft" size={20} color="#fff" />
      </button>
      <button onClick={(e) => {e.stopPropagation();onNav(1);}} style={{
        position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
        width: 36, height: 36, borderRadius: 999,
        background: 'rgba(255,255,255,0.14)', border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        <Icon name="ChevronRight" size={20} color="#fff" />
      </button>

      {/* dots */}
      <div style={{
        position: 'absolute', bottom: 28, left: '50%', transform: 'translateX(-50%)',
        display: 'inline-flex', gap: 6
      }}>
        {Array.from({ length: total }).map((_, i) =>
        <span key={i} style={{
          width: i === imgIdx ? 18 : 6, height: 6, borderRadius: 999,
          background: i === imgIdx ? '#fff' : 'rgba(255,255,255,0.35)',
          transition: 'all 0.2s'
        }} />
        )}
      </div>
    </div>);

}

// ─── Overview card (compact summary at top) ────────────────────
function OverviewCard({ routeInfo }) {
  const r = routeInfo || window.MOCK_ROUTE || {};
  return (
    <div style={{
      margin: '0 14px', padding: '12px 14px',
      background: '#fff', borderRadius: 14, border: '1px solid #EDEDEF',
      display: 'flex', alignItems: 'center', gap: 10
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <span style={{ fontSize: 14.5, fontWeight: 700 }}>{r.route_name || '推荐路线'}</span>
          <StatusPill tone="green">已优化</StatusPill>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          fontSize: 12, color: '#48484A', flexWrap: 'wrap'
        }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
            <Icon name="Clock" size={11} color="#8e8e93" />
            <span className="num">{r.total_time || '—'}</span>
          </span>
          <span style={{ color: '#D1D1D6' }}>·</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
            <Icon name="Wallet" size={11} color="#8e8e93" />
            <span>人均 <span className="num" style={{ fontWeight: 600, color: '#1a1a1a' }}>¥{r.total_avg_per_person != null ? r.total_avg_per_person : '—'}</span></span>
          </span>
          <span style={{ color: '#D1D1D6' }}>·</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
            <Icon name="Footprints" size={11} color="#8e8e93" />
            <span className="num">{r.total_distance || '—'}</span>
          </span>
        </div>
      </div>
    </div>);

}

// ─── Compact place block (no outer card) ───────────────────────
// Renders the POI content flush against the timeline rail, with a thin divider only.
function PlaceBlock({ place, index, active, onClick, onDetail, onSwap, onImageOpen }) {
  const palettes = [
  ['#FFE4D0', '#FFD4B8'], // p1
  ['#FFD4B8', '#FFC094'], // p2
  ['#FFE9DA', '#FFD8C0'] // p3
  ];
  const pal = palettes[index % palettes.length];

  return (
    <div onClick={onClick} style={{
      background: '#fff',
      border: `1px solid ${active ? '#FFC8AA' : '#EDEDEF'}`,
      borderRadius: 14, padding: '12px 12px 11px',
      boxShadow: active ? '0 4px 14px rgba(242, 98, 24, 0.08)' : 'none',
      transition: 'all 0.2s', cursor: 'pointer'
    }}>
      {/* head row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 6 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, color: '#8e8e93', fontWeight: 500, marginBottom: 2 }}>
            第 {index + 1} 站 · {place.category}
          </div>
          <div style={{
            fontSize: 15.5, fontWeight: 700, color: '#1a1a1a',
            lineHeight: 1.3, marginBottom: 5,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
          }}>{place.name}</div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 7,
            fontSize: 11.5, color: '#48484A', flexWrap: 'wrap', rowGap: 3
          }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
              <Icon name="Star" size={11} color="#1a1a1a" />
              <span className="num" style={{ color: '#1a1a1a', fontWeight: 600 }}>{place.rating}</span>
              <span style={{ color: '#8e8e93' }} className="num">· {place.review_count}</span>
            </span>
            <span style={{ color: '#D1D1D6' }}>·</span>
            <span>人均 <span className="num" style={{ fontWeight: 600 }}>¥{place.avg_price}</span></span>
            <span style={{ color: '#D1D1D6' }}>·</span>
            <span className="num">{place.distance}</span>
          </div>
        </div>
      </div>

      {/* status + tags in ONE dense row, wrapping */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 9 }}>
        <StatusPillSm tone={place.status_tone}>{place.current_status_short}</StatusPillSm>
        <StatusPillSm tone="gray" dot={false}>
          <Icon name="Clock" size={9} style={{ marginRight: 2 }} />
          {place.opening_hours}
        </StatusPillSm>
        {place.tags.map((t) => <TagSm key={t} tone="green">{t}</TagSm>)}
        {place.risk_tags.map((t) => <TagSm key={t} tone="amber">⚠ {t}</TagSm>)}
      </div>

      {/* image gallery — real photos with gradient fallback */}
      <div style={{
        background: '#F7F7F8', borderRadius: 10, padding: '8px 9px 9px',
        marginBottom: 10, border: '1px solid #EDEDEF'
      }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 6
        }}>
          <div style={{ fontSize: 11, color: '#6E6E73', fontWeight: 500 }}>相关图片</div>
          <div style={{
            fontSize: 10, color: '#8e8e93',
            display: 'inline-flex', alignItems: 'center', gap: 3
          }}>
            <Icon name="ChevronsLeftRight" size={10} color="#8e8e93" />
            左右滑动 · 点击放大
          </div>
        </div>
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            display: 'flex', gap: 6, overflowX: 'auto', overflowY: 'hidden',
            scrollSnapType: 'x mandatory', paddingBottom: 2,
            scrollbarWidth: 'none'
          }}
          className="frame-scroll">

          {[0, 1, 2, 3].map((i) => {
            const hasRealImage = i === 0 && place.imageUrl && place.imageUrl.length > 0;
            return (
          <button
            key={i}
            onClick={(e) => {e.stopPropagation();onImageOpen(place, i);}}
            style={{
              width: 78, height: 78, borderRadius: 9, flexShrink: 0,
              background: hasRealImage ? '#E5E5EA' : `repeating-linear-gradient(135deg, ${pal[0]} 0 8px, ${pal[1]} 8px 16px)`,
              cursor: 'zoom-in', border: i === 0 ? '1.5px solid #FF6633' : '1px solid #E8E8EA',
              padding: 0, scrollSnapAlign: 'start',
              position: 'relative', overflow: 'hidden'
            }}>
              {hasRealImage ? (
                <img src={place.imageUrl} alt={place.name} style={{
                  width: '100%', height: '100%', objectFit: 'cover',
                  display: 'block'
                }} />
              ) : null}
              <span style={{
              position: 'absolute', left: 0, bottom: 0, margin: 5,
              fontFamily: 'inherit', fontSize: 10, color: '#1a1a1a', fontWeight: 600,
              background: 'rgba(255,255,255,0.7)', padding: '1px 4px', borderRadius: 4
            }}>{i + 1}</span>
            </button>
            );
          })}
        </div>
      </div>

      {/* action — single CTA */}
      <div>
        <PrimaryBtn onClick={(e) => {e.stopPropagation();onDetail(place);}} icon="FileText" full size="sm">
          查看详情
        </PrimaryBtn>
      </div>
    </div>);

}

// ─── Compact status pill + tag variants (used only here) ───────
function StatusPillSm({ tone = 'green', children, dot = true }) {
  const tones = {
    green: { bg: '#E8F5EC', fg: '#1F8B4C', dot: '#22C55E' },
    amber: { bg: '#FFF1DE', fg: '#D14600', dot: '#F97316' },
    gray: { bg: '#F1EFEC', fg: '#48484A', dot: '#9CA3AF' }
  };
  const t = tones[tone] || tones.gray;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      background: t.bg, color: t.fg,
      fontSize: 10.5, fontWeight: 500, padding: '2px 7px',
      borderRadius: 999, lineHeight: 1.2, whiteSpace: 'nowrap'
    }}>
      {dot && <span style={{ width: 4, height: 4, borderRadius: 999, background: t.dot }} />}
      {children}
    </span>);

}

function TagSm({ tone = 'green', children }) {
  const tones = {
    green: { bg: '#EAF6EC', fg: '#2c7a44' },
    amber: { bg: '#FFF1DE', fg: '#D14600' }
  };
  const t = tones[tone] || tones.green;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      background: t.bg, color: t.fg,
      fontSize: 10.5, padding: '2px 7px',
      borderRadius: 5, lineHeight: 1.2, fontWeight: 500,
      whiteSpace: 'nowrap'
    }}>{children}</span>);

}

// ─── Inline transport connector (A → B, NOT a card) ────────────
// Renders as a small chip flowing on the timeline rail, no border, transparent feel.
function TransportConnector({ t, onToast }) {
  const isMetro = t.mode && t.mode.includes('地铁');
  const isWalk = t.mode === '步行';
  const color = isMetro ? '#2456a6' : isWalk ? '#2c7a44' : '#48484A';
  const bg = isMetro ? '#E6EEF8' : isWalk ? '#EAF6EC' : '#FFF1E5';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 10, padding: '2px 4px 2px 0'
    }}>
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        fontSize: 12.5, color: '#1d1d1f', flexWrap: 'wrap', rowGap: 4
      }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          background: bg, color, fontWeight: 600,
          fontSize: 11.5, padding: '3px 9px', borderRadius: 999, lineHeight: 1
        }}>
          <Icon name={t.icon} size={11} color={color} />
          {t.mode}
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 4, color: '#48484A' }}>
          <span className="num">{t.walking_time || t.time}</span>
          {t.distance &&
          <>
              <span style={{ color: '#D1D1D6' }}>/</span>
              <span className="num" style={{ color: '#8e8e93' }}>{t.distance}</span>
            </>
          }
        </span>
      </div>
      <button onClick={(e) => {e.stopPropagation();onToast('已模拟跳转导航');}} style={{
        background: 'transparent', border: 'none', cursor: 'pointer',
        color: '#1a1a1a', fontSize: 12, fontWeight: 500,
        display: 'inline-flex', alignItems: 'center', gap: 1, padding: '4px 2px',
        whiteSpace: 'nowrap', flexShrink: 0
      }}>
        查看路线
        <Icon name="ChevronRight" size={12} color="#1a1a1a" />
      </button>
    </div>);

}

// ─── Departure inline (origin → station 1) ─────────────────────
// Compact two-row: pill+station on row 1, time/distance + 查看路线 on row 2,
// so nothing wraps and items align cleanly against the rail.
function DepartureInline({ t, onToast }) {
  return (
    <div style={{ padding: '0 4px 0 0' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        minWidth: 0
      }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          background: '#E6EEF8', color: '#2456a6', fontWeight: 600,
          fontSize: 11.5, padding: '3px 9px', borderRadius: 999, lineHeight: 1,
          flexShrink: 0
        }}>
          <Icon name="TrainFront" size={11} color="#2456a6" />
          {t.mode}
        </span>
        <span style={{
          fontSize: 12.5, color: '#1d1d1f', flex: 1, minWidth: 0,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
        }}>
          {t.metro_line} · {t.station} {t.exit}
        </span>
      </div>
      <div style={{
        marginTop: 5,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 8
      }}>
        <span className="num" style={{
          fontSize: 11.5, color: '#8e8e93',
          display: 'inline-flex', alignItems: 'baseline', gap: 5
        }}>
          <span>{t.walking_time}</span>
          <span style={{ color: '#D1D1D6' }}>/</span>
          <span>{t.distance}</span>
        </span>
        <button onClick={(e) => {e.stopPropagation();onToast('已模拟跳转导航');}} style={{
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: '#1a1a1a', fontSize: 12, fontWeight: 500,
          display: 'inline-flex', alignItems: 'center', gap: 1, padding: '2px 0',
          whiteSpace: 'nowrap', flexShrink: 0
        }}>
          查看路线
          <Icon name="ChevronRight" size={12} color="#1a1a1a" />
        </button>
      </div>
    </div>);

}

// ─── Vertical timeline with continuous left rail ───────────────
// The rail unifies all stations + transport segments into a single A→B→C flow.
function Timeline({ activeIdx, setActiveIdx, onToast, onImageOpen, onOpenDetail, registerCardRef, places, transport }) {
  const p = places || window.MOCK_PLACES || [];
  const t = transport || window.MOCK_TRANSPORT || [];
  const RAIL_X = 18; // x-center of the rail
  const NODE = 26; // station circle diameter
  const SUBNODE = 12; // transport mid-node diameter
  const COL_W = 40; // total left column width (rail + gap)

  // origin → station 1
  const dep = t[0];

  return (
    <div style={{ position: 'relative', padding: '0 14px 4px' }}>
      {p.map((place, i) => {
        const isFirst = i === 0;
        const isLast = i === p.length - 1;
        const transportBefore = i === 0 ? dep : t[i];

        return (
          <React.Fragment key={place.id}>
            {/* ── First station gets a dedicated origin header row that aligns the
                  blue dot exactly with "从这里出发" before the transport details. ── */}
            {isFirst &&
            <div style={{ display: 'flex', alignItems: 'center', padding: '4px 0 2px' }}>
                <div style={{ width: COL_W, position: 'relative', flexShrink: 0, alignSelf: 'stretch' }}>
                  <div style={{
                  position: 'absolute', left: RAIL_X, top: '50%', bottom: -8, width: 0,
                  borderLeft: '2px dashed #E0D9CB'
                }} />
                  <div style={{
                  position: 'absolute', left: RAIL_X, top: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: 11, height: 11, borderRadius: 999,
                  background: '#2456a6',
                  boxShadow: '0 0 0 3px rgba(36,86,166,0.15)'
                }} />
                </div>
                <div style={{ fontSize: 12, color: '#2456a6', fontWeight: 600, lineHeight: 1 }}>
                  从这里出发
                </div>
              </div>
            }

            {/* ── Transport segment ABOVE this station ── */}
            <div style={{ position: 'relative', display: 'flex' }}>
              {/* rail column */}
              <div style={{ width: COL_W, position: 'relative', flexShrink: 0 }}>
                <div style={{
                  position: 'absolute',
                  left: RAIL_X, top: 0, bottom: 0, width: 0,
                  borderLeft: '2px dashed #E0D9CB'
                }} />
                {/* mid sub-node halfway down marks the transport leg */}
                <div style={{
                  position: 'absolute', left: RAIL_X, top: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: SUBNODE, height: SUBNODE, borderRadius: 999,
                  background: '#fff', border: '1.5px solid #D9CFB8'
                }} />
              </div>
              {/* connector content */}
              <div style={{ flex: 1, minWidth: 0, padding: '10px 0 10px' }}>
                {isFirst ?
                <DepartureInline t={dep} onToast={onToast} /> :
                <TransportConnector t={transportBefore} onToast={onToast} />}
              </div>
            </div>

            {/* ── Station node + place block ── */}
            <div style={{ position: 'relative', display: 'flex' }}>
              {/* rail column with the numbered circle */}
              <div style={{ width: COL_W, position: 'relative', flexShrink: 0, opacity: "1" }}>
                {/* rail extends through, but circle covers it */}
                {!isLast &&
                <div style={{
                  position: 'absolute',
                  left: RAIL_X, top: NODE + 8, bottom: 0, width: 0,
                  borderLeft: '2px dashed #E0D9CB'
                }} />
                }
                <div style={{
                  position: 'absolute', left: RAIL_X, top: 8,
                  transform: 'translateX(-50%)',
                  width: NODE, height: NODE, borderRadius: 999,
                  background: i === activeIdx ? '#FF6633' : '#fff',
                  border: i === activeIdx ? '2px solid #FF6633' : '2px solid #FF6633',
                  color: i === activeIdx ? '#fff' : '#FF6633',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: 12.5,
                  boxShadow: i === activeIdx ? '0 3px 10px rgba(242, 98, 24, 0.35)' : '0 1px 3px rgba(0,0,0,0.08)',
                  zIndex: 2
                }} className="num">{i + 1}</div>
              </div>
              {/* place block */}
              <div ref={(el) => registerCardRef && registerCardRef(i, el)} style={{ flex: 1, minWidth: 0, marginBottom: 6 }}>
                <PlaceBlock
                  place={place}
                  index={i}
                  active={i === activeIdx}
                  onClick={() => setActiveIdx(i)}
                  onDetail={() => onOpenDetail(place)}
                  onSwap={() => onToast('正在为这一站寻找替代…')}
                  onImageOpen={onImageOpen} />
                
              </div>
            </div>
          </React.Fragment>);

      })}

      {/* Return option lives as a quiet footer instead of a rail tail —
           there's no "next station" so the dashed rail ends at station 3. */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 10, margin: '14px 4px 4px', padding: '10px 12px',
        background: '#F7F7F8', border: '1px solid #EDEDEF', borderRadius: 10
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          fontSize: 12, color: '#48484A'
        }}>
          <Icon name="Home" size={13} color="#6E6E73" />
          <span>行程结束 · 返程参考</span>
          <span style={{ color: '#D1D1D6' }}>·</span>
          <span className="num" style={{ color: '#8e8e93' }}>
            步行 5 分到地铁，打车约 ¥20
          </span>
        </div>
        <button onClick={() => onToast('已模拟跳转返程导航')} style={{
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: '#1a1a1a', fontSize: 12, fontWeight: 500,
          display: 'inline-flex', alignItems: 'center', gap: 1, padding: '2px 0',
          whiteSpace: 'nowrap', flexShrink: 0
        }}>
          导航回家
          <Icon name="ChevronRight" size={12} color="#1a1a1a" />
        </button>
      </div>
    </div>);

}

// ─── Bottom action bar (fixed) ─────────────────────────────────
function BottomActionBar({ onStart, firstPlace }) {
  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 10,
      padding: '11px 14px 30px',
      background: 'rgba(251, 249, 245, 0.94)',
      backdropFilter: 'blur(14px) saturate(180%)',
      WebkitBackdropFilter: 'blur(14px) saturate(180%)',
      borderTop: '1px solid rgba(0,0,0,0.05)',
    }}>
      <PrimaryBtn onClick={onStart} icon="Navigation" full size="lg">
        立即出发
      </PrimaryBtn>
    </div>);

}

// ─── POI detail bottom sheet (replaces toast) ─────────────────
function PoiDetailSheet({ place, open, onClose, onNavigate }) {
  if (!open || !place) return null;

  return (
    <div onClick={onClose} className="fade-up" style={{
      position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)',
      zIndex: 150, display: 'flex', alignItems: 'flex-end',
      justifyContent: 'center'
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: '100%', maxWidth: 420, maxHeight: '72%',
        background: '#fff', borderRadius: '20px 20px 0 0',
        overflow: 'hidden', display: 'flex', flexDirection: 'column',
        animation: 'slideUp 0.28s ease-out'
      }}>
        {/* drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 6px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 999, background: '#D1D1D6' }} />
        </div>

        {/* header image */}
        <div style={{
          margin: '0 16px', height: 140, borderRadius: 12,
          background: place.imageUrl
            ? 'transparent'
            : 'linear-gradient(135deg, #FFE4D0, #FFD4B8)',
          overflow: 'hidden', position: 'relative'
        }}>
          {place.imageUrl ? (
            <img src={place.imageUrl} alt={place.name} style={{
              width: '100%', height: '100%', objectFit: 'cover'
            }} />
          ) : (
            <div style={{
              width: '100%', height: '100%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#8e8e93', fontSize: 13
            }}>暂无图片</div>
          )}
        </div>

        {/* info */}
        <div style={{ padding: '14px 16px', overflowY: 'auto', flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>{place.name}</div>
          <div style={{ fontSize: 12, color: '#8e8e93', marginBottom: 10 }}>{place.category}</div>

          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: 10,
            fontSize: 12, color: '#48484A', marginBottom: 12
          }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
              <Icon name="Star" size={12} color="#FF6633" />
              <span className="num" style={{ fontWeight: 600, color: '#1a1a1a' }}>{place.rating}</span>
            </span>
            <span>人均 <span className="num" style={{ fontWeight: 600 }}>¥{place.avg_price}</span></span>
            {place.address ? <span>{place.address}</span> : null}
          </div>

          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12
          }}>
            <StatusPillSm tone="green">{place.current_status || '营业中'}</StatusPillSm>
            <StatusPillSm tone="gray" dot={false}>
              <Icon name="Clock" size={9} style={{ marginRight: 2 }} />
              {place.opening_hours || '—'}
            </StatusPillSm>
            {place.wait_time && place.wait_time !== '无需排队' ? (
              <StatusPillSm tone="amber">{place.wait_time}</StatusPillSm>
            ) : null}
          </div>

          {place.tags && place.tags.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 12 }}>
              {place.tags.map((t) => <TagSm key={t} tone="green">{t}</TagSm>)}
            </div>
          ) : null}

          {place.recommendation_reason ? (
            <div style={{
              background: '#FFF9F5', borderRadius: 10, padding: '10px 12px',
              fontSize: 12.5, color: '#48484A', lineHeight: 1.6, marginBottom: 10
            }}>
              <div style={{ fontWeight: 600, color: '#FF6633', marginBottom: 4 }}>推荐理由</div>
              {place.recommendation_reason}
            </div>
          ) : null}

          {/* navigate to this place — open map chooser */}
          <button onClick={() => onNavigate && onNavigate(place)} style={{
            width: '100%', padding: '10px', borderRadius: 10,
            background: '#FF6633', border: 'none', color: '#fff',
            fontSize: 14, fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
          }}>
            <Icon name="Navigation" size={16} color="#fff" />
            导航到此处
          </button>
        </div>

        {/* close */}
        <button onClick={onClose} style={{
          position: 'absolute', top: 12, right: 14,
          width: 32, height: 32, borderRadius: 999,
          background: 'rgba(0,0,0,0.45)', border: 'none',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <Icon name="X" size={18} color="#fff" />
        </button>
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

// ─── Map chooser sheet (Gaode / Baidu / Tencent) ────────────
function MapChooserSheet({ open, onClose, targetPlace }) {
  if (!open || !targetPlace) return null;

  var name = encodeURIComponent(targetPlace.name || '目的地');
  var lng = targetPlace.lng;
  var lat = targetPlace.lat;

  var maps = [
    {
      name: '高德地图',
      desc: '步行导航',
      color: '#1677FF',
      icon: 'Navigation',
      url: 'https://uri.amap.com/navigation?to=' + lng + ',' + lat + ',' + name + '&mode=walk&callnative=1'
    },
    {
      name: '百度地图',
      desc: '步行导航',
      color: '#38B03C',
      icon: 'Map',
      url: 'https://api.map.baidu.com/direction?destination=' + lat + ',' + lng + '&destination_name=' + name + '&coord_type=gcj02&mode=walking&src=meituan.planmate'
    },
    {
      name: '腾讯地图',
      desc: '步行导航',
      color: '#07C160',
      icon: 'Map',
      url: 'https://apis.map.qq.com/uri/v1/routeplan?type=walk&to=' + name + '&tocoord=' + lat + ',' + lng + '&referer=meituan'
    }
  ];

  return (
    <div onClick={onClose} className="fade-up" style={{
      position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)',
      zIndex: 180, display: 'flex', alignItems: 'flex-end', justifyContent: 'center'
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: '100%', maxWidth: 420,
        background: '#fff', borderRadius: '20px 20px 0 0',
        overflow: 'hidden', animation: 'slideUp 0.28s ease-out'
      }}>
        {/* drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 6px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 999, background: '#D1D1D6' }} />
        </div>

        <div style={{ fontSize: 15, fontWeight: 700, textAlign: 'center', padding: '6px 0 14px' }}>
          选择导航地图
        </div>

        {maps.map(function(m) { return (
          <button key={m.name} onClick={function() { window.open(m.url, '_blank'); onClose(); }} style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 12,
            padding: '14px 20px', border: 'none', background: '#fff',
            cursor: 'pointer', borderBottom: '1px solid #F2F2F7',
            fontFamily: 'inherit'
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: m.color, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              flexShrink: 0
            }}>
              <Icon name={m.icon} size={20} color="#fff" />
            </div>
            <div style={{ flex: 1, textAlign: 'left' }}>
              <div style={{ fontSize: 14.5, fontWeight: 600, color: '#1a1a1a' }}>{m.name}</div>
              <div style={{ fontSize: 12, color: '#8e8e93' }}>到 {targetPlace.name} · {m.desc}</div>
            </div>
            <Icon name="ChevronRight" size={16} color="#C7C7CC" />
          </button>
        );})}

        <button onClick={onClose} style={{
          width: '100%', padding: '14px', border: 'none',
          background: '#fff', cursor: 'pointer', fontSize: 14.5,
          color: '#8e8e93', fontFamily: 'inherit', fontWeight: 500
        }}>
          取消
        </button>
      </div>
    </div>
  );
}

// ─── Main detail screen ────────────────────────────────────────
function RouteDetailScreen({ route, onBack, toast, setToast }) {
  const detail = buildDetailData(route);
  const places = detail.places;
  const transport = detail.transport;
  const routeInfo = detail.routeInfo;
  const stationCount = detail.stationCount;
  const firstPlace = places.length > 0 ? places[0] : null;

  const [activeIdx, setActiveIdx] = useStateRD(0);
  const [lightbox, setLightbox] = useStateRD({ open: false, place: null, imgIdx: 0 });
  const [detailPlace, setDetailPlace] = useStateRD(null);
  const [showMapChooser, setShowMapChooser] = useStateRD(false);
  const [mapTarget, setMapTarget] = useStateRD(null);
  const [saved, setSaved] = useStateRD(false);
  const scrollRef = useRefRD(null);
  const cardRefs = useRefRD({});

  const registerCardRef = (idx, el) => {if (el) cardRefs.current[idx] = el;};

  const handleMarkerClick = (idx) => {
    setActiveIdx(idx);
    const card = cardRefs.current[idx];
    const container = scrollRef.current;
    if (card && container) {
      const cardRect = card.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const offset = container.scrollTop + (cardRect.top - containerRect.top) - 16;
      container.scrollTo({ top: offset, behavior: 'smooth' });
    }
  };

  const handleToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1800);
  };

  const openImage = (place, imgIdx) => setLightbox({ open: true, place, imgIdx });
  const closeImage = () => setLightbox({ open: false, place: null, imgIdx: 0 });
  const navImage = (delta) => setLightbox((lb) => ({
    ...lb, imgIdx: (lb.imgIdx + delta + 4) % 4
  }));

  return (
    <div className="page-enter" style={{
      height: '100%', display: 'flex', flexDirection: 'column', background: '#F7F7F8'
    }}>
      <DetailTopBar
        title={routeInfo.route_name}
        onBack={onBack}
        saved={saved}
        onSave={() => {
          setSaved((v) => !v);
          handleToast(saved ? '已取消收藏' : '已收藏到我的路线');
        }}
        onShare={() => handleToast('已打开分享面板')}
      />

      <div ref={scrollRef} className="frame-scroll" style={{
        flex: 1, overflowY: 'auto', overflowX: 'hidden', paddingBottom: 110
      }}>
        {/* map */}
        <div style={{ padding: '12px 14px 12px' }}>
          <GaodeMap places={places} activeIdx={activeIdx} onMarker={handleMarkerClick} />
        </div>

        {/* compact overview */}
        <OverviewCard routeInfo={routeInfo} />

        {/* section header */}
        <div style={{
          padding: '18px 18px 8px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: '#1a1a1a' }}>
            路线顺序 · {stationCount} 站
          </div>
          <div style={{ fontSize: 11.5, color: '#8e8e93', opacity: "0" }}>点击地点查看详情</div>
        </div>

        {/* timeline with connector rail */}
        <Timeline
          places={places}
          transport={transport}
          activeIdx={activeIdx}
          setActiveIdx={setActiveIdx}
          onToast={handleToast}
          onImageOpen={openImage}
          onOpenDetail={(place) => setDetailPlace(place)}
          registerCardRef={registerCardRef} />


        <div style={{
          textAlign: 'center', fontSize: 11, color: '#8e8e93',
          padding: '14px 24px 8px', lineHeight: 1.5
        }}>
          路线仅供参考，实际情况可能受交通、天气等因素影响
        </div>
      </div>

      <BottomActionBar
        firstPlace={firstPlace}
        onStart={() => { setMapTarget(firstPlace); setShowMapChooser(true); }} />

      <Toast message={toast} />
      <ImageLightbox
        open={lightbox.open}
        place={lightbox.place}
        imgIdx={lightbox.imgIdx}
        onClose={closeImage}
        onNav={navImage} />
      <PoiDetailSheet
        open={detailPlace !== null}
        place={detailPlace}
        onClose={() => setDetailPlace(null)}
        onNavigate={(place) => { setDetailPlace(null); setMapTarget(place); setShowMapChooser(true); }} />
      <MapChooserSheet
        open={showMapChooser}
        onClose={() => setShowMapChooser(false)}
        targetPlace={mapTarget} />

    </div>);

}

Object.assign(window, { RouteDetailScreen, GaodeMap, MockMapFallback, buildDetailData, PoiDetailSheet, MapChooserSheet });