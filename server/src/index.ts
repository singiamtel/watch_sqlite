import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { DatabaseWatcher } from './watcher.js';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const PORT = process.env.PORT || 4000;
const DEFAULT_DB_PATH = process.env.DB_PATH || path.join(__dirname, '../database.sqlite');

// Function to find an available port
const findAvailablePort = (startPort: number, maxAttempts = 10): Promise<number> => {
  return new Promise((resolve, reject) => {
    let currentPort = startPort;
    let attempts = 0;
    
    const tryPort = () => {
      if (attempts >= maxAttempts) {
        return reject(new Error(`Could not find an available port after ${maxAttempts} attempts`));
      }
      
      const testServer = http.createServer();
      testServer.once('error', (err: any) => {
        if (err.code === 'EADDRINUSE') {
          console.log(`Port ${currentPort} is in use, trying another one...`);
          currentPort++;
          attempts++;
          testServer.close(() => tryPort());
        } else {
          reject(err);
        }
      });
      
      testServer.once('listening', () => {
        testServer.close(() => resolve(currentPort));
      });
      
      testServer.listen(currentPort);
    };
    
    tryPort();
  });
};

// Initialize Express app
const app = express();
app.use(cors());
app.use(express.json());

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  // Add additional configuration for better connection handling
  pingTimeout: 60000,
  pingInterval: 25000
});

// Database connection and watcher
let db: Database.Database | null = null;
let watcher: DatabaseWatcher | null = null;
let currentDbPath: string = DEFAULT_DB_PATH;

// Function to initialize or change the database connection
function connectToDatabase(dbPath: string): boolean {
  try {
    // Close existing connections if any
    if (db) {
      db.close();
    }
    if (watcher) {
      watcher.stopWatching();
    }

    // Ensure the directory exists
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      throw new Error(`Directory does not exist: ${dbDir}`);
    }

    // Check if database file exists, create it if not
    const dbExists = fs.existsSync(dbPath);
    if (!dbExists) {
      console.log(`Database file not found at ${dbPath}, creating a new one...`);
      fs.writeFileSync(dbPath, '');
      
      // Create sample tables for new databases
      const newDb = new Database(dbPath);
      newDb.exec(`
        CREATE TABLE users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        INSERT INTO users (name, email) VALUES 
          ('John Doe', 'john@example.com'),
          ('Jane Smith', 'jane@example.com'),
          ('Bob Johnson', 'bob@example.com');
          
        CREATE TABLE products (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          price REAL NOT NULL,
          stock INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        INSERT INTO products (name, price, stock) VALUES 
          ('Laptop', 999.99, 10),
          ('Smartphone', 699.99, 25),
          ('Headphones', 149.99, 50);
      `);
      newDb.close();
    }

    // Connect to the database
    db = new Database(dbPath);
    console.log(`Connected to SQLite database at ${dbPath}`);
    
    // Initialize database watcher
    watcher = new DatabaseWatcher(dbPath, () => {
      io.emit('databaseChanged');
    });
    
    currentDbPath = dbPath;
    return true;
  } catch (error) {
    console.error('Failed to connect to the database:', error);
    return false;
  }
}

// Initialize with default database
connectToDatabase(DEFAULT_DB_PATH);

// API endpoint to change database path
app.post('/api/change-database', (req, res) => {
  const { dbPath } = req.body;
  
  if (!dbPath) {
    return res.status(400).json({ success: false, message: 'Database path is required' });
  }
  
  try {
    // Resolve relative paths if needed
    const resolvedPath = path.isAbsolute(dbPath) ? dbPath : path.resolve(process.cwd(), dbPath);
    
    const success = connectToDatabase(resolvedPath);
    
    if (success) {
      io.emit('databaseChanged');
      io.emit('databasePathChanged', resolvedPath);
      return res.json({ success: true, path: resolvedPath });
    } else {
      return res.status(500).json({ success: false, message: 'Failed to connect to database' });
    }
  } catch (error) {
    console.error('Error changing database:', error);
    return res.status(500).json({ success: false, message: String(error) });
  }
});

