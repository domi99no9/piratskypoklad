// Original vector art (cartoon style, thick outlines, glossy gradients). No third-party assets.
window.SYMBOL_ART = (function () {
  const O = 'stroke="#2a1405" stroke-width="5" stroke-linejoin="round"';
  const defs = (id) => `<defs>
   <linearGradient id="gold" x1="0" y1="0" x2="0.3" y2="1"><stop offset="0" stop-color="#fff3c4"/><stop offset=".3" stop-color="#e8b23a"/><stop offset=".5" stop-color="#8a5a12"/><stop offset=".7" stop-color="#f2c75a"/><stop offset="1" stop-color="#5a3608"/></linearGradient>
   <linearGradient id="gloss" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".6"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
   <radialGradient id="ft${id}" cx="50%" cy="45%" r="55%"><stop offset="0" stop-color="#3f6a3a"/><stop offset="1" stop-color="#0f2410"/></radialGradient>
   <filter id="bev" x="-20%" y="-20%" width="140%" height="140%">
    <feGaussianBlur in="SourceAlpha" stdDeviation="3.2" result="b"/>
    <feSpecularLighting in="b" surfaceScale="6" specularConstant="1.1" specularExponent="22" lighting-color="#fff7e0" result="sp"><fePointLight x="40" y="-60" z="160"/></feSpecularLighting>
    <feComposite in="sp" in2="SourceAlpha" operator="in" result="spi"/>
    <feDiffuseLighting in="b" surfaceScale="5" diffuseConstant="1.15" lighting-color="#fff" result="df"><feDistantLight azimuth="235" elevation="50"/></feDiffuseLighting>
    <feComposite in="SourceGraphic" in2="df" operator="arithmetic" k1="1.25" k2="0" k3="0" k4="0" result="lit"/>
    <feComposite in="lit" in2="spi" operator="arithmetic" k1="0" k2="1" k3=".85" k4="0" result="m"/>
    <feComposite in="m" in2="SourceAlpha" operator="in" result="mm"/>
    <feGaussianBlur in="SourceAlpha" stdDeviation="5" result="s"/><feOffset dx="4" dy="7" in="s" result="so"/>
    <feComponentTransfer in="so" result="sh"><feFuncA type="linear" slope=".7"/></feComponentTransfer>
    <feMerge><feMergeNode in="sh"/><feMergeNode in="mm"/></feMerge></filter></defs>`;
  const wrap = (id, a, b, body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">${defs(id)}<g filter="url(#bev)">${body}</g></svg>`;
  const card = (id, t, c1, c2, fs) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">${defs(id)}
   <linearGradient id="c${id}" x1="0" y1="0" x2=".2" y2="1"><stop offset="0" stop-color="${c2}"/><stop offset=".45" stop-color="${c1}"/><stop offset=".55" stop-color="${c1}"/><stop offset="1" stop-color="#111"/></linearGradient>
   <g filter="url(#bev)"><text x="100" y="${id==='10'?140:150}" font-family="Georgia,'Times New Roman',serif" font-weight="900" font-size="${fs}" text-anchor="middle" fill="url(#gold)" stroke="#3a2205" stroke-width="16" paint-order="stroke" stroke-linejoin="round">${t}</text>
   <text x="100" y="${id==='10'?140:150}" font-family="Georgia,'Times New Roman',serif" font-weight="900" font-size="${fs}" text-anchor="middle" fill="url(#c${id})" stroke="url(#gold)" stroke-width="7" paint-order="stroke" stroke-linejoin="round">${t}</text></g>
   <ellipse cx="88" cy="70" rx="30" ry="10" fill="#fff" opacity=".25" transform="rotate(-20 88 70)"/></svg>`;
  return {
    '10': card('10', '10', '#1565c0', '#90caf9', 118),
    J: card('J', 'J', '#2e7d32', '#a5d6a7', 160),
    Q: card('Q', 'Q', '#6a1b9a', '#ce93d8', 160),
    K: card('K', 'K', '#b71c1c', '#ef9a9a', 160),
    A: card('A', 'A', '#e0a800', '#fff59d', 160),
    kotva: wrap('ko', '#3a6e8f', '#0d2a3d', `<g fill="url(#gold)" ${O}>
      <circle cx="100" cy="42" r="16" fill="none" stroke="#2a1405" stroke-width="14"/><circle cx="100" cy="42" r="16" fill="none" stroke="#f5c542" stroke-width="7"/>
      <rect x="91" y="56" width="18" height="100" rx="6"/><rect x="62" y="70" width="76" height="16" rx="7"/>
      <path d="M40 112 Q50 170 100 172 Q150 170 160 112 L176 124 L158 96 L136 112 L148 114 Q140 150 100 152 Q60 150 52 114 L64 112 L42 96 L24 124 Z"/></g>`),
    papousek: wrap('pa', '#2e7d32', '#0b2b0e', `<g ${O}>
      <path d="M70 175 Q60 120 80 90 L120 90 Q140 130 120 175 Z" fill="#1e88e5"/>
      <path d="M78 150 Q50 165 46 190 L80 172 Z" fill="#fdd835"/>
      <circle cx="100" cy="72" r="44" fill="#e53935"/>
      <path d="M126 60 Q168 62 160 104 Q150 92 132 92 Z" fill="#ffca28"/><path d="M132 92 Q150 92 160 104 Q140 112 128 100Z" fill="#5d4037"/>
      <circle cx="108" cy="58" r="14" fill="#fff"/><circle cx="111" cy="58" r="7" fill="#111" stroke="none"/><circle cx="114" cy="55" r="2.5" fill="#fff" stroke="none"/>
      <path d="M72 100 Q60 130 76 150 Q98 130 92 104Z" fill="#43a047"/><path d="M60 40 Q70 18 92 30" fill="none" stroke-width="7"/></g>`),
    kompas: wrap('km', '#6d4c41', '#24150f', `<g ${O}>
      <circle cx="100" cy="102" r="74" fill="url(#gold)"/><circle cx="100" cy="102" r="58" fill="#f3e3c0"/>
      <path d="M100 48 L114 102 L100 156 L86 102Z" fill="#c62828"/><path d="M100 102 L114 102 L100 156 L86 102Z" fill="#eceff1"/>
      <path d="M46 102 L100 90 L154 102 L100 114Z" fill="#455a64" stroke-width="3"/><circle cx="100" cy="102" r="9" fill="url(#gold)"/>
      <text x="100" y="44" font-family="Georgia" font-size="20" font-weight="900" text-anchor="middle" fill="#2a1405" stroke="none">S</text></g>`),
    truhla: wrap('tr', '#7b1fa2', '#2a0a3a', `<g ${O}>
      <ellipse cx="100" cy="86" rx="62" ry="22" fill="#ffd54f"/><circle cx="76" cy="80" r="12" fill="#ffe082"/><circle cx="118" cy="78" r="12" fill="#ffe082"/><path d="M92 62 l8 -14 l8 14 l-8 10z" fill="#e91e63"/>
      <path d="M36 92 L164 92 L156 172 L44 172 Z" fill="#8d5524"/><rect x="36" y="88" width="128" height="18" fill="url(#gold)"/>
      <rect x="62" y="92" width="14" height="80" fill="url(#gold)" stroke-width="3"/><rect x="124" y="92" width="14" height="80" fill="url(#gold)" stroke-width="3"/>
      <rect x="88" y="112" width="24" height="30" rx="4" fill="url(#gold)"/><circle cx="100" cy="124" r="4" fill="#2a1405"/></g>`),
    kapitan: wrap('kp','','',`<circle cx="100" cy="100" r="92" fill="url(#gold)" stroke="#3a2205" stroke-width="4"/><circle cx="100" cy="100" r="76" fill="url(#ftkp)" stroke="#3a2205" stroke-width="4"/><g ${O} transform="translate(15 18) scale(.85)">
      <path d="M58 132 Q100 200 142 132 L140 110 L60 110Z" fill="#212121"/>
      <circle cx="100" cy="104" r="44" fill="#ffcc80"/>
      <path d="M62 120 Q100 168 138 120 Q130 150 100 156 Q70 150 62 120Z" fill="#3e2723"/>
      <path d="M82 124 Q100 116 118 124 Q100 130 82 124Z" fill="#3e2723"/>
      <circle cx="84" cy="98" r="7" fill="#111"/><path d="M106 88 L132 88 L128 108 L110 108Z" fill="#111"/><path d="M58 86 L140 100" stroke-width="4"/>
      <path d="M30 70 Q100 30 170 70 Q150 78 100 74 Q50 78 30 70Z" fill="#212121"/><path d="M50 66 Q100 -6 150 66 Q100 52 50 66Z" fill="#212121"/>
      <path d="M50 66 Q100 52 150 66" fill="none" stroke="#f5c542" stroke-width="5"/>
      <circle cx="100" cy="44" r="10" fill="#fff"/><path d="M94 52 l12 0" stroke-width="3"/></g>`),
    wild: wrap('wi', '#263238', '#000', `<g ${O}>
      <rect x="40" y="18" width="10" height="168" rx="4" fill="url(#gold)"/>
      <path d="M50 26 Q110 10 178 30 L170 120 Q110 104 50 120Z" fill="#111"/>
      <circle cx="110" cy="60" r="20" fill="#fafafa" stroke-width="4"/><circle cx="103" cy="58" r="5" fill="#111" stroke="none"/><circle cx="117" cy="58" r="5" fill="#111" stroke="none"/>
      <path d="M78 84 L142 100 M142 84 L78 100" stroke="#fafafa" stroke-width="9" stroke-linecap="round"/>
      <rect x="52" y="134" width="120" height="48" rx="10" fill="url(#gold)"/><text x="112" y="172" font-family="Impact,Arial Black,sans-serif" font-size="38" text-anchor="middle" fill="#3a1a02" stroke="none">WILD</text></g>`),
    wildTall: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 600">${defs('wt')}<g filter="url(#bev)">
      <rect x="22" y="10" width="14" height="585" rx="6" fill="url(#gold)" stroke="#2a1405" stroke-width="4"/><circle cx="29" cy="14" r="12" fill="url(#gold)" stroke="#2a1405" stroke-width="4"/>
      <path d="M36 40 Q110 10 190 46 Q170 140 190 240 Q180 330 190 420 Q110 390 36 430Z" fill="#141414" stroke="#2a1405" stroke-width="5"/>
      <circle cx="112" cy="170" r="38" fill="#eee" stroke="#2a1405" stroke-width="5"/><circle cx="98" cy="166" r="10" fill="#111"/><circle cx="126" cy="166" r="10" fill="#111"/><path d="M106 192 l6 -10 l6 10z" fill="#111"/>
      <path d="M58 228 L166 280 M166 228 L58 280" stroke="#eee" stroke-width="16" stroke-linecap="round"/>
      <rect x="30" y="470" width="150" height="70" rx="12" fill="url(#gold)" stroke="#2a1405" stroke-width="5"/>
      <text x="105" y="522" font-family="Impact,Arial Black,sans-serif" font-size="48" text-anchor="middle" fill="#3a1a02">WILD</text></g></svg>`,
    mapa: wrap('ma', '#00838f', '#002f33', `<g ${O}>
      <path d="M30 40 L80 28 L120 44 L172 32 L172 160 L120 172 L80 156 L30 168Z" fill="#f1d9a0"/>
      <path d="M80 28 L80 156 M120 44 L120 172" stroke-width="3" opacity=".5"/>
      <path d="M48 140 Q70 90 96 112 T140 70" fill="none" stroke="#8d6e63" stroke-width="5" stroke-dasharray="8 7"/>
      <path d="M130 58 L152 80 M152 58 L130 80" stroke="#c62828" stroke-width="9" stroke-linecap="round"/>
      <rect x="30" y="150" width="140" height="42" rx="10" fill="url(#gold)"/><text x="100" y="182" font-family="Impact,Arial Black,sans-serif" font-size="30" text-anchor="middle" fill="#3a1a02" stroke="none">SCATTER</text></g>`),
    lebka: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">${defs('lb')}<g filter="url(#bev)" stroke="#2a1405" stroke-width="5" stroke-linejoin="round">
      <path d="M40 92 Q40 26 100 26 Q160 26 160 92 Q160 120 140 128 L136 160 L64 160 L60 128 Q40 120 40 92Z" fill="#f5f5f5"/>
      <ellipse cx="76" cy="94" rx="18" ry="20" fill="#222"/><ellipse cx="124" cy="94" rx="18" ry="20" fill="#222"/><path d="M100 112 L90 132 L110 132Z" fill="#222"/>
      <path d="M80 160 L80 144 M100 160 L100 144 M120 160 L120 144" /></g></svg>`,
    poklad: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff6b0"/><stop offset=".5" stop-color="#f5c542"/><stop offset="1" stop-color="#8a5a0b"/></linearGradient></defs>
      <g stroke="#2a1405" stroke-width="5"><ellipse cx="70" cy="140" rx="40" ry="14" fill="url(#g)"/><ellipse cx="70" cy="126" rx="40" ry="14" fill="url(#g)"/><ellipse cx="130" cy="140" rx="40" ry="14" fill="url(#g)"/><ellipse cx="100" cy="110" rx="40" ry="14" fill="url(#g)"/>
      <path d="M100 30 l22 30 l-22 34 l-22 -34z" fill="#26c6da"/></g></svg>`
  };
})();
