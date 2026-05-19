import { createContext, useCallback, useContext, useMemo, useRef, type PropsWithChildren } from "react";

type ShortcutAction = (() => void) | null;

interface ShortcutActionsContextValue {
  registerNewItemAction: (action: ShortcutAction) => void;
  registerEditAction: (action: ShortcutAction) => void;
  triggerNewItemAction: () => void;
  triggerEditAction: () => void;
}

const noop = () => {};

const ShortcutActionsContext = createContext<ShortcutActionsContextValue>({
  registerNewItemAction: noop,
  registerEditAction: noop,
  triggerNewItemAction: noop,
  triggerEditAction: noop,
});

export function ShortcutActionsProvider({ children }: PropsWithChildren) {
  const newItemActionRef = useRef<ShortcutAction>(null);
  const editActionRef = useRef<ShortcutAction>(null);

  const registerNewItemAction = useCallback((action: ShortcutAction) => {
    newItemActionRef.current = action;
  }, []);

  const registerEditAction = useCallback((action: ShortcutAction) => {
    editActionRef.current = action;
  }, []);

  const triggerNewItemAction = useCallback(() => {
    newItemActionRef.current?.();
  }, []);

  const triggerEditAction = useCallback(() => {
    editActionRef.current?.();
  }, []);

  const value = useMemo(
    () => ({
      registerNewItemAction,
      registerEditAction,
      triggerNewItemAction,
      triggerEditAction,
    }),
    [registerEditAction, registerNewItemAction, triggerEditAction, triggerNewItemAction],
  );

  return <ShortcutActionsContext.Provider value={value}>{children}</ShortcutActionsContext.Provider>;
}

export function useShortcutActions() {
  return useContext(ShortcutActionsContext);
}
