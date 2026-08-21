// Site-wide page order. Drives the hamburger menu and prev/next links.
// 導線ページは廃止済み(公式ミラーへ転送)。ここには独自ページと索引だけを置く。
// group: menu section header ('' = ungrouped).
export const PAGES = [
  { path: '/hermes/', label: 'Hermes Agent', group: '' },
  { path: '/hermes/ops/', label: '運用', group: '' },
  { path: '/hermes/trust/', label: 'どこまで任せるか', group: '' },
  { path: '/hermes/guide/', label: 'よく使う', group: 'Hermes Agentの使い方' },
  { path: '/hermes/guide/all/', label: 'すべて', group: 'Hermes Agentの使い方' },
  { path: '/hermes/guide/skills/', label: 'skill', group: 'Hermes Agentの使い方' },
  { path: '/hermes/guide/dev/', label: 'developer-guide', group: 'Hermes Agentの使い方' },
  { path: '/hermes/concepts/gateway/', label: 'Gateway', group: 'Hermes Agentの使い方' },
  { path: '/hermes/concepts/skills/', label: 'Skills', group: 'Hermes Agentの使い方' },
  { path: '/hermes/concepts/memory/', label: 'Memory', group: 'Hermes Agentの使い方' },
  { path: '/hermes/concepts/cron/', label: 'Cron', group: 'Hermes Agentの使い方' },
  { path: '/hermes/concepts/approval/', label: '承認', group: 'Hermes Agentの使い方' },
  { path: '/hermes/concepts/config/', label: '設定', group: 'Hermes Agentの使い方' },
  { path: '/hermes/entities/local/', label: 'ローカル', group: 'Hermes Agentの使い方' },
  { path: '/hermes/entities/docker/', label: 'Docker', group: 'Hermes Agentの使い方' },
  { path: '/hermes/entities/vps/', label: 'VPS', group: 'Hermes Agentの使い方' },
  { path: '/hermes/entities/line/', label: 'LINE から使う', group: 'Hermes Agentの使い方' },
  { path: '/hermes/entities/telegram/', label: 'Telegram から使う', group: 'Hermes Agentの使い方' },
  { path: '/hermes/entities/nous-portal/', label: 'Nous Portal', group: 'Hermes Agentの使い方' },
  { path: '/hermes/syntheses/cost-and-model/', label: 'コストとモデル', group: 'Hermes Agentの使い方' },
  { path: '/hermes/syntheses/not-a-mirror/', label: '正本との差分', group: 'Hermes Agentの使い方' },
];
