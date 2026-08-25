// src/app.ts
import { HomeView } from './views/HomeView';
import { FlowEditorView } from './views/FlowEditorView';
import { ActiveTimerView } from './views/ActiveTimerView';
import { LiveTimerView } from './views/LiveTimerView';
import { CalendarView } from './views/CalendarView';
import { OnboardingView } from './views/OnboardingView';
import { StorageService } from './services/storage.service';
import { ModalService } from './services/modal.service';
import { TauriService } from './services/tauri.service';
import { FlowRunnerService } from './services/flow-runner.service';
import { UI_ICONS, BLOCK_ICONS_SVG } from './utils/icons';
import { formatTimerSeconds } from './utils/format';
import { ToolsView } from './views/ToolsView';
import { AlarmService } from './services/alarm.service';

export type Route = 'home' | 'flow-editor' | 'active-timer' | 'live-timer' | 'calendar' | 'tools' | 'onboarding';

export class AppRouter {
  private appElement: HTMLElement;
  private currentRoute: Route = 'home';
  private currentParams: Record<string, unknown> = {};

  constructor(appElement: HTMLElement) {
    this.appElement = appElement;
  }

  init(): void {
    AlarmService.init(); //  Inicia el monitor de alarmas en segundo plano
    const user = StorageService.getUser();
    if (!user) {
      this.navigate('onboarding');
    } else {
      this.navigate('home');
    }
  }

  navigate(route: Route, params: Record<string, unknown> = {}): void {
    document.querySelectorAll('.custom-modal-overlay').forEach(el => el.remove());
    this.currentRoute = route;
    this.currentParams = params;
    this.renderLayout(params);
  }

  refreshCurrentRoute(): void {
    this.navigate(this.currentRoute, this.currentParams);
  }

  private renderLayout(params: Record<string, unknown> = {}): void {
    this.appElement.innerHTML = '';

    const user = StorageService.getUser();
    if (!user && this.currentRoute !== 'onboarding') {
      this.currentRoute = 'onboarding';
    }

    if (this.currentRoute === 'active-timer') {
      const viewContent = this.getViewElement(this.currentRoute, params);
      this.appElement.appendChild(viewContent);
      return;
    }

    const userName = user ? user.name : 'Usuario';
    const greeting = this.getGreetingByTime();
    const isBusy = FlowRunnerService.isBusy();

    const layout = document.createElement('div');
    layout.className = 'app-root-shell';

    layout.innerHTML = `
      <!-- BARRA SUPERIOR -->
      <header class="system-titlebar" data-tauri-drag-region="true">
        <div class="titlebar-left" data-tauri-drag-region="true">
          <button class="titlebar-burger-btn" id="btn-toggle-sidebar" title="Menú lateral">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>

          <div class="titlebar-app-identity" data-tauri-drag-region="true">
            <svg class="titlebar-logo-svg" width="16" height="16" viewBox="0 0 160 160">
              <circle cx="80" cy="80" r="70" fill="#141418" stroke="#1c1c22" stroke-width="4"/>
              <path d="M 80 15 A 65 65 0 0 1 133.24 117.28 L 108.67 100.08 A 35 35 0 0 0 80 45 Z" fill="#9b7e47"/>
              <path d="M 133.24 117.28 A 65 65 0 0 1 42.72 133.24 L 59.92 108.67 A 35 35 0 0 0 108.67 100.08 Z" fill="#406371"/>
              <path d="M 42.72 133.24 A 65 65 0 0 1 17.21 63.18 L 46.19 70.94 A 35 35 0 0 0 59.92 108.67 Z" fill="#4a7051"/>
              <path d="M 17.21 63.18 A 65 65 0 0 1 80 15 L 80 45 A 35 35 0 0 0 46.19 70.94 Z" fill="#7d4b4e"/>
              <circle cx="80" cy="80" r="35" fill="#0f0f13"/>
              <path d="M 77.5 80 L 79.2 24 A 1 1 0 0 1 81.5 24 L 82.5 80 Z" fill="#bfa05d"/>
              <circle cx="80" cy="80" r="6" fill="#bfa05d"/>
            </svg>
            <span class="titlebar-title-text" data-tauri-drag-region="true">Focus Flow</span>
          </div>
        </div>

        <div class="titlebar-drag-spacer" data-tauri-drag-region="true"></div>

        <div class="system-window-buttons">
          <button class="sys-btn" id="sys-win-min" title="Minimizar">
            <svg width="10" height="1" viewBox="0 0 10 1"><line x1="0" y1="0.5" x2="10" y2="0.5" stroke="currentColor" stroke-width="1"/></svg>
          </button>
          <button class="sys-btn" id="sys-win-max" title="Maximizar">
            <svg width="10" height="10" viewBox="0 0 10 10"><rect x="0.5" y="0.5" width="9" height="9" fill="none" stroke="currentColor" stroke-width="1"/></svg>
          </button>
          <button class="sys-btn sys-close" id="sys-win-close" title="Cerrar">
            <svg width="10" height="10" viewBox="0 0 10 10">
              <line x1="0" y1="0" x2="10" y2="10" stroke="currentColor" stroke-width="1.1"/>
              <line x1="10" y1="0" x2="0" y2="10" stroke="currentColor" stroke-width="1.1"/>
            </svg>
          </button>
        </div>
      </header>

      <!-- LAYOUT PRINCIPAL -->
      <div class="app-layout">
        <div class="sidebar-backdrop" id="sidebar-backdrop"></div>
        
        <aside class="sidebar" id="app-sidebar">
          <div class="sidebar-top-group">
            <nav class="sidebar-menu">
              <button class="nav-item ${this.currentRoute === 'home' ? 'active' : ''}" data-route="home">
                <span>-</span> Inicio
              </button>
              <button class="nav-item ${this.currentRoute === 'flow-editor' ? 'active' : ''}" data-route="flow-editor">
                <span>-</span> Nuevo flujo
              </button>
              
              <!-- Botón Cronómetro con clase condicional si hay flujo en ejecución -->
              <button 
                class="nav-item ${this.currentRoute === 'live-timer' ? 'active' : ''} ${isBusy ? 'nav-disabled' : ''}" 
                data-route="live-timer"
                title="${isBusy ? 'Bloqueado: hay una secuencia en marcha' : ''}"
              >
                <span>-</span> Cronómetro ${isBusy ? '<span class="nav-lock-badge"> </span>' : ''}
              </button>
              <button class="nav-item ${this.currentRoute === 'tools' ? 'active' : ''}" data-route="tools">
                <span>-</span> Herramientas
              </button>

              <button class="nav-item ${this.currentRoute === 'calendar' ? 'active' : ''}" data-route="calendar">
                <span>-</span> Calendario
              </button>
            </nav>
          </div>

          <div class="sidebar-user-card">
            <div class="sidebar-user-info">
              <span class="sidebar-user-greeting">${greeting}</span>
              <span class="sidebar-user-name" title="${userName}">${userName}</span>
            </div>
            <button class="icon-btn btn-edit-user-sidebar" id="btn-edit-user-sidebar" title="Editar nombre">
              ${UI_ICONS.edit}
            </button>
          </div>
        </aside>

        <main class="main-viewport" id="route-container"></main>

        <!-- WIDGET DE ESQUINA -->
        <div id="corner-running-widget" class="corner-flow-widget" style="display: none;"></div>
      </div>
    `;

    const routeContainer = layout.querySelector('#route-container') as HTMLElement;
    routeContainer.appendChild(this.getViewElement(this.currentRoute, params));

    this.bindEvents(layout);
    this.appElement.appendChild(layout);
  }

