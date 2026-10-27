import { useState, useEffect, useRef } from 'react';
import './ProductCatalogue.css';

const API_URL = import.meta.env.VITE_API_URL;
const PAGE_SIZE = 20;
const DEBOUNCE_MS = 350;
const MIN_SPINNER_MS = 600;

const SORT_OPTIONS = [
  ['newest', 'Newest first'],
  ['price_asc', 'Price: low to high'],
  ['price_desc', 'Price: high to low'],
  ['rating', 'Highest rated'],
  ['name', 'Name: A to Z'],
];

const RATING_STEPS = [4, 3, 2, 1];

const DEFAULT_FILTERS = {
  q: '', category: [], brand: [], minPrice: '', maxPrice: '', minRating: '', inStock: false, sort: 'newest',
};

const TYPED_FIELDS = ['q', 'minPrice', 'maxPrice'];

const CATEGORY_ART = {
  Electronics: ['🎧', '#dbeafe'],
  Fashion: ['👕', '#fce7f3'],
  'Home & Kitchen': ['🍳', '#ffedd5'],
  Books: ['📚', '#ede9fe'],
  Sports: ['🏏', '#dcfce7'],
  Beauty: ['💄', '#ffe4e6'],
  Toys: ['🧸', '#fef9c3'],
  Grocery: ['🛒', '#ecfccb'],
};

const rupees = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const STAR_PATH = 'M10 1.5l2.6 5.5 6 .8-4.4 4.2 1.1 5.9L10 14.9 4.7 17.9l1.1-5.9L1.4 7.8l6-.8z';

function readUrl() {
  const p = new URLSearchParams(window.location.search);
  const list = (k) => (p.get(k) ? p.get(k).split(',').filter(Boolean) : []);
  return {
    filters: {
      q: p.get('q') || '',
      category: list('category'),
      brand: list('brand'),
      minPrice: p.get('minPrice') || '',
      maxPrice: p.get('maxPrice') || '',
      minRating: p.get('minRating') || '',
      inStock: p.get('inStock') === 'true',
      sort: p.get('sort') || 'newest',
    },
    page: Math.max(1, parseInt(p.get('page'), 10) || 1),
  };
}

function toParams(f, page, withLimit = false) {
  const p = new URLSearchParams();
  if (f.q.trim()) p.set('q', f.q.trim());
  if (f.category.length) p.set('category', f.category.join(','));
  if (f.brand.length) p.set('brand', f.brand.join(','));
  if (f.minPrice !== '') p.set('minPrice', f.minPrice);
  if (f.maxPrice !== '') p.set('maxPrice', f.maxPrice);
  if (f.minRating) p.set('minRating', f.minRating);
  if (f.inStock) p.set('inStock', 'true');
  if (f.sort !== 'newest') p.set('sort', f.sort);
  if (page > 1) p.set('page', String(page));
  if (withLimit) p.set('limit', String(PAGE_SIZE));
  return p;
}

function validateFilters(f) {
  const min = f.minPrice === '' ? null : Number(f.minPrice);
  const max = f.maxPrice === '' ? null : Number(f.maxPrice);
  if ((min !== null && (Number.isNaN(min) || min < 0)) || (max !== null && (Number.isNaN(max) || max < 0))) {
    return 'Prices cannot be negative.';
  }
  if (min !== null && max !== null && min > max) return 'Minimum price cannot be higher than maximum price.';
  return '';
}

function getPageList(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) pages.push('...');
  for (let p = start; p <= end; p++) pages.push(p);
  if (end < total - 1) pages.push('...');
  pages.push(total);
  return pages;
}

function Highlight({ text, terms }) {
  if (!terms.length) return text;
  const re = new RegExp(`(${terms.map(escapeRe).join('|')})`, 'gi');
  return text.split(re).map((part, i) => (i % 2 ? <mark key={i}>{part}</mark> : part));
}

