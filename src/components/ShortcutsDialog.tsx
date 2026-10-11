import { Dialog } from './ui/Dialog';

const SHORTCUTS: Array<[string, string]> = [
  ['S', 'Start / stop camera'],
  ['R', 'Re-analyze current frame'],
  ['C', 'Capture scan of selected object'],
  ['1 – 9', 'Select detection by index'],
  ['Space', 'Read aloud / stop speech'],
  ['Esc', 'Stop speech / close dialog'],
  ['H', 'Open scan history'],
  ['?', 'Show this help'],
];

export function ShortcutsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} title="Keyboard shortcuts" onClose={onClose}>
      <div className="shortcut-grid">
        {SHORTCUTS.map(([keys, desc]) => (
          <div key={keys} style={{ display: 'contents' }}>
            <span>
              <kbd>{keys}</kbd>
            </span>
            <span>{desc}</span>
          </div>
        ))}
      </div>
      <p className="faint" style={{ marginTop: '1rem', fontSize: '0.8rem' }}>
        Shortcuts are ignored while typing in an input field.
      </p>
    </Dialog>
  );
}
