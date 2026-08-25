// src/services/alarm.service.ts
import { StorageService } from './storage.service';
import { AudioService } from './audio.service';
import { TauriService } from './tauri.service';

export class AlarmService {
  private static intervalId: number | null = null;
  private static onAlarmTriggeredCallbacks: Set<(title: string) => void> = new Set();

  static init(): void {
    if (this.intervalId) return;

    this.intervalId = window.setInterval(() => {
      this.checkAlarms();
    }, 1000);
  }

  private static checkAlarms(): void {
    const now = new Date();
    const currentHours = String(now.getHours()).padStart(2, '0');
    const currentMinutes = String(now.getMinutes()).padStart(2, '0');
    const currentTimeStr = `${currentHours}:${currentMinutes}`;
    const todayStr = now.toISOString().split('T')[0];

    const alarms = StorageService.getAlarms();

    alarms.forEach(alarm => {
      if (alarm.enabled && alarm.time === currentTimeStr && alarm.lastTriggeredDate !== todayStr) {
        // Disparar alarma
        StorageService.updateAlarmTriggered(alarm.id, todayStr);
        AudioService.playNotificationSound();
        TauriService.notifyBlockFinished(
          '⏰ Alarma de Enfoque',
          `Ha llegado la hora programada: "${alarm.title}" (${alarm.time})`
        );
        this.onAlarmTriggeredCallbacks.forEach(fn => fn(alarm.title));
      }
    });
  }

  static onTrigger(fn: (title: string) => void): () => void {
    this.onAlarmTriggeredCallbacks.add(fn);
    return () => this.onAlarmTriggeredCallbacks.delete(fn);
  }
}