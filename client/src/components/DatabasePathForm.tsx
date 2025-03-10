import { useState, useEffect, FormEvent } from 'react';
import { motion } from 'framer-motion';

interface DatabasePathFormProps {
  currentPath: string;
  onSubmit: (path: string) => void;
  isLoading: boolean;
}

const DatabasePathForm = ({ currentPath, onSubmit, isLoading }: DatabasePathFormProps) => {
  const [path, setPath] = useState<string>(currentPath);
  const [showHelp, setShowHelp] = useState<boolean>(false);

  // Update path state when currentPath prop changes
  useEffect(() => {
    if (currentPath) {
      setPath(currentPath);
    }
  }, [currentPath]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (path.trim()) {
      onSubmit(path.trim());
    }
  };

  return (
    <div className="bg-gray-50 p-6 rounded-lg shadow-sm mt-4 mb-6 border border-gray-200">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-medium text-gray-700">Database Settings</h2>
        <button
          type="button"
          onClick={() => setShowHelp(!showHelp)}
          className="text-blue-600 hover:text-blue-800 text-sm"
        >
          {showHelp ? 'Hide Help' : 'Show Help'}
        </button>
      </div>

      {showHelp && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
          className="bg-blue-50 p-4 rounded mb-4 text-sm text-blue-800"
        >
          <h3 className="font-medium mb-2">How to use:</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>Enter the absolute path to your SQLite database file</li>
            <li>If the file doesn't exist, a new database will be created</li>
            <li>The directory must exist for the database to be created</li>
            <li>Examples:
              <ul className="list-disc pl-5 mt-1">
                <li><code>/path/to/your/database.sqlite</code></li>
                <li><code>C:\path\to\your\database.db</code> (Windows)</li>
              </ul>
            </li>
          </ul>
        </motion.div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="dbPath" className="block text-sm font-medium text-gray-700 mb-1">
            Database Path
          </label>
          <input
            type="text"
            id="dbPath"
            value={path}
            onChange={(e) => setPath(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter absolute path to SQLite database file"
            disabled={isLoading}
          />
          <p className="mt-1 text-xs text-gray-500">
            Current: <span className="font-mono">{currentPath}</span>
          </p>
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isLoading || !path.trim() || path === currentPath}
            className={`px-4 py-2 rounded text-white ${
              isLoading || !path.trim() || path === currentPath
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isLoading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Connecting...
              </span>
            ) : (
              'Connect to Database'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default DatabasePathForm; 