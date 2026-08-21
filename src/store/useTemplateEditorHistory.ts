// useTemplateEditorHistory — POS-PRINT-001
// Hook للاكتتاب على history stack من zundo temporal middleware.
// يعيد canUndo/canRedo + undo/redo/clear، ويعيد re-render عند تغير طول past/future.
import { useStore } from 'zustand';
import { useTemplateEditorStore } from './templateEditorStore';

export interface TemplateEditorHistory {
  canUndo: boolean;
  canRedo: boolean;
  pastLength: number;
  futureLength: number;
  undo: () => void;
  redo: () => void;
  clear: () => void;
}

/**
 * Hook للاكتتاب على history stack خارج React context (vanilla temporal store).
 * يعيد re-render عند تغير طول past/future، لكن ليس بعد كل undo/redo
 * (المكوّن الرئيسي يشترك مباشرة في حالة الـ store الأساسية).
 */
export function useTemplateEditorHistory(): TemplateEditorHistory {
  const pastLength = useStore(useTemplateEditorStore.temporal, (s) => s.pastStates.length);
  const futureLength = useStore(useTemplateEditorStore.temporal, (s) => s.futureStates.length);
  const undo = useStore(useTemplateEditorStore.temporal, (s) => s.undo);
  const redo = useStore(useTemplateEditorStore.temporal, (s) => s.redo);
  const clear = useStore(useTemplateEditorStore.temporal, (s) => s.clear);

  return {
    canUndo: pastLength > 0,
    canRedo: futureLength > 0,
    pastLength,
    futureLength,
    undo: () => undo(),
    redo: () => redo(),
    clear,
  };
}
