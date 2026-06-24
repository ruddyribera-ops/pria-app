import { useState } from 'react';
import type { Unit, Topic } from '../../lib/textbook/parseUnits';

interface Props {
  units: Unit[];
  selectedTopicIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  onGenerateSelected: () => void;
}

const TOPIC_TYPE_ICONS: Record<Topic['topicType'], string> = {
  lectura: '📖',
  gramatica: '✏️',
  vocabulario: '📝',
  escritura: '✍️',
  oral: '🎤',
};

export default function UnitTopicSelector({
  units,
  selectedTopicIds,
  onSelectionChange,
  onGenerateSelected,
}: Props) {
  const [expandedUnits, setExpandedUnits] = useState<Set<string>>(
    new Set(units.slice(0, 2).map((u) => u.id))
  );

  const toggleUnit = (unitId: string) => {
    const next = new Set(expandedUnits);
    if (next.has(unitId)) next.delete(unitId);
    else next.add(unitId);
    setExpandedUnits(next);
  };

  const toggleTopic = (topicId: string) => {
    const next = new Set(selectedTopicIds);
    if (next.has(topicId)) next.delete(topicId);
    else next.add(topicId);
    onSelectionChange(next);
  };

  const selectAllInUnit = (unit: Unit) => {
    const next = new Set(selectedTopicIds);
    const allSelected = unit.topics.every((t) => next.has(t.id));
    if (allSelected) {
      unit.topics.forEach((t) => { next.delete(t.id); });
    } else {
      unit.topics.forEach((t) => { next.add(t.id); });
    }
    onSelectionChange(next);
  };

  const selectAll = () => {
    onSelectionChange(new Set(units.flatMap((u) => u.topics.map((t) => t.id))));
  };

  const deselectAll = () => {
    onSelectionChange(new Set());
  };

  const unitAllSelected = (unit: Unit) =>
    unit.topics.every((t) => selectedTopicIds.has(t.id));

  const unitPartiallySelected = (unit: Unit) =>
    unit.topics.some((t) => selectedTopicIds.has(t.id)) && !unitAllSelected(unit);

  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #e6e6eb',
        borderRadius: '8px',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.75rem 1rem',
          borderBottom: '1px solid #e6e6eb',
          background: '#f8f8fa',
          fontSize: '0.8125rem',
          fontWeight: 600,
          color: '#1e1e2f',
        }}
      >
        <span>📚 Selecciona los temas a generar</span>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            type="button"
            onClick={selectAll}
            style={{
              padding: '0.25rem 0.625rem',
              fontSize: '0.75rem',
              fontWeight: 500,
              color: '#3A9E5E',
              background: 'transparent',
              border: '1px solid #3A9E5E',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Seleccionar todos
          </button>
          <button
            type="button"
            onClick={deselectAll}
            style={{
              padding: '0.25rem 0.625rem',
              fontSize: '0.75rem',
              fontWeight: 500,
              color: '#6b6b80',
              background: 'transparent',
              border: '1px solid #e6e6eb',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Ninguno
          </button>
        </div>
      </div>

      {/* Unit tree */}
      <div style={{ padding: '0.75rem 1rem', maxHeight: '480px', overflowY: 'auto' }}>
        {units.map((unit) => {
          const isExpanded = expandedUnits.has(unit.id);
          const isAllSelected = unitAllSelected(unit);
          const isPartialSelected = unitPartiallySelected(unit);

          return (
            <div key={unit.id} style={{ marginBottom: '0.5rem' }}>
              {/* Unit row — div needed because it contains a real <button> */}
              // eslint-disable-next-line
              <div
                role="button"
                tabIndex={0}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 0.625rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  background: isAllSelected ? '#f0faf3' : 'transparent',
                  transition: 'background 0.15s',
                }}
                onClick={() => toggleUnit(unit.id)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleUnit(unit.id); }}
              >
                {/* Expand chevron */}
                <span
                  style={{
                    fontSize: '0.6875rem',
                    color: '#6b6b80',
                    width: '1rem',
                    textAlign: 'center',
                  }}
                >
                  {isExpanded ? '▼' : '▶'}
                </span>

                {/* Unit info */}
                <span style={{ flex: 1, fontSize: '0.8125rem', fontWeight: 600, color: '#1e1e2f' }}>
                  Unidad {unit.number}: {unit.name}
                </span>

                {/* Per-unit select button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    selectAllInUnit(unit);
                  }}
                  style={{
                    padding: '0.125rem 0.5rem',
                    fontSize: '0.6875rem',
                    fontWeight: 500,
                    color: isAllSelected ? '#e55' : '#3A9E5E',
                    background: 'transparent',
                    border: `1px solid ${isAllSelected ? '#e55' : '#3A9E5E'}`,
                    borderRadius: '4px',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {isAllSelected ? 'Deseleccionar' : isPartialSelected ? 'Completar' : 'Seleccionar todo'}
                </button>
              </div>

              {/* Topics list */}
              {isExpanded && (
                <div style={{ paddingLeft: '1.75rem', paddingTop: '0.25rem', paddingBottom: '0.25rem' }}>
                  {unit.topics.map((topic) => {
                    const isChecked = selectedTopicIds.has(topic.id);
                    return (
                      <label
                        key={topic.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: '0.375rem 0.5rem',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.8125rem',
                          color: '#1e1e2f',
                          background: isChecked ? '#f0faf3' : 'transparent',
                          transition: 'background 0.1s',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleTopic(topic.id)}
                          style={{ accentColor: '#3A9E5E', width: '0.875rem', height: '0.875rem' }}
                        />
                        <span style={{ fontSize: '0.875rem' }}>{TOPIC_TYPE_ICONS[topic.topicType]}</span>
                        <span style={{ color: '#4a4a5a' }}>{topic.topicName}</span>
                        <span
                          style={{
                            marginLeft: 'auto',
                            fontSize: '0.6875rem',
                            color: '#6b6b80',
                            fontWeight: 400,
                          }}
                        >
                          {topic.topicType}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer — count + generate */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.75rem 1rem',
          borderTop: '1px solid #e6e6eb',
          background: '#f8f8fa',
        }}
      >
        <span style={{ fontSize: '0.8125rem', color: '#6b6b80' }}>
          {selectedTopicIds.size === 0
            ? 'Ningún tema seleccionado'
            : `${selectedTopicIds.size} tema${selectedTopicIds.size !== 1 ? 's' : ''} seleccionado${selectedTopicIds.size !== 1 ? 's' : ''}`}
        </span>
        <button
          type="button"
          disabled={selectedTopicIds.size === 0}
          onClick={onGenerateSelected}
          style={{
            padding: '0.5rem 1.25rem',
            fontSize: '0.8125rem',
            fontWeight: 600,
            color: selectedTopicIds.size === 0 ? '#a0a0b0' : '#fff',
            background: selectedTopicIds.size === 0 ? '#e6e6eb' : '#3A9E5E',
            border: 'none',
            borderRadius: '6px',
            cursor: selectedTopicIds.size === 0 ? 'not-allowed' : 'pointer',
            transition: 'background 0.15s',
          }}
        >
          Generar{selectedTopicIds.size === 0 ? '' : ` ${selectedTopicIds.size}`} tema
          {selectedTopicIds.size !== 1 ? 's' : ''}
        </button>
      </div>
    </div>
  );
}