  private bindEvents(layout: HTMLElement): void {
    // 1. Controles de Ventana
    layout.querySelector('#sys-win-min')?.addEventListener('click', () => TauriService.minimize());
    layout.querySelector('#sys-win-max')?.addEventListener('click', () => TauriService.toggleMaximize());
    layout.querySelector('#sys-win-close')?.addEventListener('click', () => TauriService.close());

    const titlebar = layout.querySelector('.system-titlebar') as HTMLElement;
   
    titlebar?.addEventListener('mousedown', (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest('button')) return;
      if (e.button === 0) TauriService.startDragging();
    });

    titlebar?.addEventListener('dblclick', (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest('button')) return;
      TauriService.toggleMaximize();
    });

    // 2. Control de Sidebar
    const sidebar = layout.querySelector('#app-sidebar') as HTMLElement;
    const backdrop = layout.querySelector('#sidebar-backdrop') as HTMLElement;
    const toggleBtn = layout.querySelector('#btn-toggle-sidebar');

    const toggleSidebar = () => {
      const isOpen = sidebar.classList.toggle('open');
      if (isOpen) {
        backdrop.classList.add('active');
      } else {
        backdrop.classList.remove('active');
      }
    };

    toggleBtn?.addEventListener('click', toggleSidebar);
    backdrop?.addEventListener('click', toggleSidebar);

    // 3. Navegación fluida (Sin modales invasivos)
    const cornerWidget = layout.querySelector('#corner-running-widget') as HTMLElement;