function Stars({ value }) {
  return (
    <span className="rating" aria-label={`Rated ${value} out of 5`}>
      <svg viewBox="0 0 20 20" width="13" height="13" aria-hidden="true">
        <path fill="currentColor" d={STAR_PATH} />
      </svg>
      {Number(value).toFixed(1)}
    </span>
  );
}

function StarRow({ filled }) {
  return (
    <span className="star-row" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((n) => (
        <svg key={n} viewBox="0 0 20 20" width="16" height="16" className={n <= filled ? 'on' : 'off'}>
          <path fill="currentColor" d={STAR_PATH} />
        </svg>
      ))}
    </span>
  );
}

function ProductImage({ p }) {
  const [failed, setFailed] = useState(false);
  const [icon, tint] = CATEGORY_ART[p.category] || ['📦', '#e5e7eb'];
  const hasImage = p.imageUrl && !p.imageUrl.startsWith('placeholder://') && !failed;
  return hasImage ? (
    <img src={p.imageUrl} alt={p.name} loading="lazy" onError={() => setFailed(true)} />
  ) : (
    <div className="art" style={{ background: tint }} role="img" aria-label={p.name}>
      <span>{icon}</span>
    </div>
  );
}

function ProductCard({ p, terms }) {
  return (
    <article className="card">
      <div className="image-box">
        <ProductImage p={p} />
        <Stars value={p.rating} />
        {!p.inStock && <span className="stock-tag">Out of stock</span>}
      </div>
      <div className="card-body">
        <p className="meta"><Highlight text={p.brand} terms={terms} /> · <Highlight text={p.category} terms={terms} /></p>
        <h3 className="name" title={p.name}><Highlight text={p.name} terms={terms} /></h3>
        <p className="desc"><Highlight text={p.description} terms={terms} /></p>
        <div className="price-row">
          <span className="price">{rupees.format(Number(p.price))}</span>
          <span className={`avail ${p.inStock ? 'in' : 'out'}`}>
            {p.inStock ? (p.stockQty < 10 ? `Only ${p.stockQty} left` : 'In stock') : 'Unavailable'}
          </span>
        </div>
        <p className="sku">SKU <Highlight text={p.sku} terms={terms} /></p>
      </div>
    </article>
  );
}

function Loader() {
  return (
    <div className="loader" role="status" aria-live="polite">
      <div className="spinner" aria-hidden="true" />
      <p>Loading products…</p>
    </div>
  );
}

function CheckList({ id, title, options, selected, onToggle, limit = 6 }) {
  const [expanded, setExpanded] = useState(false);
  const canCollapse = options.length > limit;
  const visible = expanded || !canCollapse
    ? options
    : options.filter((o, i) => i < limit || selected.includes(o.name));
  const hidden = options.length - visible.length;

  return (
    <div className="group" role="group" aria-labelledby={`${id}-title`}>
      <h3 className="group-title" id={`${id}-title`}>{title}</h3>
      <div className="checks">
        {visible.map((o) => (
          <label key={o.name} className="check">
            <input type="checkbox" checked={selected.includes(o.name)} onChange={() => onToggle(o.name)} />
            <span>{o.name}</span>
            <small>{o.count}</small>
          </label>
        ))}
      </div>
      {canCollapse && (expanded || hidden > 0) && (
        <button type="button" className="more" onClick={() => setExpanded((v) => !v)} aria-expanded={expanded}>
          {expanded ? 'Show less' : `Show ${hidden} more`}
        </button>
      )}
    </div>
  );
}

