import React, { useState, useRef, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { FaSearch } from "react-icons/fa";
import { useSearch } from "../../hooks/useSearch";
import type { SearchResultItem } from "../../types/types";
import styles from "./SearchBar.module.scss";

const SearchBar: React.FC = () => {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { results, loading } = useSearch(query);

  const flatResults = useMemo(() => {
    if (!results) return [];
    return [
      ...results.artists.map((r) => ({ ...r, type: "artist" as const })),
      ...results.tracks.map((r) => ({ ...r, type: "track" as const })),
      ...results.albums.map((r) => ({ ...r, type: "album" as const })),
    ];
  }, [results]);

  const totalItems = flatResults.length;
  const hasQuery = query.trim().length >= 2;

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reset active index when results change
  useEffect(() => {
    setActiveIndex(-1);
  }, [results]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setIsOpen(true);
  };

  const handleFocus = () => {
    if (hasQuery) setIsOpen(true);
  };

  const closeDropdown = () => {
    setIsOpen(false);
    setActiveIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || totalItems === 0) {
      if (e.key === "Escape") {
        closeDropdown();
        inputRef.current?.blur();
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((prev) => (prev + 1) % totalItems);
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((prev) => (prev - 1 + totalItems) % totalItems);
        break;
      case "Enter":
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < totalItems) {
          const item = flatResults[activeIndex];
          closeDropdown();
          setQuery("");
          window.location.href = `/${item.type}/${item.spotify_id}`;
        }
        break;
      case "Escape":
        closeDropdown();
        inputRef.current?.blur();
        break;
    }
  };

  const handleSelect = () => {
    closeDropdown();
    setQuery("");
  };

  const renderResult = (item: SearchResultItem, index: number) => (
    <Link
      key={`${item.type}-${item.spotify_id}`}
      to={`/${item.type}/${item.spotify_id}`}
      className={`${styles.searchResultItem} ${activeIndex === index ? styles.active : ""}`}
      onClick={handleSelect}
      onMouseEnter={() => setActiveIndex(index)}
    >
      <div
        className={styles.searchResultImage}
        style={
          item.image_url
            ? { backgroundImage: `url(${item.image_url})` }
            : {}
        }
      >
        {!item.image_url && <FaSearch className="text-secondary" />}
      </div>
      <div className={styles.searchResultText}>
        <div className={`${styles.searchResultName} text-truncate`}>{item.name}</div>
        {item.secondary_info && (
          <div className={`${styles.searchResultSecondary} text-truncate`}>
            {item.secondary_info}
          </div>
        )}
      </div>
      <span className={styles.searchResultType}>{item.type}</span>
    </Link>
  );

  const showDropdown = isOpen && hasQuery;

  return (
    <div className={styles.searchContainer} ref={containerRef}>
      <div className={styles.searchInputWrapper}>
        <FaSearch className={styles.searchIcon} />
        <input
          ref={inputRef}
          type="text"
          className={styles.searchInput}
          placeholder="Search tracks, artists, albums..."
          value={query}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
        />
      </div>

      {showDropdown && (
        <div className={styles.searchDropdown}>
          {loading && <div className={styles.searchLoading}>Searching...</div>}
          {!loading && totalItems === 0 && (
            <div className={styles.searchEmpty}>No results found</div>
          )}
          {!loading && flatResults.map((item, i) => renderResult(item, i))}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
