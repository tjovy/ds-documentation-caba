import React, { useMemo, useState } from 'react';
import './ds-theme.css';

const Icon = {
  Inbox: (p = {}) => <svg viewBox="0 0 24 24" width={p.size || 16} height={p.size || 16} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>,
  Check: (p = {}) => <svg viewBox="0 0 24 24" width={p.size || 16} height={p.size || 16} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="m9 11 3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>,
  Cube: (p = {}) => <svg viewBox="0 0 24 24" width={p.size || 16} height={p.size || 16} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>,
  Palette: (p = {}) => <svg viewBox="0 0 24 24" width={p.size || 16} height={p.size || 16} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="13.5" cy="6.5" r="1.5"/><circle cx="17.5" cy="10.5" r="1.5"/><circle cx="8.5" cy="7.5" r="1.5"/><circle cx="6.5" cy="12.5" r="1.5"/><path d="M12 2a10 10 0 1 0 0 20 2 2 0 0 0 2-2v-2a2 2 0 0 1 2-2h2a4 4 0 0 0 4-4 10 10 0 0 0-10-10z"/></svg>,
  Code: (p = {}) => <svg viewBox="0 0 24 24" width={p.size || 16} height={p.size || 16} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>,
  Bell: (p = {}) => <svg viewBox="0 0 24 24" width={p.size || 16} height={p.size || 16} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>,
  Search: (p = {}) => <svg viewBox="0 0 24 24" width={p.size || 16} height={p.size || 16} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>,
  Filter: (p = {}) => <svg viewBox="0 0 24 24" width={p.size || 16} height={p.size || 16} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>,
  Home: (p = {}) => <svg viewBox="0 0 24 24" width={p.size || 16} height={p.size || 16} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  Layers: (p = {}) => <svg viewBox="0 0 24 24" width={p.size || 16} height={p.size || 16} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>,
  Type: (p = {}) => <svg viewBox="0 0 24 24" width={p.size || 16} height={p.size || 16} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>,
  Users: (p = {}) => <svg viewBox="0 0 24 24" width={p.size || 16} height={p.size || 16} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/></svg>,
  Settings: (p = {}) => <svg viewBox="0 0 24 24" width={p.size || 16} height={p.size || 16} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.5.2.93.54 1.25 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  Plus: (p = {}) => <svg viewBox="0 0 24 24" width={p.size || 16} height={p.size || 16} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Sun: (p = {}) => <svg viewBox="0 0 24 24" width={p.size || 14} height={p.size || 14} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>,
  Moon: (p = {}) => <svg viewBox="0 0 24 24" width={p.size || 14} height={p.size || 14} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>,
  At: (p = {}) => <svg viewBox="0 0 24 24" width={p.size || 14} height={p.size || 14} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94"/></svg>,
};

const COLLABS = [
  { id: 'tj', name: 'Thibault Jovy', role: 'Design Ops · Owner', color: '#4f46e5', initials: 'TJ' },
  { id: 'ml', name: 'Marie Lambert', role: 'Senior Designer', color: '#0891b2', initials: 'ML' },
  { id: 'sk', name: 'Samir Khaled', role: 'Product Designer', color: '#16a34a', initials: 'SK' },
  { id: 'lc', name: 'Léa Charrier', role: 'Brand Designer', color: '#db2777', initials: 'LC' },
  { id: 'nb', name: 'Nicolas Bernard', role: 'Frontend Engineer', color: '#ea580c', initials: 'NB' },
  { id: 'aa', name: 'Aïcha Arnaud', role: 'Frontend Engineer', color: '#7c3aed', initials: 'AA' },
];

const KPIS = [
  { id: 'reviews', label: 'Reviews à valider', value: 12, delta: 3, icon: 'Check', priority: true },
  { id: 'components', label: 'Composants à vérifier', value: 34, delta: 8, icon: 'Cube' },
  { id: 'styles', label: 'Couleurs & styles à valider', value: 18, delta: -2, icon: 'Palette' },
  { id: 'dev', label: 'Éléments à transmettre dev', value: 7, delta: 0, icon: 'Code' },
];

