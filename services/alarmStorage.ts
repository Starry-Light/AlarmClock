import { Alarm, RepeatDay } from '../types/alarm';
import { getDatabase } from './database';

/**
 * Service layer for alarm storage operations using SQLite.
 * These functions can be called directly by UI or by external services (like chatbots).
 */

/**
 * Convert database row to Alarm object
 */
function rowToAlarm(row: any): Alarm {
  return {
    id: row.id,
    time: new Date(row.time),
    label: row.label,
    enabled: row.enabled === 1,
    repeatDays: JSON.parse(row.repeatDays) as RepeatDay[],
    notificationId: row.notificationId || undefined,
  };
}

/**
 * Convert Alarm object to database values
 */
function alarmToRow(alarm: Alarm) {
  return {
    id: alarm.id,
    time: alarm.time.toISOString(),
    label: alarm.label,
    enabled: alarm.enabled ? 1 : 0,
    repeatDays: JSON.stringify(alarm.repeatDays),
    notificationId: alarm.notificationId || null,
  };
}

export const alarmStorage = {
  /**
   * Get all alarms from storage
   */
  async getAlarms(): Promise<Alarm[]> {
    try {
      const db = await getDatabase();
      const result = await db.getAllAsync<any>('SELECT * FROM alarms ORDER BY time ASC');
      return result.map(rowToAlarm);
    } catch (error) {
      console.error('Error loading alarms:', error);
      return [];
    }
  },

  /**
   * Add a new alarm
   */
  async addAlarm(alarm: Alarm): Promise<Alarm[]> {
    try {
      const db = await getDatabase();
      const row = alarmToRow(alarm);
      
      await db.runAsync(
        `INSERT INTO alarms (id, time, label, enabled, repeatDays, notificationId, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
        [row.id, row.time, row.label, row.enabled, row.repeatDays, row.notificationId]
      );
      
      return await this.getAlarms();
    } catch (error) {
      console.error('Error adding alarm:', error);
      throw error;
    }
  },

  /**
   * Update an existing alarm
   */
  async updateAlarm(updatedAlarm: Alarm): Promise<Alarm[]> {
    try {
      const db = await getDatabase();
      const row = alarmToRow(updatedAlarm);
      
      await db.runAsync(
        `UPDATE alarms 
         SET time = ?, label = ?, enabled = ?, repeatDays = ?, notificationId = ?, updatedAt = datetime('now')
         WHERE id = ?`,
        [row.time, row.label, row.enabled, row.repeatDays, row.notificationId, row.id]
      );
      
      return await this.getAlarms();
    } catch (error) {
      console.error('Error updating alarm:', error);
      throw error;
    }
  },

  /**
   * Delete an alarm by ID
   */
  async deleteAlarm(id: string): Promise<Alarm[]> {
    try {
      const db = await getDatabase();
      await db.runAsync('DELETE FROM alarms WHERE id = ?', [id]);
      return await this.getAlarms();
    } catch (error) {
      console.error('Error deleting alarm:', error);
      throw error;
    }
  },

  /**
   * Toggle alarm enabled state
   */
  async toggleAlarm(id: string): Promise<Alarm[]> {
    try {
      const db = await getDatabase();
      
      // Get current state
      const alarm = await this.getAlarmById(id);
      if (!alarm) {
        throw new Error(`Alarm with id ${id} not found`);
      }
      
      // Toggle enabled state
      const newEnabledState = alarm.enabled ? 0 : 1;
      
      await db.runAsync(
        'UPDATE alarms SET enabled = ?, updatedAt = datetime(\'now\') WHERE id = ?',
        [newEnabledState, id]
      );
      
      return await this.getAlarms();
    } catch (error) {
      console.error('Error toggling alarm:', error);
      throw error;
    }
  },

  /**
   * Find alarms by label 
   */
  async findAlarmsByLabel(searchTerm: string): Promise<Alarm[]> {
    try {
      const db = await getDatabase();
      const result = await db.getAllAsync<any>(
        'SELECT * FROM alarms WHERE label LIKE ? ORDER BY time ASC',
        [`%${searchTerm}%`]
      );
      return result.map(rowToAlarm);
    } catch (error) {
      console.error('Error searching alarms:', error);
      return [];
    }
  },

  /**
   * Get alarm by ID
   */
  async getAlarmById(id: string): Promise<Alarm | null> {
    try {
      const db = await getDatabase();
      const result = await db.getFirstAsync<any>(
        'SELECT * FROM alarms WHERE id = ?',
        [id]
      );
      return result ? rowToAlarm(result) : null;
    } catch (error) {
      console.error('Error getting alarm by ID:', error);
      return null;
    }
  },

  /**
   * Clear all alarms 
   */
  async clearAllAlarms(): Promise<void> {
    try {
      const db = await getDatabase();
      await db.runAsync('DELETE FROM alarms');
    } catch (error) {
      console.error('Error clearing alarms:', error);
      throw error;
    }
  },

  /**
   * Get alarms by enabled state
   */
  async getAlarmsByEnabledState(enabled: boolean): Promise<Alarm[]> {
    try {
      const db = await getDatabase();
      const result = await db.getAllAsync<any>(
        'SELECT * FROM alarms WHERE enabled = ? ORDER BY time ASC',
        [enabled ? 1 : 0]
      );
      return result.map(rowToAlarm);
    } catch (error) {
      console.error('Error getting alarms by enabled state:', error);
      return [];
    }
  },

  /**
   * Get count of all alarms
   */
  async getAlarmsCount(): Promise<number> {
    try {
      const db = await getDatabase();
      const result = await db.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM alarms'
      );
      return result?.count || 0;
    } catch (error) {
      console.error('Error getting alarms count:', error);
      return 0;
    }
  },
};
