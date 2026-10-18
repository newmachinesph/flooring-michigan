'use client';

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { HiOutlineHeart, HiHeart } from "react-icons/hi2";
import { Space_Grotesk, IBM_Plex_Sans } from "next/font/google";
import { FilterPanel, type FilterSection, type SizeConfig } from "./filter-panel";
import productsData from "./data/products.json";

type Product = (typeof productsData)[number];

const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-space-grotesk",
});

const containerClass =
  "mx-auto w-full max-w-[1680px] px-4 sm:px-6 lg:px-10 xl:px-14";

const quickFilterConfigs = [
  { id: "room", label: "Room", sectionId: "application" as SectionId, placeholder: "All rooms" },
  { id: "color", label: "Color tone", sectionId: "color-tones" as SectionId, placeholder: "All tones" },
  { id: "material", label: "Material", sectionId: "type" as SectionId, placeholder: "All materials" },
];
const quickFilterSectionIds = quickFilterConfigs.map((config) => config.sectionId);
const PIECE_LENGTH_METERS = 1.2;

const PAGE_SIZE = 12;

const sizeConfig: SizeConfig = {
  min: 3,
  max: 12,
  defaultMin: 5,
  defaultMax: 9,
};

const sectionDefinitions = [
  { id: "type", label: "Type", showMoreCap: 4 },
  { id: "brand", label: "Brand" },
  { id: "application", label: "Application" },
  { id: "color-tones", label: "Color tones" },
  { id: "installation", label: "Installation method" },
  { id: "look", label: "Look" },
] as const;

const sectionKeyMap = {
  type: "type",
  brand: "brand",
  application: "application",
  "color-tones": "colorTone",
  installation: "installation",
  look: "look",
} as const;

type SectionId = (typeof sectionDefinitions)[number]["id"];

function buildFilterSections(products: Product[]): FilterSection[] {
  return sectionDefinitions.map((definition) => {
    const counts: Record<string, number> = {};
    const metaKey = sectionKeyMap[definition.id as SectionId];
    products.forEach((product) => {
      const value = product.meta[metaKey];
      counts[value] = (counts[value] || 0) + 1;
    });
    const options = Object.entries(counts)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([label, count]) => ({ label, count }));
    return {
      ...definition,
      options,
    };
  });
}

const filterSections = buildFilterSections(productsData);

const createEmptyFilters = () =>
  filterSections.reduce<Record<string, string[]>>((acc, section) => {
    acc[section.id] = [];
    return acc;
  }, {});

const formatPrice = (value: number) => `$${value.toFixed(2)}`;

type ChipItem = {
  key: string;
  label: string;
  kind: "section" | "visualizable" | "size";
  sectionId?: string;
  value?: string;
};

