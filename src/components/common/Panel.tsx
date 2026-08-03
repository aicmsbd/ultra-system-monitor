import React, { useCallback } from 'react';

interface Props {
  id: string;
  icon: string;
  title: string;
  subtitle?: string;
  collapsed: boolean;
  onToggle: (id: string, collapsed: boolean) => void;
  /** Opens the extended detail overlay for this component. */
  onDetails?: (id: string) => void;
  /** Compact status shown on the header while collapsed. */
  summary?: React.ReactNode;
  alert?: 'warn' | 'crit' | null;
  children: React.ReactNode;
}

/** 3D embossed glass card with an expandable/collapsible body. */
const Panel: React.FC<Props> = ({ id, icon, title, subtitle, collapsed, onToggle, onDetails, summary, alert, children }) => {
  const toggle = useCallback(() => onToggle(id, !collapsed), [id, collapsed, onToggle]);
  const details = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onDetails?.(id);
    },
    [id, onDetails]
  );
  return (
    <section className={`panel ${alert ? `panel--${alert}` : ''}`}>
      <div
        className="panel__header"
        onClick={toggle}
        role="button"
        tabIndex={0}
        aria-expanded={!collapsed}
        onKeyDown={e => e.key === 'Enter' && toggle()}
      >
        <span className="panel__icon" data-detail-btn={id} onClick={details} title="Details">{icon}</span>
        <span className="panel__titles">
          <span className="panel__title">{title}</span>
          {subtitle && <span className="panel__subtitle">{subtitle}</span>}
        </span>
        {collapsed && summary !== undefined && <span className="panel__summary">{summary}</span>}
        {onDetails && (
          <button className="panel__detailbtn" data-detail-open={id} onClick={details} title="Details">ⓘ</button>
        )}
        <button
          className="panel__detailbtn"
          title="Pop out as floating widget (drag it anywhere)"
          onClick={e => {
            e.stopPropagation();
            window.usm.openWidget(id);
          }}
        >⧉</button>
        <span className={`panel__chevron ${collapsed ? 'panel__chevron--closed' : ''}`}>▾</span>
      </div>
      <div className={`panel__body ${collapsed ? 'panel__body--collapsed' : ''}`}>{children}</div>
    </section>
  );
};

export default React.memo(Panel);
