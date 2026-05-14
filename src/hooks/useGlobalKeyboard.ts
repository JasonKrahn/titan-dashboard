import { useEffect, useRef, useCallback } from "react";

interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  callback: () => void;
  description?: string;
}

interface KeySequenceShortcut {
  sequence: string[];
  callback: () => void;
  description?: string;
}

export function useGlobalKeyboard(
  shortcuts: KeyboardShortcut[],
  keySequences?: KeySequenceShortcut[]
) {
  const sequenceBufferRef = useRef<string[]>([]);
  const sequenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isDesktopViewport = () => {
    return typeof window !== 'undefined' && window.innerWidth >= 768;
  };

  const isTypingInInput = () => {
    const activeElement = document.activeElement as HTMLElement | null;
    if (!activeElement) return false;
    const tagName = activeElement.tagName.toLowerCase();
    return tagName === 'input' || tagName === 'textarea' || activeElement.isContentEditable;
  };

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!isDesktopViewport()) return;
    if (isTypingInInput()) return;

    // Check single key shortcuts
    for (const shortcut of shortcuts) {
      const matchesKey = event.key === shortcut.key;
      const matchesCtrl = shortcut.ctrlKey ? event.ctrlKey || event.metaKey : !event.ctrlKey && !event.metaKey;
      const matchesMeta = shortcut.metaKey ? event.metaKey : !event.metaKey;
      const matchesShift = shortcut.shiftKey ? event.shiftKey : !event.shiftKey;

      if (matchesKey && matchesCtrl && matchesMeta && matchesShift) {
        event.preventDefault();
        shortcut.callback();
        return;
      }
    }

    // Check key sequences
    if (keySequences) {
      const key = event.key.toLowerCase();
      sequenceBufferRef.current.push(key);

      // Clear previous timeout
      if (sequenceTimeoutRef.current) {
        clearTimeout(sequenceTimeoutRef.current);
      }

      // Set new timeout to clear buffer after 1 second
      sequenceTimeoutRef.current = setTimeout(() => {
        sequenceBufferRef.current = [];
      }, 1000);

      // Check if any sequence matches
      for (const seq of keySequences) {
        if (JSON.stringify(sequenceBufferRef.current) === JSON.stringify(seq.sequence)) {
          event.preventDefault();
          seq.callback();
          sequenceBufferRef.current = [];
          if (sequenceTimeoutRef.current) {
            clearTimeout(sequenceTimeoutRef.current);
          }
          return;
        }
      }
    }
  }, [shortcuts, keySequences]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (sequenceTimeoutRef.current) {
        clearTimeout(sequenceTimeoutRef.current);
      }
    };
  }, [handleKeyDown]);
}
