"use client";

import { Icon } from "app/shared/Icon";
import { ChangeEvent, Dispatch, SetStateAction, useEffect, useRef } from "react";
import styles from "./searchBar.module.css";

interface SearchBarProps {
  searchQuery: string;
  setSearchQuery: Dispatch<SetStateAction<string>>;
  isExpanded: boolean;
  setIsExpanded: Dispatch<SetStateAction<boolean>>;
}

const SearchBar = ({
  searchQuery,
  setSearchQuery,
  isExpanded,
  setIsExpanded,
}: SearchBarProps) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isExpanded && inputRef.current) {
      // Small delay to allow the DOM to update before focusing
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }, [isExpanded]);

  const handleExpand = () => {
    setIsExpanded(true);
  };

  const handleClose = () => {
    setSearchQuery("");
    setIsExpanded(false);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  return (
    <div className={`${styles.searchBar} ${isExpanded ? styles.expanded : ""}`}>
      {isExpanded ? (
        <div className={styles.inputContainer}>
          <Icon iconName="search" size={20} />
          <input
            ref={inputRef}
            type="search"
            enterKeyHint="search"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            className={styles.searchInput}
            placeholder="Search items..."
            value={searchQuery}
            onChange={handleChange}
          />
          <button className={styles.closeButton} onClick={handleClose}>
            <Icon iconName="close" size={20} />
          </button>
        </div>
      ) : (
        <button className={styles.searchButton} onClick={handleExpand}>
          <Icon iconName="search" style="filled" size={24} />
        </button>
      )}
    </div>
  );
};

export { SearchBar };
