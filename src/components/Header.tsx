import { Button } from './ui/Button';

export type AppPage = 'scanner' | 'history' | 'settings';

export function Header({
  page,
  onNavigate,
  onShowShortcuts,
}: {
  page: AppPage;
  onNavigate: (page: AppPage) => void;
  onShowShortcuts: () => void;
}) {
  return (
    <header className="app-header">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true">
          VG
        </span>
        <h1>
          VisionGuard AI <span className="brand-tag">· Hold It. Identify It. Understand It.</span>
        </h1>
      </div>
      <nav className="nav-tabs" aria-label="Primary">
        {(
          [
            ['scanner', 'Scanner'],
            ['history', 'History'],
            ['settings', 'Settings'],
          ] as Array<[AppPage, string]>
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className="nav-tab"
            aria-current={page === id ? 'page' : undefined}
            onClick={() => onNavigate(id)}
          >
            {label}
          </button>
        ))}
        <Button variant="ghost" size="small" onClick={onShowShortcuts} aria-label="Keyboard shortcuts help">
          ?
        </Button>
      </nav>
    </header>
  );
}