function RatingFilter({ value, onChange }) {
  return (
    <div className="group" role="group" aria-labelledby="f-rating-title">
      <h3 className="group-title" id="f-rating-title">Customer ratings</h3>
      <div className="rating-list" role="radiogroup" aria-labelledby="f-rating-title">
        {RATING_STEPS.map((n) => {
          const active = String(value) === String(n);
          return (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={active}
              className={active ? 'rate-opt on' : 'rate-opt'}
              onClick={() => onChange(active ? '' : String(n))}
            >
              <StarRow filled={n} />
              <span className="rate-text">{n}★ &amp; up</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

const ProductCatalogue = () => {
  const initial = useRef(readUrl()).current;
  const headerRef = useRef(null);
  const loaderSince = useRef(Date.now());
  const [state, setState] = useState(initial);
  const [applied, setApplied] = useState(initial);
  const [options, setOptions] = useState({ categories: [], brands: [] });
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [fuzzy, setFuzzy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(true);
  const [error, setError] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggest, setShowSuggest] = useState(false);
  const [drawer, setDrawer] = useState(false);

  const { filters, page } = state;
  const priceError = validateFilters(filters);

  const pending = JSON.stringify(state) !== JSON.stringify(applied);
  const busy = loading || pending;
  const isLoading = busy || showLoader;

  useEffect(() => {
    if (busy) {
      if (!showLoader) loaderSince.current = Date.now();
      setShowLoader(true);
      return undefined;
    }
    const wait = Math.max(0, MIN_SPINNER_MS - (Date.now() - loaderSince.current));
    const t = setTimeout(() => setShowLoader(false), wait);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy]);

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return undefined;
    const set = () => document.documentElement.style.setProperty('--header-h', `${el.offsetHeight}px`);
    set();
    const ro = new ResizeObserver(set);
    ro.observe(el);
    window.addEventListener('resize', set);
    return () => { ro.disconnect(); window.removeEventListener('resize', set); };
  }, []);

  useEffect(() => {
    if (!drawer) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [drawer]);

  useEffect(() => {
    fetch(`${API_URL}/api/products/filters`).then((r) => r.json()).then(setOptions).catch(() => {});
  }, []);

  useEffect(() => {
    const typing = TYPED_FIELDS.some((k) => state.filters[k] !== applied.filters[k]);
    if (!typing) { setApplied(state); return undefined; }
    const t = setTimeout(() => setApplied(state), DEBOUNCE_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  useEffect(() => {
    const msg = validateFilters(applied.filters);
    if (msg) { setError(msg); setLoading(false); return undefined; }

    const controller = new AbortController();
    setLoading(true);
    setError('');
    window.history.replaceState(null, '', `?${toParams(applied.filters, applied.page)}`);

    fetch(`${API_URL}/api/products?${toParams(applied.filters, applied.page, true)}`, { signal: controller.signal })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.details?.join(' ') || body.error || 'Could not load products');
        return body;
      })
      .then((body) => {
        if (controller.signal.aborted) return;
        setProducts(body.data);
        setPagination(body.pagination);
        setFuzzy(body.fuzzy);
        setLoading(false);
      })
      .catch((err) => {
        if (err.name === 'AbortError') return;
        setError(err.message || 'Could not load products');
        setLoading(false);
      });

    return () => controller.abort();
  }, [applied]);

  useEffect(() => {
    const q = filters.q.trim();
    if (q.length < 2 || !showSuggest) { setSuggestions([]); return undefined; }
    const controller = new AbortController();
    const t = setTimeout(() => {
      fetch(`${API_URL}/api/products/suggest?q=${encodeURIComponent(q)}`, { signal: controller.signal })
        .then((r) => r.json())
        .then((b) => setSuggestions(b.suggestions || []))
        .catch(() => {});
    }, 250);
    return () => { clearTimeout(t); controller.abort(); };
  }, [filters.q, showSuggest]);

  // FIX: use functional updates so `filters` in the closure is always fresh
  const update = (patch) => setState((s) => ({ filters: { ...s.filters, ...patch }, page: 1 }));

  const toggle = (key, value) => setState((s) => {
    const list = Array.isArray(s.filters[key]) ? s.filters[key] : [];
    const next = list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
    return { filters: { ...s.filters, [key]: next }, page: 1 };
  });

  const clearAll = () => setState({ filters: { ...DEFAULT_FILTERS }, page: 1 });

  const goToPage = (p) => {
    setState((s) => ({ ...s, page: p }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // FIX: build chips from the latest `filters` (they always recompute on render)
  const chips = [];
  filters.category.forEach((c) => chips.push({ label: c, remove: () => toggle('category', c) }));
  filters.brand.forEach((b) => chips.push({ label: b, remove: () => toggle('brand', b) }));
  if (filters.minPrice !== '') chips.push({ label: `Min ${rupees.format(Number(filters.minPrice) || 0)}`, remove: () => update({ minPrice: '' }) });
  if (filters.maxPrice !== '') chips.push({ label: `Max ${rupees.format(Number(filters.maxPrice) || 0)}`, remove: () => update({ maxPrice: '' }) });
  if (filters.minRating) chips.push({ label: `${filters.minRating}★ & up`, remove: () => update({ minRating: '' }) });
  if (filters.inStock) chips.push({ label: 'In stock only', remove: () => update({ inStock: false }) });

  const hasFilters = chips.length > 0 || filters.q !== '' || filters.sort !== 'newest';

  const terms = applied.filters.q.trim().split(/\s+/).filter(Boolean);
  const from = (applied.page - 1) * PAGE_SIZE + 1;
  const to = Math.min(applied.page * PAGE_SIZE, pagination.total);

  let countText;
  if (error) countText = 'No products to show';
  else if (isLoading) countText = 'Loading products…';
  else if (pagination.total === 0) countText = 'No products to show';
  else countText = `Showing ${from}–${to} of ${pagination.total} products`;

  return (
    <div className="page">
      <header className="header" ref={headerRef}>
        <div className="header-inner">
          <div className="brand-mark">
            <span className="logo" aria-hidden="true">S</span>
            <h1>Smart Catalogue</h1>
          </div>
          <div className="search">
            <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
              <path fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" d="M8.5 15a6.5 6.5 0 1 1 0-13 6.5 6.5 0 0 1 0 13zm5-1.5L18 18" />
            </svg>
            <input
              type="search"
              value={filters.q}
              placeholder="Search name, brand, category or SKU"
              aria-label="Search products"
              maxLength={100}
              onChange={(e) => { update({ q: e.target.value }); setShowSuggest(true); }}
              onFocus={() => setShowSuggest(true)}
              onBlur={() => setTimeout(() => setShowSuggest(false), 120)}
              onKeyDown={(e) => e.key === 'Escape' && setShowSuggest(false)}
            />
            {showSuggest && suggestions.length > 0 && (
              <ul className="suggest" role="listbox">
                {suggestions.map((s) => (
                  <li key={s} role="option" onMouseDown={() => { update({ q: s }); setShowSuggest(false); }}>
                    <Highlight text={s} terms={filters.q.trim().split(/\s+/).filter(Boolean)} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <nav className="pills" aria-label="Quick categories">
          <button type="button" className={filters.category.length === 0 ? 'pill on' : 'pill'} onClick={() => update({ category: [] })}>
            All products
          </button>
          {options.categories.map((c) => (
            <button type="button" key={c.name}
              className={filters.category.includes(c.name) ? 'pill on' : 'pill'}
              onClick={() => toggle('category', c.name)}>
              <span aria-hidden="true">{(CATEGORY_ART[c.name] || ['📦'])[0]}</span> {c.name}
            </button>
          ))}
        </nav>
      </header>

      <div className="layout">
        <aside className={`filters ${drawer ? 'open' : ''}`} aria-label="Filters">
          <div className="filters-head">
            <h2>Filters</h2>
            <button type="button" className="link" onClick={clearAll} disabled={!hasFilters}>Clear all</button>
            <button type="button" className="close" onClick={() => setDrawer(false)} aria-label="Close filters">×</button>
          </div>

          <div className="filters-body">
            <CheckList id="f-category" title="Category" options={options.categories} selected={filters.category}
              onToggle={(v) => toggle('category', v)} limit={8} />
            <CheckList id="f-brand" title="Brand" options={options.brands} selected={filters.brand}
              onToggle={(v) => toggle('brand', v)} limit={6} />

            <div className="group" role="group" aria-labelledby="f-price-title">
              <h3 className="group-title" id="f-price-title">Price (₹)</h3>
              <div className="price-inputs">
                <input type="number" min="0" inputMode="numeric" placeholder="Min" aria-label="Minimum price"
                  value={filters.minPrice} onChange={(e) => update({ minPrice: e.target.value })} />
                <span>to</span>
                <input type="number" min="0" inputMode="numeric" placeholder="Max" aria-label="Maximum price"
                  value={filters.maxPrice} onChange={(e) => update({ maxPrice: e.target.value })} />
              </div>
              {priceError && <p className="field-error" role="alert">{priceError}</p>}
            </div>

            <RatingFilter value={filters.minRating} onChange={(v) => update({ minRating: v })} />

            <label className="switch">
              <input type="checkbox" checked={filters.inStock} onChange={(e) => update({ inStock: e.target.checked })} />
              <span>In stock only</span>
            </label>
          </div>

          <div className="filters-foot">
            <button type="button" className="apply" onClick={() => setDrawer(false)}>
              {isLoading ? 'Loading…' : `Show ${pagination.total} products`}
            </button>
          </div>
        </aside>
        {drawer && <div className="scrim" onClick={() => setDrawer(false)} />}

        <main className="content">
          <div className="toolbar">
            <button type="button" className="filter-btn" onClick={() => setDrawer(true)}>
              Filters{chips.length ? ` (${chips.length})` : ''}
            </button>
            <p className="count" aria-live="polite">{countText}</p>
            <label className="sort">
              <span>Sort by</span>
              <select value={filters.sort} onChange={(e) => update({ sort: e.target.value })}>
                {SORT_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
          </div>

          {chips.length > 0 && (
            <div className="chips" key={chips.map((c) => c.label).join('|')}>
              {chips.map((c) => (
                <button type="button" key={c.label} className="chip" onClick={c.remove} aria-label={`Remove ${c.label}`}>
                  {c.label} <span aria-hidden="true">×</span>
                </button>
              ))}
              <button type="button" className="link" onClick={clearAll}>Clear all</button>
            </div>
          )}

          {fuzzy && !error && !isLoading && (
            <p className="notice">No exact matches for “{applied.filters.q}”. Showing similar products instead.</p>
          )}

          {error && (
            <div className="state error" role="alert">
              <h2>Something went wrong</h2>
              <p>{error}</p>
              {!priceError && <button type="button" onClick={() => setApplied({ ...applied })}>Try again</button>}
            </div>
          )}

          {!error && isLoading && <Loader />}

          {!error && !isLoading && products.length === 0 && (
            <div className="state">
              <h2>No products match your search</h2>
              <p>Try a different keyword, or remove some filters.</p>
              <button type="button" onClick={clearAll}>Clear all filters</button>
            </div>
          )}

          {!error && !isLoading && products.length > 0 && (
            <div className="grid">
              {products.map((p) => <ProductCard key={p.id} p={p} terms={terms} />)}
            </div>
          )}

          {!error && !isLoading && pagination.totalPages > 1 && (
            <nav className="pagination" aria-label="Pagination">
              <button disabled={page <= 1} onClick={() => goToPage(page - 1)}>← Previous</button>
              <div className="page-numbers">
                {getPageList(page, pagination.totalPages).map((p, i) =>
                  p === '...' ? (
                    <span key={`dots-${i}`} className="dots">…</span>
                  ) : (
                    <button key={p} className={p === page ? 'active' : ''} aria-current={p === page ? 'page' : undefined}
                      onClick={() => goToPage(p)}>{p}</button>
                  )
                )}
              </div>
              <button disabled={page >= pagination.totalPages} onClick={() => goToPage(page + 1)}>Next →</button>
            </nav>
          )}
        </main>
      </div>
    </div>
  );
};

export default ProductCatalogue;