import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import TableViewer from './components/TableViewer';
import TableSelector from './components/TableSelector';
import DatabasePathForm from './components/DatabasePathForm';

// Server URL and ports to try
const BASE_SERVER_URL = 'http://localhost';
const DEFAULT_PORT = 4000;
const PORTS_TO_TRY = [4000, 4001, 4002, 4003, 4004];

// Local storage keys
const DB_PATH_STORAGE_KEY = 'lastDatabasePath';
const SERVER_PORT_STORAGE_KEY = 'lastServerPort';

// Initialize socket with null, will be set after connection
let socket: Socket | null = null;

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
  const [dbPath, setDbPath] = useState<string>(
    localStorage.getItem(DB_PATH_STORAGE_KEY) || ''
  );
  const [isChangingDb, setIsChangingDb] = useState<boolean>(false);
  const [showDbForm, setShowDbForm] = useState<boolean>(false);
  const [connected, setConnected] = useState<boolean>(false);
  const [serverPort, setServerPort] = useState<number>(
    parseInt(localStorage.getItem(SERVER_PORT_STORAGE_KEY) || String(DEFAULT_PORT))
  );
  const [autoLoaded, setAutoLoaded] = useState<boolean>(false);

  // Function to try connecting to different ports
  const connectToServer = async () => {
    // First try the saved port if available
    const savedPort = parseInt(localStorage.getItem(SERVER_PORT_STORAGE_KEY) || '0');
    const portsToTry = savedPort ? 
      [savedPort, ...PORTS_TO_TRY.filter(p => p !== savedPort)] : 
      PORTS_TO_TRY;
    
    let connected = false;
    
    for (const port of portsToTry) {
      try {
        console.log(`Trying to connect to server on port ${port}...`);
        
        // Close previous socket if exists
        if (socket) {
          socket.close();
        }
        
        // Create new socket connection
        const newSocket = io(`${BASE_SERVER_URL}:${port}`, {
          timeout: 3000,
          reconnectionAttempts: 1
        });
        
        // Wait for connection or error
        await new Promise<void>((resolve, reject) => {
          const timeoutId = setTimeout(() => {
            newSocket.close();
            reject(new Error(`Connection timeout on port ${port}`));
          }, 3000);
          
          newSocket.on('connect', () => {
            clearTimeout(timeoutId);
            resolve();
          });
          
          newSocket.on('connect_error', (err) => {
            clearTimeout(timeoutId);
            reject(err);
          });
        });
        
        // If we get here, connection was successful
        socket = newSocket;
        setServerPort(port);
        localStorage.setItem(SERVER_PORT_STORAGE_KEY, String(port));
        connected = true;
        setConnected(true);
        console.log(`Connected to server on port ${port}`);
        break;
      } catch (err) {
        console.log(`Failed to connect on port ${port}:`, err);
        continue;
      }
    }
    
    if (!connected) {
      setError('Could not connect to the server. Please ensure the server is running.');
      setLoading(false);
    } else {
      setupSocketListeners();
    }
  };

  // Setup socket event listeners
  const setupSocketListeners = () => {
    if (!socket) return;
    
    // Listen for server port
    socket.on('serverPort', (port: number) => {
      console.log(`Server confirmed running on port: ${port}`);
      setServerPort(port);
      localStorage.setItem(SERVER_PORT_STORAGE_KEY, String(port));
      
      // Only after we've confirmed the server port, check for saved database
      // This ensures the server is fully ready to handle our requests
      setTimeout(() => {
        const savedDbPath = localStorage.getItem(DB_PATH_STORAGE_KEY);
        if (savedDbPath && socket) {
          console.log(`Loading saved database path: ${savedDbPath}`);
          handleDatabaseChange(savedDbPath);
          setAutoLoaded(true); // Set flag to indicate auto-loading
        }
      }, 1000); // Add a 1-second delay to ensure server is ready
    });
    
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
      console.log(`Received database path from server: ${path}`);
      setDbPath(path);
      // Store the database path in localStorage when it's received from the server
      localStorage.setItem(DB_PATH_STORAGE_KEY, path);
    });

    socket.on('databasePathChanged', (path: string) => {
      console.log(`Database path changed to: ${path}`);
      setDbPath(path);
      setIsChangingDb(false);
      setSelectedTable(''); // Reset selected table when database changes
      // Store the database path in localStorage when it changes
      localStorage.setItem(DB_PATH_STORAGE_KEY, path);
    });

    // Listen for database changes
    socket.on('databaseChanged', () => {
      setLoading(true);
      if (socket) {
        socket.emit('getTables');
      }
    });

    // Listen for disconnect
    socket.on('disconnect', () => {
      setConnected(false);
      setError('Connection to server lost. Attempting to reconnect...');
      setTimeout(() => connectToServer(), 3000);
    });
    
    // Get initial data
    socket.emit('getTables');
  };

  // Connect to server on component mount
  useEffect(() => {
    connectToServer();
    
    // Clean up on unmount
    return () => {
      if (socket) {
        socket.off();
        socket.close();
      }
    };
  }, []);

  // When selected table changes, fetch its data
  useEffect(() => {
    if (selectedTable && socket && connected) {
      setLoading(true);
      socket.emit('getTableData', selectedTable);
    }
  }, [selectedTable, connected]);

  const handleTableSelect = (tableName: string) => {
    setSelectedTable(tableName);
  };

  const handleDatabaseChange = (newPath: string) => {
    if (!socket || !connected) {
      setError('Not connected to server');
      return;
    }
    
    setIsChangingDb(true);
    setError(null);
    
    console.log(`Changing database to: ${newPath}`);
    
    socket.emit('changeDatabase', newPath, (response: { success: boolean, message?: string, path?: string }) => {
      if (!response.success) {
        setError(response.message || 'Failed to change database');
        setIsChangingDb(false);
      } else {
        console.log(`Successfully changed database to: ${response.path}`);
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
            {autoLoaded && (
              <p className="text-sm text-green-600 mt-1">
                <span className="inline-block mr-1">✓</span>
                Automatically loaded last used database
              </p>
            )}
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