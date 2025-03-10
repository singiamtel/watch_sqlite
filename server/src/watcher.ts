import fs from 'fs';

/**
 * A class that watches for changes to a SQLite database file
 */
export class DatabaseWatcher {
  private filePath: string;
  private onChange: () => void;
  private watchInterval: NodeJS.Timeout | null = null;
  private lastMtime: number = 0;

  /**
   * Creates a new DatabaseWatcher
   * @param filePath Path to the SQLite database file
   * @param onChange Callback function to execute when the database changes
   * @param pollInterval How often to check for changes (in milliseconds)
   */
  constructor(filePath: string, onChange: () => void, pollInterval: number = 1000) {
    this.filePath = filePath;
    this.onChange = onChange;
    
    // Get initial modification time
    try {
      const stats = fs.statSync(this.filePath);
      this.lastMtime = stats.mtimeMs;
    } catch (error) {
      console.error(`Error getting initial file stats: ${error}`);
    }
    
    // Start watching for changes
    this.startWatching(pollInterval);
  }

  /**
   * Starts watching the database file for changes
   */
  private startWatching(pollInterval: number): void {
    this.watchInterval = setInterval(() => {
      try {
        const stats = fs.statSync(this.filePath);
        const currentMtime = stats.mtimeMs;
        
        // If modification time has changed, trigger the callback
        if (currentMtime !== this.lastMtime) {
          this.lastMtime = currentMtime;
          this.onChange();
        }
      } catch (error) {
        console.error(`Error watching database file: ${error}`);
      }
    }, pollInterval);
  }

  /**
   * Stops watching the database file
   */
  public stopWatching(): void {
    if (this.watchInterval) {
      clearInterval(this.watchInterval);
      this.watchInterval = null;
    }
  }
} 