const REVIEWS = [
  { id: 'R-241', name: 'Composant Combobox v2', sub: 'Recherche multi-critères + tags', days: 8, author: 'ml', counts: { c: 7, k: 4, s: 5 }, status: 'todo', kind: 'reviews' },
  { id: 'R-240', name: 'Tokens couleur — Neutral scale', sub: 'Refonte échelle 50→950', days: 6, author: 'lc', counts: { c: 0, k: 12, s: 3 }, status: 'progress', kind: 'styles' },
  { id: 'R-239', name: 'Data table — densité compact', sub: 'Variant pour rapports financiers', days: 5, author: 'sk', counts: { c: 3, k: 0, s: 8 }, status: 'todo', kind: 'components' },
  { id: 'R-238', name: 'Icônes système — pack v3.2', sub: '+34 glyphes, refactor stroke', days: 4, author: 'tj', counts: { c: 1, k: 0, s: 14 }, status: 'blocked', kind: 'components' },
  { id: 'R-237', name: 'Typographie display — révision', sub: 'Switch vers Söhne, scale 4xl→7xl', days: 3, author: 'lc', counts: { c: 0, k: 0, s: 11 }, status: 'todo', kind: 'styles' },
  { id: 'R-236', name: 'Form — patterns d’erreur', sub: 'Inline, summary, toast', days: 2, author: 'ml', counts: { c: 5, k: 2, s: 3 }, status: 'progress', kind: 'reviews' },
  { id: 'R-235', name: 'Spec dev — Toast & Snackbar', sub: 'Hand-off React + tokens', days: 2, author: 'nb', counts: { c: 2, k: 0, s: 0 }, status: 'todo', kind: 'dev' },
  { id: 'R-234', name: 'Charts — variants compact', sub: 'Bar + line + area, dense mode', days: 1, author: 'sk', counts: { c: 4, k: 3, s: 6 }, status: 'todo', kind: 'components' },
  { id: 'R-233', name: 'Accessibilité — focus rings', sub: 'Pattern global, prefers-contrast', days: 1, author: 'aa', counts: { c: 8, k: 1, s: 2 }, status: 'progress', kind: 'reviews' },
];

const VALIDATED = [
  { id: 'R-229', name: 'Modal — large variant', date: '08 mai', validator: 'tj', counts: { c: 2, k: 0, s: 1 }, status: 'merged' },
  { id: 'R-228', name: 'Tokens spacing — 4px scale', date: '07 mai', validator: 'tj', counts: { c: 0, k: 0, s: 6 }, status: 'transmis' },
  { id: 'R-227', name: 'Dropdown menu — keyboard nav', date: '06 mai', validator: 'ml', counts: { c: 1, k: 0, s: 0 }, status: 'published' },
  { id: 'R-226', name: 'Couleurs sémantiques v1.2', date: '05 mai', validator: 'tj', counts: { c: 0, k: 8, s: 2 }, status: 'merged' },
];

const MENTIONS = [
  { author: 'ml', text: 'vous a assigné à', target: 'R-241 · Combobox v2', when: 'il y a 12 min', tag: 'Assigné', unread: true },
  { author: 'nb', text: 'attend votre validation sur', target: 'R-235 · Toast specs dev', when: 'il y a 1 h', tag: 'Bloquant', unread: true },
  { author: 'lc', text: 'vous a mentionné dans la review', target: 'R-237', when: 'il y a 3 h', tag: 'Mention' },
  { author: 'sk', text: 'a répondu à votre commentaire sur', target: 'R-239', when: 'hier · 17:24', tag: 'Réponse' },
];

const STATUS = {
  todo: ['À valider', 'todo'],
  progress: ['En cours', 'progress'],
  blocked: ['Bloqué', 'blocked'],
  merged: ['Mergé', 'success'],
  transmis: ['Transmis dev', 'neutral'],
  published: ['Publié', 'success'],
};

const TREND = [4, 6, 5, 9, 7, 11, 12];

function Avatar({ id, size = 26 }) {
  const person = COLLABS.find((item) => item.id === id) || COLLABS[0];
  return <span className="do-avatar" style={{ background: person.color, width: size, height: size }}>{person.initials}</span>;
}

