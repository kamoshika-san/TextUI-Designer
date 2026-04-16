import React from 'react';
import type { ComponentDef, TableComponent } from '../../domain/dsl-types';
import { isComponentDefValue } from '../../domain/dsl-types';

interface TableProps extends TableComponent {
  renderComponent?: (component: ComponentDef, key: number) => React.ReactNode;
}

export const Table: React.FC<TableProps> = ({ columns = [], rows = [], striped = false, rowHover = false, width, renderComponent }) => {
  if (columns.length === 0) {
    return (
      <div className="text-sm text-yellow-300 border border-yellow-700 rounded-md px-3 py-2">
        Table の columns が未定義です
      </div>
    );
  }

  return (
    <div className="textui-table-container" style={width ? { width } : undefined}>
      <table className="textui-table">
        <thead className="textui-table-head">
          <tr>
            {columns.map(column => (
              <th
                key={column.key}
                scope="col"
                className="textui-table-header"
                style={column.width ? { width: column.width } : undefined}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="textui-table-body">
          {rows.length === 0 ? (
            <tr className="textui-table-row">
              <td
                colSpan={columns.length}
                className="textui-table-cell"
                style={{ textAlign: 'center', opacity: 0.5, padding: '1rem 0' }}
              >
                データがありません
              </td>
            </tr>
          ) : rows.map((row, rowIndex) => (
            <tr
              key={rowIndex}
              className={[
                'textui-table-row',
                striped && rowIndex % 2 === 1 ? 'is-striped' : '',
                rowHover ? 'has-hover' : ''
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {columns.map((column, columnIndex) => {
                const rawValue = row[column.key];
                const cellContent = isComponentDefValue(rawValue) && renderComponent
                  ? renderComponent(rawValue, rowIndex * 1000 + columnIndex)
                  : rawValue === null || rawValue === undefined
                    ? ''
                    : String(rawValue);

                return (
                  <td
                    key={`${rowIndex}-${column.key}`}
                    className="textui-table-cell"
                    style={column.width ? { width: column.width } : undefined}
                  >
                    {cellContent}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