// API endpoint to get current database path
app.get('/api/database-path', (req, res) => {
  res.json({ path: currentDbPath });
});

// Get all tables from the database
function getTables(): string[] {
  if (!db) {
    throw new Error('No database connection');
  }
  
  const tables = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name NOT LIKE 'sqlite_%'
  `).all();
  
  return tables.map((table: any) => table.name);
}

// Get data from a specific table
function getTableData(tableName: string, limit = 100) {
  if (!db) {
    throw new Error('No database connection');
  }
  
  // Validate table name to prevent SQL injection
  const validTableName = tableName.replace(/[^a-zA-Z0-9_]/g, '');
  
  if (validTableName !== tableName) {
    throw new Error('Invalid table name');
  }
  
  // Get column names
  const tableInfo = db.prepare(`PRAGMA table_info(${validTableName})`).all();
  const columns = tableInfo.map((col: any) => col.name);
  
  // Check if the table has a created_at or timestamp column
  const hasCreatedAt = columns.some(col => 
    col.toLowerCase() === 'created_at' || 
    col.toLowerCase() === 'timestamp' || 
    col.toLowerCase() === 'date' ||
    col.toLowerCase() === 'datetime'
  );
  
  // Get rows with limit, ordered by date if available, otherwise by rowid
  let query;
  if (hasCreatedAt) {
    // Find the actual date column name with correct case
    const dateColumn = columns.find(col => 
      col.toLowerCase() === 'created_at' || 
      col.toLowerCase() === 'timestamp' || 
      col.toLowerCase() === 'date' ||
      col.toLowerCase() === 'datetime'
    );
    query = `SELECT * FROM ${validTableName} ORDER BY ${dateColumn} DESC LIMIT ?`;
  } else {
    query = `SELECT * FROM ${validTableName} ORDER BY rowid DESC LIMIT ?`;
  }
  
  const rows = db.prepare(query).all(limit);
  
  return {
    name: validTableName,
    columns,
    rows // No need to reverse, already in descending order
  };
}

// Start the server
const startServer = async () => {
  try {
    const availablePort = await findAvailablePort(Number(PORT));
    server.listen(availablePort, () => {
      console.log(`Server running on http://localhost:${availablePort}`);
      
      // Store the current port for socket connections
      io.on('connection', (socket) => {
        console.log('Client connected');
        
        // Send current port and database path when client connects
        socket.emit('serverPort', availablePort);
        socket.emit('databasePath', currentDbPath);
        
        // Handle database path change request
        socket.on('changeDatabase', (dbPath, callback) => {
          try {
            // Resolve relative paths if needed
            const resolvedPath = path.isAbsolute(dbPath) ? dbPath : path.resolve(process.cwd(), dbPath);
            
            const success = connectToDatabase(resolvedPath);
            
            if (success) {
              io.emit('databaseChanged');
              io.emit('databasePathChanged', resolvedPath);
              callback?.({ success: true, path: resolvedPath });
            } else {
              callback?.({ success: false, message: 'Failed to connect to database' });
            }
          } catch (error) {
            console.error('Error changing database:', error);
            callback?.({ success: false, message: String(error) });
          }
        });
        
        // Send list of tables when requested
        socket.on('getTables', () => {
          try {
            const tables = getTables();
            socket.emit('tables', tables);
          } catch (error) {
            console.error('Error getting tables:', error);
            socket.emit('error', 'Failed to get tables from database');
          }
        });
        
        // Send table data when requested
        socket.on('getTableData', (tableName) => {
          try {
            const data = getTableData(tableName);
            socket.emit('tableData', data);
          } catch (error) {
            console.error(`Error getting data from table ${tableName}:`, error);
            socket.emit('error', `Failed to get data from table ${tableName}`);
          }
        });
        
        socket.on('disconnect', () => {
          console.log('Client disconnected');
        });
      });
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer(); 