function Sidebar() {
  const spaces = [
    ['Home', 'Tableau de bord', '', true],
    ['Inbox', 'Reviews', '12'],
    ['Cube', 'Composants', '34'],
    ['Palette', 'Couleurs & tokens', '18'],
    ['Type', 'Typographie', ''],
    ['Layers', 'Patterns', ''],
    ['Code', 'Hand-off dev', '7'],
  ];
  const workspace = [['Users', 'Équipe'], ['Inbox', 'Documentation'], ['Settings', 'Paramètres']];
  const render = ([icon, label, count, active]) => {
    const I = Icon[icon];
    return <div className={'do-nav-item ' + (active ? 'active' : '')} key={label}><I size={15} /><span>{label}</span>{count && <span className="do-count">{count}</span>}</div>;
  };
  return <aside className="do-sidebar"><div className="do-brand"><div className="do-logo">TJ</div><div><div className="do-brand-title">Thibault Jovy</div><div className="do-brand-sub">Design System</div></div></div><div><div className="do-section-label">Espaces</div><nav className="do-nav">{spaces.map(render)}</nav></div><div><div className="do-section-label">Workspace</div><nav className="do-nav">{workspace.map(render)}</nav></div><div className="do-footer"><span>v2.4.0</span><span style={{ color: 'var(--success)' }}>stable</span></div></aside>;
}

function TopBar({ theme, setTheme }) {
  const visible = COLLABS.slice(0, 5);
  return <div className="do-topbar"><div className="do-crumbs"><span>Workspace</span><span>/</span><span>Thibault Jovy DS</span><span>/</span><span className="do-current">Tableau de bord</span></div><div className="do-topbar-right"><div className="do-avatars">{visible.map((person) => <span className="do-avatar-wrap" key={person.id}><span className="do-avatar" style={{ background: person.color }}>{person.initials}</span><span className="do-tooltip"><strong>{person.name}</strong><br />{person.role}</span></span>)}<span className="do-avatar do-avatar-more">+1</span></div><div className="do-theme-pill"><button className={theme === 'light' ? 'on' : ''} onClick={() => setTheme('light')}><Icon.Sun /></button><button className={theme === 'dark' ? 'on' : ''} onClick={() => setTheme('dark')}><Icon.Moon /></button></div><button className="do-icon-btn" aria-label="Notifications"><Icon.Bell /><span className="do-dot" /></button><div className="do-me"><Avatar id="tj" size={28} /><div><div style={{ fontSize: 12.5, fontWeight: 700 }}>Thibault Jovy</div><div style={{ color: 'var(--text-3)', fontSize: 10.5 }}>Design Ops</div></div></div></div></div>;
}

function KpiCard({ kpi, active, onClick }) {
  const I = Icon[kpi.icon];
  const tone = kpi.delta > 0 ? 'warn' : kpi.delta < 0 ? 'up' : '';
  return <button className={'do-kpi ' + (active ? 'active ' : '') + (kpi.priority ? 'priority' : '')} onClick={() => onClick(kpi.id)}><div className="do-kpi-top"><span className="do-kpi-icon"><I /></span>{kpi.priority && <span className="do-kpi-badge">Prioritaire</span>}</div><div><div className="do-kpi-num">{kpi.value}</div><div className="do-kpi-label">{kpi.label}</div></div><div className="do-kpi-foot"><span className={'do-delta ' + tone}>{kpi.delta === 0 ? '—' : (kpi.delta > 0 ? '↑ ' : '↓ ') + Math.abs(kpi.delta)}</span><span>vs semaine dernière</span></div></button>;
}

