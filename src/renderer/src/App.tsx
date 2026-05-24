import { useAppStore } from './store/app.store'
import { Sidebar } from './components/Sidebar'
import { Dashboard } from './pages/Dashboard'
import { UnusedFiles } from './pages/UnusedFiles'
import { Duplicates } from './pages/Duplicates'
import { LargeFiles } from './pages/LargeFiles'
import { SimilarImages } from './pages/SimilarImages'
import { Settings } from './pages/Settings'

const VIEWS = {
  dashboard: Dashboard,
  unused: UnusedFiles,
  duplicates: Duplicates,
  large: LargeFiles,
  similar: SimilarImages,
  settings: Settings,
}

export default function App() {
  const activeView = useAppStore((s) => s.activeView)
  const View = VIEWS[activeView]

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0a0a0a] text-white">
      <Sidebar />
      <main className="flex-1 overflow-hidden flex flex-col">
        <View />
      </main>
    </div>
  )
}
