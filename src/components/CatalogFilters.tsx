'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface CatalogFiltersProps {
  categories: string[];
}

export default function CatalogFilters({ categories }: CatalogFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Read initial states from URL
  const currentQuery = searchParams.get('query') || '';
  const currentCategory = searchParams.get('category') || 'All';
  const currentSort = searchParams.get('sortBy') || 'default';
  const currentMinPrice = searchParams.get('minPrice') || '';
  const currentMaxPrice = searchParams.get('maxPrice') || '';

  const [query, setQuery] = useState(currentQuery);
  const [minPrice, setMinPrice] = useState(currentMinPrice);
  const [maxPrice, setMaxPrice] = useState(currentMaxPrice);

  // Sync state if URL changes directly
  useEffect(() => {
    setQuery(currentQuery);
  }, [currentQuery]);

  const updateFilters = (updates: {
    query?: string;
    category?: string;
    sortBy?: string;
    minPrice?: string;
    maxPrice?: string;
    clearAll?: boolean;
  }) => {
    const params = new URLSearchParams(searchParams.toString());

    if (updates.clearAll) {
      router.push('/');
      setQuery('');
      setMinPrice('');
      setMaxPrice('');
      return;
    }

    if (updates.query !== undefined) {
      if (updates.query) params.set('query', updates.query);
      else params.delete('query');
    }

    if (updates.category !== undefined) {
      if (updates.category !== 'All') params.set('category', updates.category);
      else params.delete('category');
    }

    if (updates.sortBy !== undefined) {
      if (updates.sortBy !== 'default') params.set('sortBy', updates.sortBy);
      else params.delete('sortBy');
    }

    if (updates.minPrice !== undefined) {
      if (updates.minPrice) params.set('minPrice', updates.minPrice);
      else params.delete('minPrice');
    }

    if (updates.maxPrice !== undefined) {
      if (updates.maxPrice) params.set('maxPrice', updates.maxPrice);
      else params.delete('maxPrice');
    }

    router.push(`/?${params.toString()}`);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters({ query });
  };

  const handlePriceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters({ minPrice, maxPrice });
  };

  const hasActiveFilters = currentQuery || currentCategory !== 'All' || currentSort !== 'default' || currentMinPrice || currentMaxPrice;

  return (
    <div className="catalog-filters-section">
      {/* Search Bar Form */}
      <form onSubmit={handleSearchSubmit} className="search-form">
        <div className="search-input-wrapper">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="search-icon">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="text"
            placeholder="Search products, brands, categories..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="search-input"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                updateFilters({ query: '' });
              }}
              className="search-clear-btn"
            >
              &times;
            </button>
          )}
        </div>
        <button type="submit" className="btn btn-primary">Search</button>
      </form>

      {/* Category Tabs & Sorting Row */}
      <div className="filters-row">
        <div className="categories-tabs">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => updateFilters({ category: cat })}
              className={`category-tab-btn ${currentCategory === cat ? 'active' : ''}`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="sort-select-wrapper">
          <label htmlFor="sort-by" className="sort-label">Sort by</label>
          <select
            id="sort-by"
            value={currentSort}
            onChange={(e) => updateFilters({ sortBy: e.target.value })}
            className="sort-select"
          >
            <option value="default">Featured</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="rating">Top Rated</option>
          </select>
        </div>
      </div>

      {/* Price Range & Clear Filters Row */}
      <div className="extra-filters-row">
        <form onSubmit={handlePriceSubmit} className="price-filter-form">
          <span className="price-filter-title">Price Range</span>
          <input
            type="number"
            placeholder="Min"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            className="price-input"
            min="0"
          />
          <span className="price-dash">&mdash;</span>
          <input
            type="number"
            placeholder="Max"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            className="price-input"
            min="0"
          />
          <button type="submit" className="btn btn-secondary btn-sm">Apply</button>
        </form>

        {hasActiveFilters && (
          <button
            onClick={() => updateFilters({ clearAll: true })}
            className="clear-filters-btn"
          >
            Reset All Filters
          </button>
        )}
      </div>
    </div>
  );
}