function ReviewsTable({ filter, search, setFilter, setSearch }) {
  const chips = [['all', 'Tous'], ['reviews', 'Reviews'], ['components', 'Composants'], ['styles', 'Couleurs & styles'], ['dev', 'Hand-off dev']];
  const filtered = useMemo(() => REVIEWS.filter((review) => (filter === 'all' || review.kind === filter) && (!search || (review.name + ' ' + review.id).toLowerCase().includes(search.toLowerCase()))), [filter, search]);
  return <div className="do-card"><div className="do-card-head"><h2 className="do-card-title">Reviews à valider <span className="do-title-count">{filtered.length}</span></h2><div className="do-card-actions"><label className="do-search"><Icon.Search size={13} /><input placeholder="Rechercher une review, un ID..." value={search} onChange={(event) => setSearch(event.target.value)} /></label><button className="do-btn"><Icon.Filter size={13} /> Filtres</button><button className="do-btn primary"><Icon.Plus size={13} /> Nouvelle</button></div></div><div className="do-filter-bar"><span style={{ color: 'var(--text-4)', fontSize: 11.5, marginRight: 4 }}>Catégorie :</span>{chips.map(([id, label]) => <button key={id} className={'do-chip ' + (filter === id ? 'active' : '')} onClick={() => setFilter(id)}>{label}</button>)}{filter !== 'all' && <button className="do-filter-clear" onClick={() => setFilter('all')}>Réinitialiser</button>}</div><table className="do-table"><thead><tr><th>Review</th><th>Soumis le</th><th>Auteur</th><th>Éléments</th><th>Statut</th><th /></tr></thead><tbody>{filtered.map((review) => { const [label, cls] = STATUS[review.status]; return <tr key={review.id}><td><span className="do-review-name">{review.name}<span><span className="do-review-id">{review.id}</span><span style={{ color: 'var(--text-3)', fontSize: 11.5 }}> · {review.sub}</span></span></span></td><td>{review.days > 1 ? 'il y a ' + review.days + ' j' : 'hier'}</td><td><span className="do-author"><Avatar id={review.author} size={22} />{COLLABS.find((item) => item.id === review.author)?.name.split(' ')[0]}</span></td><td><span className="do-elts">{review.counts.c > 0 && <span className="do-elt c">{review.counts.c} composants</span>}{review.counts.k > 0 && <span className="do-elt k">{review.counts.k} couleurs</span>}{review.counts.s > 0 && <span className="do-elt s">{review.counts.s} styles</span>}</span></td><td><span className={'do-badge ' + cls}>{label}</span></td><td style={{ textAlign: 'right' }}><button className="do-row-action">Accéder</button></td></tr>; })}</tbody></table><div className="do-pager"><span>{filtered.length} sur {REVIEWS.length} reviews — triées par date décroissante</span><span className="do-pages"><button className="do-page">‹</button><button className="do-page active">1</button><button className="do-page">2</button><button className="do-page">›</button></span></div></div>;
}

function ValidatedTable() {
  return <div className="do-card muted"><div className="do-card-head"><h2 className="do-card-title">Dernières reviews validées <span className="do-title-count">{VALIDATED.length}</span></h2><div className="do-card-actions"><span style={{ color: 'var(--text-4)', fontSize: 11.5 }}>7 derniers jours</span></div></div><table className="do-table"><thead><tr><th>Review</th><th>Validé le</th><th>Validé par</th><th>Éléments</th><th>Statut final</th></tr></thead><tbody>{VALIDATED.map((review) => { const [label, cls] = STATUS[review.status]; return <tr key={review.id}><td><span className="do-review-name">{review.name}<span className="do-review-id">{review.id}</span></span></td><td>{review.date}</td><td><span className="do-author"><Avatar id={review.validator} size={22} />{COLLABS.find((item) => item.id === review.validator)?.name.split(' ')[0]}</span></td><td><span className="do-elts">{review.counts.c > 0 && <span className="do-elt c">{review.counts.c} cmp</span>}{review.counts.k > 0 && <span className="do-elt k">{review.counts.k} clr</span>}{review.counts.s > 0 && <span className="do-elt s">{review.counts.s} sty</span>}</span></td><td><span className={'do-badge ' + cls}>{label}</span></td></tr>; })}</tbody></table><div className="do-see-all">Voir tout l'historique</div></div>;
}

