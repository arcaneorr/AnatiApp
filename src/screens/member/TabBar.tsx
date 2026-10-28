import { useT } from '../../state/store';
import { Icon } from '../../ui/kit';

// No check-in tab: Anati doesn't use QR codes at the door.
export type Tab = 'home' | 'schedule' | 'bookings' | 'me';

const TABS: { id: Tab; icon: 'home' | 'calendar' | 'list' | 'user' }[] = [
  { id: 'home', icon: 'home' },
  { id: 'schedule', icon: 'calendar' },
  { id: 'bookings', icon: 'list' },
  { id: 'me', icon: 'user' },
];

export function TabBar({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  const t = useT().ui.tabs;
  return (
    <nav className="tabbar" aria-label={t.nav}>
      {TABS.map((item) => (
        <button
          key={item.id}
          type="button"
          className={tab === item.id ? 'on' : ''}
          aria-current={tab === item.id ? 'page' : undefined}
          onClick={() => onChange(item.id)}
        >
          <Icon name={item.icon} />
          <span>{t[item.id]}</span>
        </button>
      ))}
    </nav>
  );
}
