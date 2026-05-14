import { useEffect } from "react";

interface UseTypeToSearchOptions {
  searchInputRef: React.RefObject<HTMLInputElement>;
  search: string;
  onSearchChange: (value: string) => void;
}

export function useTypeToSearch({ searchInputRef, search, onSearchChange }: UseTypeToSearchOptions) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName.toLowerCase();
      const isEditing =
        tagName === "input" ||
        tagName === "textarea" ||
        tagName === "select" ||
        tagName === "button" ||
        target?.isContentEditable;

      if (event.key === "Escape" && search) {
        event.preventDefault();
        onSearchChange("");
        searchInputRef.current?.focus();
        return;
      }

      if (isEditing || event.metaKey || event.ctrlKey || event.altKey || event.key.length !== 1) return;

      onSearchChange(search + event.key);
      requestAnimationFrame(() => searchInputRef.current?.focus());
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onSearchChange, search, searchInputRef]);
}