export default function FlooringMichiganView() {
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>(
    createEmptyFilters,
  );
  const [sizeRange, setSizeRange] = useState({
    min: sizeConfig.defaultMin,
    max: sizeConfig.defaultMax,
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [propertySize, setPropertySize] = useState("");
  const [piecesNeeded, setPiecesNeeded] = useState<number | null>(null);
  const [cartFeedback, setCartFeedback] = useState<string | null>(null);
  const [compareItems, setCompareItems] = useState<Product[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [compareSelection, setCompareSelection] = useState<string[]>([]);
  const [compareModalOpen, setCompareModalOpen] = useState(false);

  const chipItems = useMemo<ChipItem[]>(() => {
    const items: ChipItem[] = [];
    filterSections.forEach((section) => {
      (selectedFilters[section.id] || []).forEach((value) => {
        items.push({
          key: `${section.id}-${value}`,
          label: value,
          kind: "section",
          sectionId: section.id,
          value,
        });
      });
    });
    if (
      sizeRange.min !== sizeConfig.defaultMin ||
      sizeRange.max !== sizeConfig.defaultMax
    ) {
      items.push({
        key: "size",
        label: `Width ${sizeRange.min}"-${sizeRange.max}"`,
        kind: "size",
      });
    }
    return items;
  }, [selectedFilters, sizeRange]);

  const chipsForPanel = chipItems.map((chip) => chip.label);
  const appliedCount = chipItems.length;

  useEffect(() => {
    if (!cartFeedback) {
      return;
    }
    const timeout = setTimeout(() => setCartFeedback(null), 4000);
    return () => clearTimeout(timeout);
  }, [cartFeedback]);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    if (compareModalOpen || activeProduct) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = originalOverflow || "";
    }
    return () => {
      document.body.style.overflow = originalOverflow || "";
    };
  }, [compareModalOpen, activeProduct]);

  const filteredProducts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return productsData.filter((product) => {
      if (product.meta.width < sizeRange.min || product.meta.width > sizeRange.max) {
        return false;
      }

      const matchesSections = filterSections.every((section) => {
        const selections = selectedFilters[section.id];
        if (!selections || selections.length === 0) {
          return true;
        }
        const key = sectionKeyMap[section.id as SectionId];
        return selections.includes(product.meta[key]);
      });

      if (!matchesSections) {
        return false;
      }

      if (term) {
        return (
          product.title.toLowerCase().includes(term) ||
          product.subtitle.toLowerCase().includes(term) ||
          product.meta.brand.toLowerCase().includes(term)
        );
      }

      return true;
    });
  }, [sizeRange, selectedFilters, searchTerm]);

  const totalProducts = productsData.length;
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));
  const paginatedProducts = filteredProducts.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );
  const pageNumbers = Array.from({ length: totalPages }, (_, index) => index + 1);

  const toggleFilter = (sectionId: string, option: string) => {
    setSelectedFilters((prev) => {
      const next = { ...prev };
      const current = next[sectionId] || [];
      next[sectionId] = current.includes(option)
        ? current.filter((value) => value !== option)
        : [...current, option];
      return next;
    });
    setPage(1);
  };

const handleClearQuickFilters = () => {
  setSelectedFilters((prev) => {
    const next = { ...prev };
    quickFilterSectionIds.forEach((sectionId) => {
      next[sectionId] = [];
    });
    return next;
  });
  setPage(1);
};

const calculatePieces = (product: Product, surface: number) => {
  const widthMeters = (product.meta.width || sizeConfig.defaultMin) * 0.0254;
  const pieceArea = Math.max(widthMeters * PIECE_LENGTH_METERS, 0.2);
  return Math.ceil(surface / pieceArea);
};

const handleOpenCoverage = (product: Product) => {
  setActiveProduct(product);
  setPropertySize("");
  setPiecesNeeded(null);
};

const handleCloseModal = () => {
  setActiveProduct(null);
  setPropertySize("");
  setPiecesNeeded(null);
};

const handleCalculatePieces = () => {
  if (!activeProduct) return;
  const sqm = parseFloat(propertySize);
  if (!sqm || sqm <= 0) {
    setPiecesNeeded(null);
    return;
  }
  setPiecesNeeded(calculatePieces(activeProduct, sqm));
};

const handleAddToCart = () => {
  if (!activeProduct || !piecesNeeded) return;
  setCartFeedback(`${activeProduct.title} saved with ${piecesNeeded} pieces.`);
  handleCloseModal();
};

  const toggleCompareItem = (product: Product) => {
    setCompareItems((prev) => {
      const exists = prev.some((item) => item.id === product.id);
      if (exists) {
        setCompareSelection((selection) => selection.filter((id) => id !== product.id));
        const next = prev.filter((item) => item.id !== product.id);
        if (next.length === 0) {
          setCompareOpen(false);
        }
        return next;
      }

      const next = [...prev, product];
      setCompareSelection((selection) => {
        if (selection.includes(product.id)) {
          return selection;
        }
        if (selection.length >= 4) {
          setCartFeedback("Only 4 items can be selected for comparison at a time.");
          return selection;
        }
        return [...selection, product.id];
      });
      return next;
    });
  };

