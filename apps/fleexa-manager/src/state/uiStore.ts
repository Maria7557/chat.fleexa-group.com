import { create } from 'zustand';

export type ManagerSection = 'overview' | 'conversations' | 'pipeline' | 'bookings';

interface UiState {
  activeSection: ManagerSection;
  sidebarCollapsed: boolean;
  setActiveSection(section: ManagerSection): void;
  toggleSidebar(): void;
}

export const useUiStore = create<UiState>(set => ({
  activeSection: 'overview',
  sidebarCollapsed: false,
  setActiveSection: section => set({ activeSection: section }),
  toggleSidebar: () => set(state => ({ sidebarCollapsed: !state.sidebarCollapsed })),
}));
