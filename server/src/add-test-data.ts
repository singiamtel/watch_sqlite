import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to the database
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../database.sqlite');

// Connect to the database
const db = new Database(DB_PATH);

// Function to add a random user
function addRandomUser() {
  const names = ['Alice', 'Bob', 'Charlie', 'David', 'Emma', 'Frank', 'Grace', 'Henry'];
  const surnames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Miller', 'Davis', 'Garcia'];
  
  const randomName = names[Math.floor(Math.random() * names.length)];
  const randomSurname = surnames[Math.floor(Math.random() * surnames.length)];
  const fullName = `${randomName} ${randomSurname}`;
  const email = `${randomName.toLowerCase()}.${randomSurname.toLowerCase()}${Math.floor(Math.random() * 1000)}@example.com`;
  
  try {
    const stmt = db.prepare('INSERT INTO users (name, email) VALUES (?, ?)');
    const result = stmt.run(fullName, email);
    console.log(`Added user: ${fullName} (${email}), ID: ${result.lastInsertRowid}`);
  } catch (error) {
    console.error('Error adding user:', error);
  }
}

// Function to add a random product
function addRandomProduct() {
  const products = ['Monitor', 'Keyboard', 'Mouse', 'Webcam', 'Microphone', 'Speakers', 'Tablet', 'Printer'];
  const randomProduct = products[Math.floor(Math.random() * products.length)];
  const price = Math.floor(Math.random() * 500) + 50 + Math.random();
  const stock = Math.floor(Math.random() * 100);
  
  try {
    const stmt = db.prepare('INSERT INTO products (name, price, stock) VALUES (?, ?, ?)');
    const result = stmt.run(randomProduct, price.toFixed(2), stock);
    console.log(`Added product: ${randomProduct}, Price: $${price.toFixed(2)}, Stock: ${stock}, ID: ${result.lastInsertRowid}`);
  } catch (error) {
    console.error('Error adding product:', error);
  }
}

// Add some random data
console.log('Adding random data to the database...');
for (let i = 0; i < 5; i++) {
  addRandomUser();
  addRandomProduct();
}

console.log('Done!');
db.close(); 