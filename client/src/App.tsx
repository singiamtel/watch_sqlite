import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import TableViewer from './components/TableViewer';
import TableSelector from './components/TableSelector';

// Connect to the WebSocket server
const socket = io('http://localhost:4000');

interface TableData {
  name: string;
  columns: string[];
  rows: any[];
}

function App() {
  const [tables, setTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [tableData, setTableData] = useState<TableData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Get list of tables when component mounts
    socket.emit('getTables');

    // Listen for table list updates
    socket.on('tables', (data: string[]) => {
      setTables(data);
      if (data.length > 0 && !selectedTable) {
        setSelectedTable(data[0]);
      }
      setLoading(false);
    });

    // Listen for table data updates
    socket.on('tableData', (data: TableData) => {
      setTableData(data);
      setLoading(false);
    });

    // Listen for errors
    socket.on('error', (message: string) => {
      setError(message);
      setLoading(false);
    });

    // Listen for database changes
    socket.on('databaseChanged', () => {
      if (selectedTable) {
        socket.emit('getTableData', selectedTable);
      }
    });

    return () => {
      socket.off('tables');
      socket.off('tableData');
      socket.off('error');
      socket.off('databaseChanged');
    };
  }, [selectedTable]);

  // When selected table changes, fetch its data
  useEffect(() => {
    if (selectedTable) {
      setLoading(true);
      socket.emit('getTableData', selectedTable);
    }
  }, [selectedTable]);

  const handleTableSelect = (tableName: string) => {
    setSelectedTable(tableName);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p><strong>Error:</strong> {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">SQLite Database Viewer</h1>
        <p className="text-gray-600">Real-time database monitoring</p>
      </header>

      <TableSelector 
        tables={tables} 
        selectedTable={selectedTable} 
        onSelectTable={handleTableSelect} 
      />

      <AnimatePresence mode="wait">
        <motion.div
          key={selectedTable}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          {tableData && (
            <TableViewer 
              tableName={tableData.name}
              columns={tableData.columns}
              rows={tableData.rows}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export default App; 