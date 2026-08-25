// src/views/ToolsView.ts
import { AppRouter } from '../app';
import { StorageService, WorkAlarm } from '../services/storage.service';
import { UI_ICONS } from '../utils/icons';

export class ToolsView {
  // Estado del cronómetro clásico
  private static swRunning: boolean = false;
  private static swElapsedMs: number = 0;
  private static swInterval: number | null = null;
  private static swLaps: string[] = [];

  // Intervalos de la vista
  private static clockInterval: number | null = null;

  static render(router: AppRouter): HTMLElement {
    const view = document.createElement('div');
    view.className = 'tools-view-container';

    this.renderDOM(view, router);
    return view;
  }

  private static renderDOM(view: HTMLElement, router: AppRouter): void {
    // Información de zona horaria local
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local';
    const alarms = StorageService.getAlarms();

    view.innerHTML = `
      <div class="tools-grid-layout">
        
        <!-- COLUMNA IZQUIERDA: ALARMAS DE ENFOQUE (DISEÑO TIPO MIS FLUJOS) -->
        <section class="tools-card alarms-card-panel">
          <div class="tools-card-header">
            <h3 class="tools-section-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="13" r="8"></circle>
                <path d="M12 9v4l2 2"></path>
                <path d="M5 3 2 6"></path>
                <path d="M22 6l-3-3"></path>
                <path d="M6.38 18.7 4 21"></path>
                <path d="M17.64 18.67 20 21"></path>
              </svg>
              <span>ALARMAS DE ENFOQUE</span>
            </h3>
          </div>

          <!-- FORMULARIO DE NUEVA ALARMA -->
          <form class="alarm-create-row" id="form-create-alarm">
            <input 
              type="time" 
              class="alarm-time-input" 
              id="input-alarm-time" 
              required 
              title="Hora de finalización"
            />
            <input 
              type="text" 
              class="alarm-name-input" 
              id="input-alarm-title" 
              placeholder="Ej: Quedarme estudiando hasta..." 
              maxlength="40" 
              required 
            />
            <button type="submit" class="alarm-add-btn" id="btn-add-alarm" title="Guardar alarma">
              ${UI_ICONS.plus}
            </button>
          </form>

          <!-- LISTA DE ALARMAS -->
          <div class="alarms-items-list" id="alarms-items-list">
            ${this.renderAlarmsList(alarms)}
          </div>
        </section>

        <!-- COLUMNA DERECHA: RELOJ LOCAL & CRONÓMETRO DE PRECISIÓN -->
        <div class="tools-right-column">
          
          <!-- TARJETA: RELOJ DE ZONA LOCAL -->
          <section class="tools-card local-clock-panel">
            <div class="clock-badge-timezone">
              <span class="tz-dot"></span>
              <span class="tz-text">${timeZone.replace('_', ' ')}</span>
            </div>
            
            <div class="local-live-clock" id="live-clock-digits">--:--:--</div>
            <div class="local-live-date" id="live-clock-date">Cargando fecha...</div>
          </section>

          <!-- TARJETA: CRONÓMETRO PROGRESIVO -->
          <section class="tools-card stopwatch-panel">
            <div class="tools-card-header">
              <h3 class="tools-section-title">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
                <span>CRONÓMETRO ESTÁNDAR</span>
              </h3>
            </div>

            <div class="stopwatch-digits" id="stopwatch-display">
              ${this.formatStopwatchTime(this.swElapsedMs)}
            </div>

            <div class="stopwatch-controls">
              <button class="sw-btn" id="btn-sw-reset" title="Reiniciar">${UI_ICONS.reset}</button>
              <button class="sw-play-btn ${this.swRunning ? 'running' : ''}" id="btn-sw-toggle">
                ${this.swRunning ? UI_ICONS.pause : UI_ICONS.play}
              </button>
              <button class="sw-btn" id="btn-sw-lap" title="Marcar vuelta">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path>
                  <line x1="4" y1="22" x2="4" y2="15"></line>
                </svg>
              </button>
            </div>

            <!-- VUELTAS / LAPS -->
            <div class="stopwatch-laps-box" id="stopwatch-laps-box">
              ${this.swLaps.map((lap, i) => `
                <div class="sw-lap-row">
                  <span>Vuelta ${this.swLaps.length - i}</span>
                  <span class="sw-lap-val">${lap}</span>
                </div>
              `).join('')}
            </div>
          </section>

        </div>
      </div>
    `;

    this.bindEvents(view, router);
    this.startClockUpdater(view);
  }

