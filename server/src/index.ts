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
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../database.sqlite');

// Ensure database file exists
if (!fs.existsSync(DB_PATH)) {
  console.log(`Database file not found at ${DB_PATH}, creating a new one...`);
  fs.writeFileSync(DB_PATH, '');
  
  // Create a sample table for demonstration
  const db = new Database(DB_PATH);
  db.exec(`
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
  db.close();
}

// Initialize database connection
let db: Database.Database;
try {
  db = new Database(DB_PATH);
  console.log(`Connected to SQLite database at ${DB_PATH}`);
} catch (error) {
  console.error('Failed to connect to the database:', error);
  process.exit(1);
}

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
  }
});

// Initialize database watcher
const watcher = new DatabaseWatcher(DB_PATH, () => {
  io.emit('databaseChanged');
});

// Get all tables from the database
function getTables(): string[] {
  const tables = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name NOT LIKE 'sqlite_%'
  `).all();
  
  return tables.map((table: any) => table.name);
}

// Get data from a specific table
function getTableData(tableName: string, limit = 100) {
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

// Socket.IO connection handler
io.on('connection', (socket) => {
  console.log('Client connected');
  
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

// Start the server
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
}); 