FlowRunnerService.subscribe(() => {
      const status = FlowRunnerService.getStatus();
      if (!status || this.currentRoute === 'active-timer') {
        if (cornerWidget) cornerWidget.style.display = 'none';
        return;
      }

      if (cornerWidget) {
        cornerWidget.style.display = 'flex';
        cornerWidget.className = `corner-flow-widget ${status.currentBlock.type.toLowerCase()}`;
        cornerWidget.innerHTML = `
          <div class="corner-info-col">
            <span class="corner-flow-name" title="${status.flowName}">${status.flowName}</span>
            <div class="corner-time-row">
              ${BLOCK_ICONS_SVG[status.currentBlock.type]}
              <span class="corner-timer-digits">${formatTimerSeconds(status.secondsRemaining)}</span>
            </div>
          </div>

          <div class="corner-actions-group">
            <button class="corner-btn-action" id="btn-corner-expand" title="Abrir widget flotante">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="15 3 21 3 21 9"></polyline>
                <polyline points="9 21 3 21 3 15"></polyline>
                <line x1="21" y1="3" x2="14" y2="10"></line>
                <line x1="3" y1="21" x2="10" y2="14"></line>
              </svg>
            </button>

            <button class="corner-btn-action close" id="btn-corner-close" title="Cancelar flujo">
              ${UI_ICONS.close}
            </button>
          </div>
        `;

        // Expandir a mini-widget
        cornerWidget.querySelector('#btn-corner-expand')?.addEventListener('click', (e) => {
          e.stopPropagation();
          this.navigate('active-timer');
        });

        // Cancelar y cerrar flujo directamente desde la esquina
        cornerWidget.querySelector('#btn-corner-close')?.addEventListener('click', (e) => {
          e.stopPropagation();
          FlowRunnerService.stopFlow();
        });
      }
    });

    layout.querySelectorAll('.nav-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const route = (e.currentTarget as HTMLElement).getAttribute('data-route') as Route;

        // Si intenta entrar a cronómetro mientras hay flujo activo, simplemente no navega
        if (route === 'live-timer' && FlowRunnerService.isBusy()) {
          return;
        }

        sidebar.classList.remove('open');
        backdrop.classList.remove('active');
        if (route) this.navigate(route);
      });
    });

    // 4. Edición de usuario
    layout.querySelector('#btn-edit-user-sidebar')?.addEventListener('click', async (e) => {
      e.stopPropagation();
      const currentUser = StorageService.getUser();
      const currentName = currentUser ? currentUser.name : 'Usuario';
      
      const newName = await ModalService.prompt(
        'Nombre de usuario',
        'Ingresa tu nuevo nombre o apodo (máx 20 letras):',
        currentName,
        UI_ICONS.edit,
        'text',
        20
      );

      if (newName !== null && newName.trim() !== '') {
        StorageService.saveUser(newName.trim().slice(0, 20));
        this.refreshCurrentRoute();
      }
    });

    // 5. Suscripción del Widget de Esquina
    FlowRunnerService.subscribe(() => {
      const status = FlowRunnerService.getStatus();
      if (!status || this.currentRoute === 'active-timer') {
        if (cornerWidget) cornerWidget.style.display = 'none';
        return;
      }

      if (cornerWidget) {
        cornerWidget.style.display = 'flex';
        cornerWidget.className = `corner-flow-widget ${status.currentBlock.type.toLowerCase()}`;
        cornerWidget.innerHTML = `
          <div class="corner-info-col">
            <span class="corner-flow-name">${status.flowName}</span>
            <div class="corner-time-row">
              ${BLOCK_ICONS_SVG[status.currentBlock.type]}
              <span class="corner-timer-digits">${formatTimerSeconds(status.secondsRemaining)}</span>
            </div>
          </div>
          <button class="corner-btn-expand" id="btn-corner-expand" title="Abrir widget flotante">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="15 3 21 3 21 9"></polyline>
              <polyline points="9 21 3 21 3 15"></polyline>
              <line x1="21" y1="3" x2="14" y2="10"></line>
              <line x1="3" y1="21" x2="10" y2="14"></line>
            </svg>
          </button>
        `;

        cornerWidget.querySelector('#btn-corner-expand')?.addEventListener('click', () => {
          this.navigate('active-timer');
        });
      }
    });
  }
  

  private getViewElement(route: Route, params: Record<string, unknown>): HTMLElement {
    switch (route) {
      case 'home':
        return HomeView.render(this);
      case 'flow-editor':
        return FlowEditorView.render(this, params);
      case 'active-timer':
        return ActiveTimerView.render(this, params);
      case 'live-timer':
        return LiveTimerView.render(this);
      case 'calendar':
        return CalendarView.render(this);
      case 'onboarding':
        return OnboardingView.render(this);
      case 'tools':
        return ToolsView.render(this);
      default:
        return HomeView.render(this);
    }
  }

  private getGreetingByTime(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'BUENOS DÍAS';
    if (hour < 19) return 'BUENAS TARDES';
    return 'BUENAS NOCHES';
  }
}