  private static renderAlarmsList(alarms: WorkAlarm[]): string {
    if (alarms.length === 0) {
      return `
        <div class="alarms-empty-state">
          <p>No tienes alarmas programadas.</p>
          <span>Programa una hora límite para cerrar tus sesiones de trabajo.</span>
        </div>
      `;
    }

    return alarms.map(alarm => {
      const remaining = this.getRemainingTimeStr(alarm.time);
      return `
        <div class="alarm-item-card ${alarm.enabled ? 'active' : 'disabled'}">
          <div class="alarm-time-badge">
            <span class="alarm-time-digits">${alarm.time}</span>
            <span class="alarm-countdown-tag">${alarm.enabled ? remaining : 'Desactivada'}</span>
          </div>

          <div class="alarm-info-meta">
            <span class="alarm-item-title" title="${alarm.title}">${alarm.title}</span>
          </div>

          <div class="alarm-item-actions">
            <button class="alarm-toggle-btn ${alarm.enabled ? 'on' : 'off'}" data-toggle-alarm="${alarm.id}" title="${alarm.enabled ? 'Desactivar' : 'Activar'}">
              <span class="toggle-slider"></span>
            </button>
            <button class="alarm-del-btn" data-del-alarm="${alarm.id}" title="Eliminar alarma">
              ${UI_ICONS.trash}
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  private static getRemainingTimeStr(targetTime: string): string {
    const [h, m] = targetTime.split(':').map(Number);
    const now = new Date();
    const target = new Date();
    target.setHours(h, m, 0, 0);

    let diffMs = target.getTime() - now.getTime();
    if (diffMs <= 0) {
      // Si ya pasó hoy, se proyecta para mañana
      diffMs += 24 * 60 * 60 * 1000;
    }

    const diffMins = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;

    if (hours > 0) return `en ${hours}h ${mins}m`;
    return `en ${mins}m`;
  }

  private static bindEvents(view: HTMLElement, router: AppRouter): void {
    // 1. Formulario de creación de alarma
    const form = view.querySelector('#form-create-alarm') as HTMLFormElement;
    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      const timeInput = view.querySelector('#input-alarm-time') as HTMLInputElement;
      const titleInput = view.querySelector('#input-alarm-title') as HTMLInputElement;

      if (timeInput.value) {
        StorageService.addAlarm(titleInput.value, timeInput.value);
        titleInput.value = '';
        const listContainer = view.querySelector('#alarms-items-list');
        if (listContainer) listContainer.innerHTML = this.renderAlarmsList(StorageService.getAlarms());
        this.bindAlarmItemEvents(view);
      }
    });

    this.bindAlarmItemEvents(view);

    // 2. Cronómetro progresivo
    const display = view.querySelector('#stopwatch-display') as HTMLElement;
    const playBtn = view.querySelector('#btn-sw-toggle') as HTMLElement;
    const lapsBox = view.querySelector('#stopwatch-laps-box') as HTMLElement;

    playBtn?.addEventListener('click', () => {
      if (this.swRunning) {
        // Pausar
        if (this.swInterval) clearInterval(this.swInterval);
        this.swRunning = false;
        playBtn.classList.remove('running');
        playBtn.innerHTML = UI_ICONS.play;
      } else {
        // Iniciar
        this.swRunning = true;
        playBtn.classList.add('running');
        playBtn.innerHTML = UI_ICONS.pause;
        const startTimestamp = Date.now() - this.swElapsedMs;

        this.swInterval = window.setInterval(() => {
          this.swElapsedMs = Date.now() - startTimestamp;
          if (display) display.textContent = this.formatStopwatchTime(this.swElapsedMs);
        }, 30);
      }
    });

    view.querySelector('#btn-sw-reset')?.addEventListener('click', () => {
      if (this.swInterval) clearInterval(this.swInterval);
      this.swRunning = false;
      this.swElapsedMs = 0;
      this.swLaps = [];
      if (display) display.textContent = '00:00:00';
      if (playBtn) {
        playBtn.classList.remove('running');
        playBtn.innerHTML = UI_ICONS.play;
      }
      if (lapsBox) lapsBox.innerHTML = '';
    });

    view.querySelector('#btn-sw-lap')?.addEventListener('click', () => {
      if (this.swElapsedMs > 0) {
        const lapStr = this.formatStopwatchTime(this.swElapsedMs);
        this.swLaps.unshift(lapStr);
        if (lapsBox) {
          lapsBox.innerHTML = this.swLaps.map((lap, i) => `
            <div class="sw-lap-row">
              <span>Vuelta ${this.swLaps.length - i}</span>
              <span class="sw-lap-val">${lap}</span>
            </div>
          `).join('');
        }
      }
    });
  }

  private static bindAlarmItemEvents(view: HTMLElement): void {
    view.querySelectorAll('[data-toggle-alarm]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = (e.currentTarget as HTMLElement).getAttribute('data-toggle-alarm');
        if (id) {
          StorageService.toggleAlarm(id);
          const list = view.querySelector('#alarms-items-list');
          if (list) list.innerHTML = this.renderAlarmsList(StorageService.getAlarms());
          this.bindAlarmItemEvents(view);
        }
      });
    });

    view.querySelectorAll('[data-del-alarm]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = (e.currentTarget as HTMLElement).getAttribute('data-del-alarm');
        if (id) {
          StorageService.deleteAlarm(id);
          const list = view.querySelector('#alarms-items-list');
          if (list) list.innerHTML = this.renderAlarmsList(StorageService.getAlarms());
          this.bindAlarmItemEvents(view);
        }
      });
    });
  }

  private static startClockUpdater(view: HTMLElement): void {
    if (this.clockInterval) clearInterval(this.clockInterval);

    const updateClock = () => {
      const now = new Date();
      const clockEl = view.querySelector('#live-clock-digits');
      const dateEl = view.querySelector('#live-clock-date');

      if (clockEl) {
        clockEl.textContent = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      }

      if (dateEl) {
        const formattedDate = now.toLocaleDateString('es-ES', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        });
        dateEl.textContent = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
      }
    };

    updateClock();
    this.clockInterval = window.setInterval(updateClock, 1000);
  }

  private static formatStopwatchTime(ms: number): string {
    const totalSecs = Math.floor(ms / 1000);
    const hours = Math.floor(totalSecs / 3600);
    const minutes = Math.floor((totalSecs % 3600) / 60);
    const seconds = totalSecs % 60;
    const hStr = String(hours).padStart(2, '0');
    const mStr = String(minutes).padStart(2, '0');
    const sStr = String(seconds).padStart(2, '0');
    return `${hStr}:${mStr}:${sStr}`;
  }
}