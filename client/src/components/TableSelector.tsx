import { motion } from 'framer-motion';

interface TableSelectorProps {
  tables: string[];
  selectedTable: string;
  onSelectTable: (tableName: string) => void;
}

const TableSelector = ({ tables, selectedTable, onSelectTable }: TableSelectorProps) => {
  return (
    <div className="mb-6">
      <h2 className="text-xl font-semibold mb-3 text-gray-700">Database Tables</h2>
      <div className="tabs">
        {tables.map((table) => (
          <motion.button
            key={table}
            className={`tab ${selectedTable === table ? 'tab-active' : 'tab-inactive'}`}
            onClick={() => onSelectTable(table)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {table}
          </motion.button>
        ))}
      </div>
    </div>
  );
};

export default TableSelector; 