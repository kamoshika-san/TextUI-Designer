import React from 'react';
import type { ComponentDef, TableComponent } from '../domain/dsl-types';
import { isComponentDefValue } from '../domain/dsl-types';

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
    <div className="overflow-x-auto border border-gray-700 rounded-md" style={width ? { width } : undefined}>
      <table className="textui-table min-w-full divide-y divide-gray-700 text-sm text-gray-200">
        <thead className="bg-gray-800">
          <tr>
            {columns.map(column => (
              <th
                key={column.key}
                scope="col"
                className="px-4 py-2 text-left font-semibold text-gray-100"
                style={column.width ? { width: column.width } : undefined}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-700 bg-gray-900">
          {rows.map((row, rowIndex) => (
            <tr
              key={rowIndex}
              className={`${striped && rowIndex % 2 === 1 ? 'bg-gray-800/70' : ''} ${rowHover ? 'hover:bg-gray-800/80 transition-colors' : ''}`.trim()}
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
                    className="px-4 py-2 align-top text-gray-300"
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
