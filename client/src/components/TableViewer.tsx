import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface TableViewerProps {
  tableName: string;
  columns: string[];
  rows: any[];
}

const TableViewer = ({ tableName, columns, rows }: TableViewerProps) => {
  const [displayedRows, setDisplayedRows] = useState<any[]>([]);
  
  // Limit to last 100 rows
  useEffect(() => {
    // No need to slice if we're already getting the latest 100 from the server
    setDisplayedRows(rows);
  }, [rows]);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-800">{tableName}</h2>
        <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">
          {displayedRows.length} rows (showing latest first)
        </span>
      </div>
      
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column}>{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <AnimatePresence initial={false}>
              {displayedRows.map((row, rowIndex) => (
                <motion.tr
                  key={rowIndex}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ 
                    duration: 0.3,
                    delay: rowIndex * 0.02 // Stagger animation
                  }}
                >
                  {columns.map((column, colIndex) => (
                    <td key={`${rowIndex}-${colIndex}`}>
                      {row[column] !== null && row[column] !== undefined 
                        ? String(row[column]) 
                        : <span className="text-gray-400">null</span>}
                    </td>
                  ))}
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
      
      {displayedRows.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No data available in this table
        </div>
      )}
    </div>
  );
};

export default TableViewer; 