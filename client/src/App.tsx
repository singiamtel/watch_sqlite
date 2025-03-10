import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import TableViewer from './components/TableViewer';
import TableSelector from './components/TableSelector';
import DatabasePathForm from './components/DatabasePathForm';

// Server URL
const SERVER_URL = 'http://localhost:4000';

// Connect to the WebSocket server
const socket = io(SERVER_URL);

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
  const [dbPath, setDbPath] = useState<string>('');
  const [isChangingDb, setIsChangingDb] = useState<boolean>(false);
  const [showDbForm, setShowDbForm] = useState<boolean>(false);

  // Listen for socket events
  useEffect(() => {
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

    // Listen for database path updates
    socket.on('databasePath', (path: string) => {
      setDbPath(path);
    });

    socket.on('databasePathChanged', (path: string) => {
      setDbPath(path);
      setIsChangingDb(false);
      setSelectedTable(''); // Reset selected table when database changes
    });

    // Listen for database changes
    socket.on('databaseChanged', () => {
      setLoading(true);
      socket.emit('getTables');
    });

    // Clean up event listeners
    return () => {
      socket.off('tables');
      socket.off('tableData');
      socket.off('error');
      socket.off('databaseChanged');
      socket.off('databasePath');
      socket.off('databasePathChanged');
    };
  }, []);

  // Initial data loading
  useEffect(() => {
    // Get list of tables when component mounts
    socket.emit('getTables');
  }, []);

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

  const handleDatabaseChange = (newPath: string) => {
    setIsChangingDb(true);
    setError(null);
    
    socket.emit('changeDatabase', newPath, (response: { success: boolean, message?: string, path?: string }) => {
      if (!response.success) {
        setError(response.message || 'Failed to change database');
        setIsChangingDb(false);
      }
    });
  };

  const toggleDbForm = () => {
    setShowDbForm(!showDbForm);
  };

  if (loading && !isChangingDb) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <header className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">SQLite Database Viewer</h1>
            <p className="text-gray-600">Real-time database monitoring</p>
          </div>
          <button 
            onClick={toggleDbForm}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            {showDbForm ? 'Hide Database Settings' : 'Change Database'}
          </button>
        </div>
        
        <AnimatePresence>
          {showDbForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <DatabasePathForm 
                currentPath={dbPath} 
                onSubmit={handleDatabaseChange} 
                isLoading={isChangingDb}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          <p><strong>Error:</strong> {error}</p>
        </div>
      )}

      {tables.length > 0 ? (
        <>
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
        </>
      ) : (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                No tables found in the database. Please select a different database or create tables in the current one.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App; 