const removeCompareItem = (productId: string) => {
  setCompareItems((prev) => {
    const next = prev.filter((item) => item.id !== productId);
    if (next.length === 0) {
      setCompareOpen(false);
    }
    setCompareSelection((selection) => selection.filter((id) => id !== productId));
    return next;
  });
};

  const handleSizeRangeChange = (key: "min" | "max", value: number) => {
    setSizeRange((prev) => {
      if (key === "min") {
        const safeValue = Math.min(value, prev.max - 1);
        return { ...prev, min: Math.max(sizeConfig.min, safeValue) };
      }
      const safeValue = Math.max(value, prev.min + 1);
      return { ...prev, max: Math.min(sizeConfig.max, safeValue) };
    });
    setPage(1);
  };

  const clearFilters = () => {
    setSelectedFilters(createEmptyFilters());
    setSizeRange({ min: sizeConfig.defaultMin, max: sizeConfig.defaultMax });
    setPage(1);
  };

  const removeChip = (chip: ChipItem) => {
    if (chip.kind === "section" && chip.sectionId && chip.value) {
      toggleFilter(chip.sectionId, chip.value);
      return;
    }
    if (chip.kind === "size") {
      setSizeRange({ min: sizeConfig.defaultMin, max: sizeConfig.defaultMax });
      setPage(1);
    }
  };

  const handleApply = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const quickFilterOptions = quickFilterConfigs.map((config) => {
    const section = filterSections.find((item) => item.id === config.sectionId);
    return {
      ...config,
      options: section?.options || [],
    };
  });

  return (
    <main
      className={`${plexSans.className} ${spaceGrotesk.variable} bg-slate-50 text-slate-900`}
    >
      <div className="flex min-h-screen flex-col">
        <section className="bg-[url('https://images.pexels.com/photos/3735414/pexels-photo-3735414.jpeg?auto=compress&cs=tinysrgb&w=1600')] bg-cover bg-center">
          <div className="bg-slate-900/70">
            <div className={`${containerClass} py-12 lg:py-16`}>
              {cartFeedback && (
                <div className="mb-4 rounded border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm text-emerald-900">
                  {cartFeedback}
                </div>
              )}
              <div className="max-w-2xl space-y-4 text-white">
                <p
                  className="text-xs font-semibold uppercase tracking-[0.6em] text-amber-300"
                  style={{ fontFamily: "var(--font-space-grotesk)" }}
                >
                  Wood | Luxury Vinyl | Laminate
                </p>
                <h1
                  className="text-3xl font-semibold leading-tight sm:text-4xl lg:text-5xl"
                  style={{ fontFamily: "var(--font-space-grotesk)" }}
                >
                  Modern filters for a Michigan-perfect flooring plan.
                </h1>
                <p className="text-sm text-slate-100/90 sm:text-base">
                  Use precision sliders and pro-level filters to explore collections engineered for
                  local humidity, pets, radiant heat, and more.
                </p>
              </div>

              <div className="mt-9 border border-slate-100 bg-white p-5 shadow-xl shadow-black/15">
                <form
                  className="flex flex-col gap-4 lg:flex-row lg:items-end"
                  onSubmit={(event) => event.preventDefault()}
                >
                  <div className="flex-1">
                    <label className="mb-1 text-xs font-medium uppercase text-slate-600" htmlFor="search">
                      Search by collection, color, or style
                    </label>
                    <div className="flex border border-slate-300">
                      <input
                        id="search"
                        type="text"
                        placeholder='e.g. "Warm oak" or "Quick-Step"'
                        className="w-full bg-slate-50 px-3 py-2 text-sm outline-none"
                        value={searchTerm}
                        onChange={(event) => {
                          setSearchTerm(event.target.value);
                          setPage(1);
                        }}
                      />
                      <div className="flex items-center border-l border-slate-300 px-3 text-slate-500">
                        <svg
                          className="h-4 w-4"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <circle cx="11" cy="11" r="6" />
                          <line x1="16.5" y1="16.5" x2="21" y2="21" strokeLinecap="round" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-4">
                    {quickFilterOptions.map((filter) => (
                      <label key={filter.id} className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                        <span className="sr-only">{filter.label}</span>
                        <select
                          className="w-full border border-slate-300 bg-white px-3 py-2 text-xs tracking-[0.2em]"
                          value={selectedFilters[filter.sectionId]?.[0] || ""}
                          onChange={(event) => {
                            const value = event.target.value;
                            setSelectedFilters((prev) => ({
                              ...prev,
                              [filter.sectionId]: value ? [value] : [],
                            }));
                            setPage(1);
                          }}
                        >
                          <option value="">{filter.placeholder}</option>
                          {filter.options.map((option) => (
                            <option key={option.label} value={option.label}>
                              {option.label} ({option.count})
                            </option>
                          ))}
                        </select>
                      </label>
                    ))}
                    <button
                      type="button"
                      onClick={handleClearQuickFilters}
                      className="border border-slate-300 px-3 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-600 transition hover:border-amber-600 hover:text-amber-700"
                    >
                      Clear
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </section>

        <main className="flex-1">
          <div className={`${containerClass} flex flex-col gap-6 py-10 lg:flex-row`}>
            <aside className="lg:w-80 lg:shrink-0">
              <div className="mb-3 lg:hidden">
                <button
                  type="button"
                  className="flex w-full items-center justify-center gap-2 border border-slate-300 bg-white px-4 py-3 text-sm font-semibold uppercase tracking-[0.2em]"
                  onClick={() => setMobileFiltersOpen((prev) => !prev)}
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M6 12h12M10 18h4" />
                  </svg>
                  {mobileFiltersOpen ? "Close filters" : "Filters"}
                  <span className="text-xs font-normal text-slate-500">({appliedCount} applied)</span>
                </button>
              </div>
              <div className={`${mobileFiltersOpen ? "block" : "hidden"} lg:block`}>
                <FilterPanel
                  sections={filterSections}
                  selectedFilters={selectedFilters}
                  sizeRange={sizeRange}
                  sizeConfig={sizeConfig}
                  chips={chipsForPanel}
                  appliedCount={appliedCount}
                  onToggleFilter={toggleFilter}
                  onSizeRangeChange={handleSizeRangeChange}
                  onClearAll={() => {
                    clearFilters();
                    setMobileFiltersOpen(false);
                  }}
                  onApply={() => {
                    handleApply();
                    setMobileFiltersOpen(false);
                  }}
                />
              </div>
            </aside>

            <section className="flex-1 space-y-4">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                    {filteredProducts.length} flooring options
                  </p>
                  <p className="text-sm text-slate-500">
                    Showing results tailored to your filters across {totalProducts} curated products.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                    Sort by
                  </label>
                  <select className="border border-slate-300 bg-white px-3 py-1.5 text-xs uppercase tracking-[0.2em]">
                    <option>Most popular</option>
                    <option>Price: Low to High</option>
                    <option>Price: High to Low</option>
                    <option>Newest first</option>
                  </select>
                </div>
              </div>

              {chipItems.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 border border-slate-200 bg-white px-4 py-3 text-xs">
                  {chipItems.map((chip) => (
                    <span
                      key={chip.key}
                      className="flex items-center gap-2 border border-slate-300 px-3 py-1 uppercase tracking-[0.2em]"
                    >
                      {chip.label}
                      <button
                        className="text-[11px] text-slate-400 hover:text-slate-700"
                        onClick={() => removeChip(chip)}
                      >
                        x
                      </button>
                    </span>
                  ))}
                  <button
                    className="ml-auto text-[11px] font-semibold uppercase tracking-[0.3em] text-amber-600"
                    onClick={clearFilters}
                  >
                    Clear all
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {paginatedProducts.map((product, index) => {
                  const isCompared = compareItems.some((item) => item.id === product.id);
                  return (
                    <article key={product.id} className="group flex flex-col border border-slate-200 bg-white shadow-sm">
                      <div className="relative aspect-[4/3] w-full overflow-hidden border-b border-slate-200">
                        <Image
                          src={product.image}
                          alt={product.alt}
                          fill
                        sizes="(min-width: 1280px) 320px, (min-width: 640px) 50vw, 100vw"
                        className="object-cover transition duration-500 group-hover:scale-105"
                        priority={index < 3 && page === 1}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 transition group-hover:opacity-100" />
                        <div className="absolute top-0 left-0 bg-black/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-white">
                          {product.badge}
                        </div>
                        <button
                          className={`absolute top-2 right-2 flex items-center justify-center rounded-full border p-1 ${
                            isCompared ? "border-amber-500 bg-amber-500 text-white" : "border-white/70 bg-black/40 text-white"
                          }`}
                          onClick={() => toggleCompareItem(product)}
                          aria-label={isCompared ? "Remove from compare" : "Add to compare"}
                        >
                          {isCompared ? <HiHeart className="h-5 w-5" /> : <HiOutlineHeart className="h-5 w-5" />}
                        </button>
                        <button className="absolute bottom-0 right-0 bg-white/95 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-900 transition hover:bg-amber-600 hover:text-white">
                          {product.cta}
                        </button>
                      </div>
                      <div className="flex flex-1 flex-col gap-5 p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">
                              {product.meta.brand}
                            </p>
                          <h3
                            className="text-xl font-semibold text-slate-900"
                            style={{ fontFamily: "var(--font-space-grotesk)" }}
                          >
                            {product.title}
                          </h3>
                          <p className="text-xs text-slate-500">{product.subtitle}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-base font-semibold text-slate-900">{formatPrice(product.price)}</p>
                          <p className="text-[11px] text-slate-500">/ sq.ft</p>
                        </div>
                      </div>
                        <div className="space-y-3">
                          <div className="flex flex-wrap gap-2">
                            {product.tags.map((tag) => (
                              <span
                                key={`${product.id}-${tag.label}`}
                                className={`border px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] ${
                                tag.tone === "emerald"
                                  ? "border-emerald-200 text-emerald-700"
                                  : tag.tone === "blue"
                                    ? "border-blue-200 text-blue-700"
                                    : "border-slate-300 text-slate-700"
                              }`}
                            >
                              {tag.label}
                            </span>
                          ))}
                        </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500">
                            <div className="flex items-center gap-1">
                              {product.swatches.map((swatch) => (
                                <span
                                  key={`${product.id}-${swatch.label}`}
                                  className="h-5 w-5 border"
                                style={{ backgroundColor: swatch.color, borderColor: swatch.border }}
                                title={swatch.label}
                              />
                            ))}
                          </div>
                            {product.swatchOverflow && <span>{product.swatchOverflow}</span>}
                          </div>
                          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] uppercase tracking-[0.2em] text-slate-500 text-nowrap">
                            <span className="truncate">
                              Width <strong className="text-slate-900">{product.meta.width}&quot;</strong>
                            </span>
                          <span className="truncate">
                            Look <strong className="text-slate-900">{product.meta.look}</strong>
                          </span>
                          <span className="truncate">
                            Install <strong className="text-slate-900">{product.meta.installation}</strong>
                          </span>
                          <span className="truncate">
                            Room <strong className="text-slate-900">{product.meta.application}</strong>
                          </span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-[12px] text-slate-600">
                          <p>
                            Est. installed: <span className="font-semibold text-slate-900">{product.estimate}</span>
                          </p>
                          <button
                            className="border border-slate-900 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-900 transition hover:bg-slate-900 hover:text-white"
                            onClick={() => handleOpenCoverage(product)}
                          >
                            Plan coverage
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>

              <div className="mt-6 flex flex-col gap-3 border-t border-slate-200 pt-4 text-xs sm:flex-row sm:items-center sm:justify-between">
                <p className="text-slate-500">
                  Showing{" "}
                  <span className="font-semibold text-slate-800">
                    {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, filteredProducts.length)}
                  </span>{" "}
                  of <span className="font-semibold text-slate-800">{filteredProducts.length}</span> matches
                </p>
                <div className="flex items-center gap-1">
                  <button
                    className="border border-slate-300 px-3 py-2 uppercase tracking-[0.2em]"
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                    disabled={page === 1}
                  >
                    Prev
                  </button>
                  {pageNumbers.map((number) => (
                    <button
                      key={number}
                      className={`border px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] ${
                        page === number ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300"
                      }`}
                      onClick={() => setPage(number)}
                    >
                      {number}
                    </button>
                  ))}
                  <button
                    className="border border-slate-300 px-3 py-2 uppercase tracking-[0.2em]"
                    onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={page === totalPages}
                  >
                    Next
                  </button>
                </div>
              </div>
            </section>
          </div>
        </main>

        {compareItems.length > 0 && (
          <button
            className="fixed bottom-6 right-6 z-30 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold uppercase tracking-[0.3em] text-white shadow-lg"
            onClick={() => setCompareOpen(true)}
          >
            Compare ({compareItems.length})
          </button>
        )}

        <div
          className={`fixed inset-0 z-40 flex justify-end transition ${
            compareOpen ? "pointer-events-auto" : "pointer-events-none"
          }`}
        >
          <div
            className={`flex-1 bg-black/30 transition ${compareOpen ? "opacity-100" : "opacity-0"}`}
            onClick={() => setCompareOpen(false)}
          />
          <div
            className={`w-full max-w-md bg-white shadow-2xl transition duration-300 ${
              compareOpen ? "translate-x-0" : "translate-x-full"
            }`}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-500">
                  Compare
                </p>
                <p className="text-sm text-slate-500">{compareItems.length} products</p>
              </div>
              <button className="text-slate-500" onClick={() => setCompareOpen(false)}>
                ×
              </button>
            </div>
            <div className="max-h-[80vh] overflow-y-auto px-5 py-4 space-y-4">
              {compareItems.map((item) => {
                const selected = compareSelection.includes(item.id);
                return (
                  <div key={item.id} className="border border-slate-200 p-4 space-y-2">
                    <label className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        className="peer mt-1 h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                        checked={selected}
                        disabled={!selected && compareSelection.length >= 4}
                        onChange={(event) => {
                          const checked = event.target.checked;
                          setCompareSelection((prev) => {
                            if (checked) {
                              if (prev.length >= 4) return prev;
                              return [...prev, item.id];
                            }
                            return prev.filter((id) => id !== item.id);
                          });
                        }}
                      />
                      <div>
                        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{item.meta.brand}</p>
                        <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                        <p className="text-[11px] text-slate-500">{item.subtitle}</p>
                      </div>
                    </label>
                    <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] uppercase tracking-[0.2em] text-slate-500">
                      <span>Width {item.meta.width}&quot;</span>
                      <span>Look {item.meta.look}</span>
                      <span>Install {item.meta.installation}</span>
                      <span>Room {item.meta.application}</span>
                    </div>
                    <button className="text-[11px] uppercase tracking-[0.3em] text-slate-400" onClick={() => removeCompareItem(item.id)}>
                      Remove
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="border-t border-slate-200 px-5 py-4">
              <button
                className="w-full border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-semibold uppercase tracking-[0.2em] text-white disabled:opacity-40"
                disabled={compareSelection.length < 2}
                onClick={() => setCompareModalOpen(true)}
              >
                Compare selected ({compareSelection.length})
              </button>
              <button
                className="mt-3 w-full border border-slate-300 px-4 py-2 text-sm uppercase tracking-[0.2em] text-slate-500"
                onClick={() => {
                  setCompareItems([]);
                  setCompareSelection([]);
                  setCompareOpen(false);
                }}
              >
                Remove all
              </button>
            </div>
          </div>
        </div>

        {compareModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-0 py-0 sm:px-6 sm:py-10">
            <div className="flex h-full w-full max-w-6xl flex-col bg-white p-4 shadow-2xl sm:h-auto sm:p-6">
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-500">
                    Comparison grid
                  </p>
                  <p className="text-sm text-slate-500">
                    Showing {compareSelection.length} selected products
                  </p>
                </div>
                <button className="text-slate-500" onClick={() => setCompareModalOpen(false)}>
                  ×
                </button>
              </div>
              <div className="mt-4 flex-1 overflow-x-auto">
                <div className="min-w-[700px] grid grid-flow-col gap-4 sm:min-w-[320px] sm:grid-cols-[repeat(auto-fit,minmax(240px,1fr))]">
                  {compareSelection.map((id) => {
                    const item = compareItems.find((product) => product.id === id);
                    if (!item) return null;
                    return (
                      <div key={id} className="space-y-3 border border-slate-200 p-4 text-sm">
                        <div className="relative h-32 w-full overflow-hidden border border-slate-100">
                          <Image
                            src={item.image}
                            alt={item.alt}
                            fill
                            className="object-cover"
                            sizes="240px"
                          />
                          <button
                            className="absolute top-2 right-2 rounded-full bg-black/60 px-2 py-1 text-[11px] uppercase tracking-[0.2em] text-white"
                            onClick={() => removeCompareItem(item.id)}
                          >
                            Remove
                          </button>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{item.meta.brand}</p>
                          <p className="text-base font-semibold text-slate-900">{item.title}</p>
                          <p className="text-[11px] text-slate-500">{item.subtitle}</p>
                        </div>
                        <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.2em] text-slate-500">
                          {item.tags.map((tag) => (
                            <span
                              key={`${item.id}-${tag.label}`}
                              className={`border px-2 py-0.5 ${
                                tag.tone === "emerald"
                                  ? "border-emerald-200 text-emerald-700"
                                  : tag.tone === "blue"
                                    ? "border-blue-200 text-blue-700"
                                    : "border-slate-300 text-slate-700"
                              }`}
                            >
                              {tag.label}
                            </span>
                          ))}
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-slate-500">
                          {item.swatches.map((swatch) => (
                            <span
                              key={`${item.id}-${swatch.label}-compare`}
                              className="h-4 w-4 border"
                              style={{ backgroundColor: swatch.color, borderColor: swatch.border }}
                            />
                          ))}
                        </div>
                        <div className="space-y-1 text-[11px] uppercase tracking-[0.2em] text-slate-500">
                          <p>
                            Price <strong className="text-slate-900">{formatPrice(item.price)}</strong>
                          </p>
                          <p>
                            Width <strong className="text-slate-900">{item.meta.width}&quot;</strong>
                          </p>
                          <p>
                            Look <strong className="text-slate-900">{item.meta.look}</strong>
                          </p>
                          <p>
                            Install <strong className="text-slate-900">{item.meta.installation}</strong>
                          </p>
                          <p>
                            Room <strong className="text-slate-900">{item.meta.application}</strong>
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

{activeProduct && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8">
            <div className="w-full max-w-lg bg-white p-6 shadow-2xl">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-500">
                    Coverage planner
                  </p>
                  <h3 className="mt-2 text-xl font-semibold text-slate-900">{activeProduct.title}</h3>
                </div>
                <button className="text-slate-500" onClick={handleCloseModal}>
                  ×
                </button>
              </div>
              <div className="mt-6 space-y-4">
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Property size (sq m)
                  <input
                    type="number"
                    min="1"
                    step="0.1"
                    value={propertySize}
                    onChange={(event) => setPropertySize(event.target.value)}
                    className="mt-2 w-full border border-slate-300 px-3 py-2 text-sm"
                    placeholder="e.g. 85"
                  />
                </label>
                <button
                  className="w-full border border-slate-900 px-4 py-2 text-sm font-semibold uppercase tracking-[0.2em] text-slate-900 transition hover:bg-slate-900 hover:text-white"
                  onClick={handleCalculatePieces}
                >
                  Calculate pieces
                </button>
                {piecesNeeded !== null && (
                  <p className="text-sm text-slate-600">
                    You&apos;ll need approximately{" "}
                    <span className="font-semibold text-slate-900">{piecesNeeded}</span> pieces to cover{" "}
                    {propertySize || 0} sq m.
                  </p>
                )}
              </div>
              <div className="mt-6 flex items-center justify-between gap-3">
                <button
                  className="w-full border border-slate-300 px-4 py-2 text-sm uppercase tracking-[0.2em] text-slate-600"
                  onClick={handleCloseModal}
                >
                  Cancel
                </button>
                <button
                  className="w-full border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-semibold uppercase tracking-[0.2em] text-white disabled:opacity-40"
                  onClick={handleAddToCart}
                  disabled={piecesNeeded === null || !propertySize}
                >
                  Add to cart
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
