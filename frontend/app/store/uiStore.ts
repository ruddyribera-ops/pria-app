// Zustand store for UI state management
import { create } from 'zustand';

interface UIStore {
  // Modal states
  isAdaptationModalOpen: boolean;
  isContentEditorOpen: boolean;
  isProfileSelectorOpen: boolean;
  selectedAdaptationId: number | null;

  // Panel states
  showUnitsPanel: boolean;
  showAdaptationPanel: boolean;
  expandedUnitId: string | null;

  // Actions - Modals
  openAdaptationModal: (adaptationId: number) => void;
  closeAdaptationModal: () => void;
  openContentEditor: () => void;
  closeContentEditor: () => void;
  openProfileSelector: () => void;
  closeProfileSelector: () => void;

  // Actions - Panels
  toggleUnitsPanel: () => void;
  toggleAdaptationPanel: () => void;
  setExpandedUnit: (unitId: string | null) => void;

  // Reset
  resetUI: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
  // Initial state
  isAdaptationModalOpen: false,
  isContentEditorOpen: false,
  isProfileSelectorOpen: false,
  selectedAdaptationId: null,

  showUnitsPanel: true,
  showAdaptationPanel: false,
  expandedUnitId: null,

  // Modal actions
  openAdaptationModal: (adaptationId) => {
    set({
      isAdaptationModalOpen: true,
      selectedAdaptationId: adaptationId,
    });
  },

  closeAdaptationModal: () => {
    set({
      isAdaptationModalOpen: false,
      selectedAdaptationId: null,
    });
  },

  openContentEditor: () => {
    set({ isContentEditorOpen: true });
  },

  closeContentEditor: () => {
    set({ isContentEditorOpen: false });
  },

  openProfileSelector: () => {
    set({ isProfileSelectorOpen: true });
  },

  closeProfileSelector: () => {
    set({ isProfileSelectorOpen: false });
  },

  // Panel actions
  toggleUnitsPanel: () => {
    set((state) => ({ showUnitsPanel: !state.showUnitsPanel }));
  },

  toggleAdaptationPanel: () => {
    set((state) => ({ showAdaptationPanel: !state.showAdaptationPanel }));
  },

  setExpandedUnit: (unitId) => {
    set({ expandedUnitId: unitId });
  },

  // Reset
  resetUI: () => {
    set({
      isAdaptationModalOpen: false,
      isContentEditorOpen: false,
      isProfileSelectorOpen: false,
      selectedAdaptationId: null,
      showUnitsPanel: true,
      showAdaptationPanel: false,
      expandedUnitId: null,
    });
  },
}));
