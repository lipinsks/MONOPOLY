import { History, House, UsersRound } from 'lucide-react'
import { Tabs, type TabItem } from '../../../components/ui/Tabs'
import { HistoryPanel } from './HistoryPanel'
import { PlayersPanel } from './PlayersPanel'
import { PropertiesPanel } from './PropertiesPanel'
import styles from './SidePanel.module.css'

export type SideTab = 'players' | 'properties' | 'history'

const PLAYERS_TAB: TabItem<SideTab> = { id: 'players', label: 'Gracze', icon: <UsersRound /> }
const PROPERTIES_TAB: TabItem<SideTab> = { id: 'properties', label: 'Posiadłości', icon: <House /> }
const HISTORY_TAB: TabItem<SideTab> = { id: 'history', label: 'Historia', icon: <History /> }

interface SidePanelProps {
  tab: SideTab
  onTabChange: (tab: SideTab) => void
  includePlayers: boolean
  propertiesOwner: number | null
  onPropertiesOwnerChange: (playerId: number) => void
}

export function SidePanel({
  tab,
  onTabChange,
  includePlayers,
  propertiesOwner,
  onPropertiesOwnerChange,
}: SidePanelProps) {
  const items = includePlayers ? [PLAYERS_TAB, PROPERTIES_TAB, HISTORY_TAB] : [PROPERTIES_TAB, HISTORY_TAB]
  const active = !includePlayers && tab === 'players' ? 'properties' : tab

  return (
    <section className={styles.panel}>
      <Tabs items={items} value={active} onChange={onTabChange} label="Informacje o grze" idPrefix="side" />
      <div
        className={styles.content}
        role="tabpanel"
        id={`side-panel-${active}`}
        aria-labelledby={`side-tab-${active}`}
      >
        {active === 'players' && <PlayersPanel inTabs />}
        {active === 'properties' && (
          <PropertiesPanel ownerId={propertiesOwner} onOwnerChange={onPropertiesOwnerChange} />
        )}
        {active === 'history' && <HistoryPanel />}
      </div>
    </section>
  )
}
