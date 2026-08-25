// En src/services/storage.service.ts
import { UserProfile } from '../models/user.model';
import { Flow, BlockType } from '../models/flow.model';
import { SessionHistory } from '../models/session.model';

const KEYS = {
  USER: 'focus_flow_user',
  FLOWS: 'focus_flow_flows',
  HISTORY: 'focus_flow_history',
  TASKS: 'focus_flow_tasks',
  ALARMS: 'focus_flow_work_alarms',
  DAILY_GOAL: 'focus_flow_daily_goal',
  APP_START: 'focus_flow_app_start_date'
};

export interface WorkAlarm {
  id: string;
  title: string;
  time: string; // Formato "HH:mm" (ej: "15:10")
  enabled: boolean;
  lastTriggeredDate?: string; // Para no sonar más de una vez en el mismo día
}

export interface TaskItem {
  id: string;
  title: string;
  completed: boolean;
}

export interface HistoryItem {
  id: string;
  flowId?: string;
  flowName: string;
  completedAt: string;
  totalDurationMinutes: number;
  completedBlocks?: number;
  totalBlocks?: number;
  breakdown?: Record<BlockType, number>;
}

export class StorageService {
  // --- USUARIO ---
  static getUser(): UserProfile | null {
    const data = localStorage.getItem(KEYS.USER);
    return data ? JSON.parse(data) : null;
  }

  static saveUser(name: string): UserProfile {
    const user: UserProfile = { id: 1, name };
    localStorage.setItem(KEYS.USER, JSON.stringify(user));
    return user;
  }

  // --- FLUJOS ---
  static getFlows(): Flow[] {
    const data = localStorage.getItem(KEYS.FLOWS);
    return data ? JSON.parse(data) : [];
  }

  static saveFlow(flow: Flow): void {
    const flows = this.getFlows();
    const index = flows.findIndex(f => f.id === flow.id);
    if (index >= 0) {
      flows[index] = flow;
    } else {
      flows.push(flow);
    }
    localStorage.setItem(KEYS.FLOWS, JSON.stringify(flows));
  }

  static deleteFlow(id: string): void {
    const flows = this.getFlows().filter(f => f.id !== id);
    localStorage.setItem(KEYS.FLOWS, JSON.stringify(flows));
  }

  // --- ALARMAS DE TRABAJO ---
  static getAlarms(): WorkAlarm[] {
    const data = localStorage.getItem(KEYS.ALARMS);
    return data ? JSON.parse(data) : [
      { id: '1', title: 'Cierre de sesión de estudio', time: '15:10', enabled: true }
    ];
  }

  static saveAlarms(alarms: WorkAlarm[]): void {
    localStorage.setItem(KEYS.ALARMS, JSON.stringify(alarms));
  }

  static addAlarm(title: string, time: string): WorkAlarm[] {
    const alarms = this.getAlarms();
    const newAlarm: WorkAlarm = {
      id: crypto.randomUUID(),
      title: title.trim() || 'Alarma de enfoque',
      time,
      enabled: true
    };
    alarms.push(newAlarm);
    this.saveAlarms(alarms);
    return alarms;
  }

  static toggleAlarm(id: string): WorkAlarm[] {
    const alarms = this.getAlarms();
    const item = alarms.find(a => a.id === id);
    if (item) item.enabled = !item.enabled;
    this.saveAlarms(alarms);
    return alarms;
  }

  static deleteAlarm(id: string): WorkAlarm[] {
    const alarms = this.getAlarms().filter(a => a.id !== id);
    this.saveAlarms(alarms);
    return alarms;
  }

  static updateAlarmTriggered(id: string, dateStr: string): void {
    const alarms = this.getAlarms();
    const item = alarms.find(a => a.id === id);
    if (item) {
      item.lastTriggeredDate = dateStr;
      this.saveAlarms(alarms);
    }
  }

  // --- HISTORIAL ---
  static getHistory(): HistoryItem[] {
    const data = localStorage.getItem(KEYS.HISTORY);
    return data ? JSON.parse(data) : [];
  }

  static addHistoryEntry(entry: SessionHistory): void {
    const history = this.getHistory();
    history.unshift(entry);
    localStorage.setItem(KEYS.HISTORY, JSON.stringify(history));
  }

  static recordSession(session: HistoryItem): void {
    const history = this.getHistory();
    history.unshift(session);
    localStorage.setItem(KEYS.HISTORY, JSON.stringify(history));
  }

  // --- TAREAS ---
  static getTasks(): TaskItem[] {
    const data = localStorage.getItem(KEYS.TASKS);
    return data ? JSON.parse(data) : [
      { id: '1', title: 'Avanzar informe de proyecto', completed: false },
      { id: '2', title: 'Revisar pendientes del flujo', completed: true }
    ];
  }

  static saveTasks(tasks: TaskItem[]): void {
    localStorage.setItem(KEYS.TASKS, JSON.stringify(tasks));
  }

  static addTask(title: string): TaskItem[] {
    const tasks = this.getTasks();
    const newTask: TaskItem = { id: crypto.randomUUID(), title, completed: false };
    tasks.unshift(newTask);
    this.saveTasks(tasks);
    return tasks;
  }

  static toggleTask(id: string): TaskItem[] {
    const tasks = this.getTasks();
    const task = tasks.find(t => t.id === id);
    if (task) task.completed = !task.completed;
    this.saveTasks(tasks);
    return tasks;
  }

  static deleteTask(id: string): TaskItem[] {
    const tasks = this.getTasks().filter(t => t.id !== id);
    this.saveTasks(tasks);
    return tasks;
  }

  // --- METAS Y CONFIGURACIÓN ---
  static getDailyGoal(): number {
    const goal = localStorage.getItem(KEYS.DAILY_GOAL);
    return goal ? parseInt(goal, 10) : 30;
  }

  static setDailyGoal(minutes: number): void {
    localStorage.setItem(KEYS.DAILY_GOAL, minutes.toString());
  }

  static getAppStartDate(): Date {
    let start = localStorage.getItem(KEYS.APP_START);
    if (!start) {
      start = new Date().toISOString();
      localStorage.setItem(KEYS.APP_START, start);
    }
    return new Date(start);
  }
}