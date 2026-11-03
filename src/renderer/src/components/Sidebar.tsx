import { useAppStore } from '../store/app.store'

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', icon: '◎' },
  { key: 'unused', label: 'Kullanılmayanlar', icon: '⏱' },
  { key: 'duplicates', label: 'Yinelenler', icon: '⎘' },
  { key: 'large', label: 'Büyük Dosyalar', icon: '⬆' },
  { key: 'similar', label: 'Benzer Resimler', icon: '▦' },
  { key: 'system', label: 'Sistem Temizliği', icon: '✦' },
] as const

export function Sidebar() {
  const { activeView, setActiveView } = useAppStore()

  return (
    <aside className="w-48 bg-[#111] border-r border-[#1e1e1e] flex flex-col py-4 shrink-0">
      <div className="px-4 pb-4 text-[10px] font-bold tracking-widest text-[#555]">CLEANER</div>
      <nav className="flex-1 flex flex-col gap-0.5">
        {NAV_ITEMS.map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => setActiveView(key)}
            className={`flex items-center gap-2 px-4 py-2 text-[12px] text-left transition-colors
              ${activeView === key
                ? 'bg-[#1e1e1e] border-l-2 border-blue-500 text-white'
                : 'text-[#666] hover:text-[#aaa] border-l-2 border-transparent'}`}
          >
            <span>{icon}</span>
            <span>{label}</span>
          </button>
        ))}
      </nav>
      <button
        onClick={() => setActiveView('settings')}
        className={`flex items-center gap-2 px-4 py-2 text-[11px] text-left border-l-2 transition-colors
          ${activeView === 'settings'
            ? 'text-[#888] border-[#444]'
            : 'text-[#444] border-transparent hover:text-[#666]'}`}
      >
        <span>⚙</span> Ayarlar
      </button>
    </aside>
  )
}