function TrendCard() {
  const max = Math.max(...TREND);
  const min = Math.min(...TREND);
  const w = 280;
  const h = 64;
  const pts = TREND.map((value, index) => [4 + (index * (w - 8)) / (TREND.length - 1), h - 4 - ((value - min) / (max - min || 1)) * (h - 8)]);
  const d = pts.map((point, index) => (index ? 'L' : 'M') + point[0] + ',' + point[1]).join(' ');
  const area = d + ' L' + pts.at(-1)[0] + ',' + h + ' L' + pts[0][0] + ',' + h + ' Z';
  return <div className="do-card do-trend"><div className="do-trend-head"><div><div className="do-trend-label">Activité — 7 derniers jours</div><div className="do-trend-num">54 <span style={{ color: 'var(--text-3)', fontSize: 12, fontWeight: 600 }}>reviews soumises</span></div></div><div style={{ color: 'var(--text-3)', fontSize: 11.5, textAlign: 'right' }}><span className="do-delta up">↑ +24%</span><div>vs sem. préc.</div></div></div><svg className="do-spark" viewBox={'0 0 ' + w + ' ' + h} preserveAspectRatio="none"><defs><linearGradient id="doSpark" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="var(--accent)" stopOpacity="0.25" /><stop offset="100%" stopColor="var(--accent)" stopOpacity="0" /></linearGradient></defs><path d={area} fill="url(#doSpark)" /><path d={d} stroke="var(--accent)" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" /><circle cx={pts.at(-1)[0]} cy={pts.at(-1)[1]} r="3" fill="var(--accent)" /></svg><div className="do-spark-days">{['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((day) => <span key={day}>{day}</span>)}</div></div>;
}

function QuickActions() {
  const actions = [['Plus', 'Créer une review', 'Nouveau ticket'], ['Users', 'Inviter', 'Designer ou dev'], ['Code', 'Transmettre au dev', 'Hand-off'], ['Inbox', 'Note de release', 'Compiler v2.4.1']];
  return <div className="do-card do-qa"><div style={{ alignItems: 'center', display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}><h3 className="do-card-title">Actions rapides</h3><span style={{ color: 'var(--text-4)', font: '500 10.5px JetBrains Mono, monospace' }}>⌘ K</span></div><div className="do-qa-grid">{actions.map(([icon, label, sub]) => { const I = Icon[icon]; return <button className="do-qa-item" key={label}><span className="do-qa-icon"><I size={14} /></span><span><span className="do-qa-label">{label}</span><br /><span className="do-qa-sub">{sub}</span></span></button>; })}</div></div>;
}

function MentionsCard() {
  return <div className="do-card"><div className="do-card-head"><Icon.At /><h3 className="do-card-title">Mentions & assigné</h3><span className="do-title-count" style={{ background: 'var(--accent-soft)', color: 'var(--accent-ink)' }}>2 non lus</span></div>{MENTIONS.map((mention) => <div className={'do-mention ' + (mention.unread ? 'unread' : '')} key={mention.target}><Avatar id={mention.author} size={28} /><div className="do-mention-body"><b>{COLLABS.find((item) => item.id === mention.author)?.name.split(' ')[0]}</b> {mention.text} <span className="do-ref">{mention.target}</span><div className="do-mention-meta"><span>{mention.when}</span><span className="do-mention-tag">{mention.tag}</span></div></div></div>)}<div className="do-see-all">Voir toutes les notifications</div></div>;
}

function Dashboard() {
  const [theme, setTheme] = useState('light');
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const onKpiClick = (id) => setFilter((previous) => previous === id ? 'all' : id);
  const activeKpi = filter === 'all' ? null : filter;
  return <div className="do-shell" data-theme={theme}><div className="do-app"><Sidebar /><main className="do-main"><TopBar theme={theme} setTheme={setTheme} /><div className="do-content"><div className="do-page-head"><div><h1 className="do-page-title">Bonjour Thibault</h1><div className="do-page-sub">12 reviews en attente — 3 sont urgentes. Activité +24% cette semaine.</div></div><div className="do-page-actions"><button className="do-btn"><Icon.Filter size={13} /> Cette semaine</button><button className="do-btn primary"><Icon.Plus size={13} /> Nouvelle review</button></div></div><div className="do-kpi-grid">{KPIS.map((kpi) => <KpiCard key={kpi.id} kpi={kpi} active={activeKpi === kpi.id} onClick={onKpiClick} />)}</div><div className="do-body-grid"><div className="do-stack"><ReviewsTable filter={filter} search={search} setFilter={setFilter} setSearch={setSearch} /><ValidatedTable /></div><aside className="do-right-col"><TrendCard /><QuickActions /><MentionsCard /></aside></div></div></main></div></div>;
}

export default { title: 'Dashboard' };
export const Overview = () => <Dashboard />;
