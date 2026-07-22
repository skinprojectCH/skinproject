import type { ReactNode } from 'react';

export default function Modal({
  title,
  onClose,
  children,
  width = 420,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  width?: number;
}) {
  return (
    <div
      className="modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(17,17,17,0.35)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
      }}
    >
      <div
        className="modal-box"
        style={{
          width,
          maxWidth: '92vw',
          background: '#fff',
          borderRadius: 8,
          boxShadow: '0 16px 40px rgba(0,0,0,0.22)',
          padding: 26,
          fontFamily: 'var(--font-body)',
          maxHeight: '85vh',
          overflowY: 'auto',
        }}
      >
        <div className="modal-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: 19, fontWeight: 700 }}>{title}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 16, color: '#999' }}>
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
