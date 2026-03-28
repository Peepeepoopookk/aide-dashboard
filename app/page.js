'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function HomePage() {
  const [signals, setSignals] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [stats, setStats] = useState({})
  const [displayStats, setDisplayStats] = useState({})
  const [cardHover, setCardHover] = useState(null)
  const [statHover, setStatHover] = useState(null)
  const [searchFocused, setSearchFocused] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [selectedSources, setSelectedSources] = useState([])
  const [selectedCategories, setSelectedCategories] = useState([])
  const [sortBy, setSortBy] = useState('score')
  const [availableSources, setAvailableSources] = useState([])
  const [availableCategories, setAvailableCategories] = useState([])
  const [lastCrawled, setLastCrawled] = useState(null)
  const [totalEver, setTotalEver] = useState(0)
  const [totalFiltered, setTotalFiltered] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const SIGNALS_PER_PAGE = 100

  // Supabase fetch logic
  async function fetchPage() {
    setLoading(true)

    const from = (currentPage - 1) * SIGNALS_PER_PAGE
    const to = from + SIGNALS_PER_PAGE - 1

    let query = supabase
      .from('signals')
      .select('id, title, url, source, score_weighted, category, summary_data, crawled_at, raw_content', { count: 'exact' })
      .eq('scored', true)
      .eq('classification->>is_relevant', 'true')

    if (search) {
      query = query.or(`title.ilike.%${search}%,url.ilike.%${search}%,raw_content.ilike.%${search}%`)
    }
    if (selectedSources.length > 0) {
      query = query.in('source', selectedSources)
    }
    if (selectedCategories.length > 0) {
      query = query.in('category', selectedCategories)
    }
    if (sortBy === 'score') {
      query = query.order('score_weighted', { ascending: false })
    } else {
      query = query.order('crawled_at', { ascending: false })
    }

    query = query.range(from, to)

    const { data, error, count } = await query

    if (error) {
      console.error('Supabase fetch error:', error)
      setLoading(false)
      return
    }

    const results = data || []
    setSignals(results)
    setTotalFiltered(count || 0)

    const dates = results.map(s => new Date(s.crawled_at)).filter(d => !isNaN(d))
    if (dates.length > 0) {
      setLastCrawled(new Date(Math.max(...dates)))
    }

    setLoading(false)
  }

  async function fetchMeta() {
    const { count: totalCount } = await supabase
      .from('signals')
      .select('id', { count: 'exact', head: true })
    if (totalCount !== null) {
      setTotalEver(totalCount)
    }

    const { data: srcData, count: srcCount } = await supabase
      .from('signals')
      .select('source', { count: 'exact' })
      .eq('scored', true)
      .eq('classification->>is_relevant', 'true')
    if (srcData) {
      const uniqueSources = [...new Set(srcData.map(s => s.source).filter(Boolean))]
      setAvailableSources(uniqueSources)
      const statsObj = { total: srcCount || 0 }
      uniqueSources.forEach(src => {
        statsObj[src] = srcData.filter(s => s.source === src).length
      })
      setStats(statsObj)
    }

    const { data: catData } = await supabase
      .from('signals')
      .select('category')
      .eq('scored', true)
      .eq('classification->>is_relevant', 'true')
    if (catData) {
      const uniqueCategories = [...new Set(catData.map(s => s.category).filter(Boolean))]
      setAvailableCategories(uniqueCategories)
    }
  }

  useEffect(() => {
    fetchPage()
    fetchMeta()
  }, [currentPage, search, selectedSources, selectedCategories, sortBy])

  useEffect(() => {
    const interval = setInterval(() => {
      fetchPage();
      fetchMeta();
    }, 300000);
    return () => clearInterval(interval);
  }, []);

  // Animated stats counter
  useEffect(() => {
    if (stats.total === 0) return
    const duration = 1200
    const steps = 60
    const interval = duration / steps
    let step = 0
    const timer = setInterval(() => {
      step++
      const progress = step / steps
      const eased = 1 - Math.pow(1 - progress, 3)
      const newDisplay = { total: Math.round(stats.total * eased) }
      availableSources.forEach(src => {
        newDisplay[src] = Math.round((stats[src] || 0) * eased)
      })
      setDisplayStats(newDisplay)
      if (step >= steps) {
        clearInterval(timer)
        setDisplayStats(stats)
      }
    }, interval)
    return () => clearInterval(timer)
  }, [stats])

  // Reset to page 1 when filters/search change
  useEffect(() => {
    setCurrentPage(1)
  }, [search, selectedSources, selectedCategories, sortBy])

  // Toggle source filter
  const toggleSource = (source) => {
    setSelectedSources(prev =>
      prev.includes(source) ? prev.filter(s => s !== source) : [...prev, source]
    )
  }

  // Toggle category filter
  const toggleCategory = (category) => {
    setSelectedCategories(prev =>
      prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
    )
  }

  // Filter + sort
  const filteredSignals = signals
  const paginatedSignals = signals
  const totalPages = Math.ceil(totalFiltered / SIGNALS_PER_PAGE)

  // Format helpers
  const formatSource = (source) =>
    source.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')

  const formatCategory = (category) =>
    category.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')

  // Background doodles
  const BackgroundDoodles = (
    <div style={{
      position: 'fixed', top: 0, left: 0,
      width: '100%', height: '100%',
      zIndex: 0, pointerEvents: 'none', overflow: 'hidden',
    }}>
      {/* SVG 1 — Newspaper */}
      <svg style={{ position: 'absolute', left: '4%', top: '7%' }} width="130" height="170" viewBox="0 0 130 170" stroke="white" fill="none" strokeWidth="1.2" opacity="0.12">
        <rect x="5" y="5" width="120" height="160" rx="3"/>
        <rect x="15" y="20" width="100" height="25" rx="2"/>
        <line x1="15" y1="60" x2="115" y2="60"/>
        <line x1="15" y1="75" x2="90" y2="75"/>
        <line x1="15" y1="90" x2="100" y2="90"/>
        <line x1="15" y1="105" x2="85" y2="105"/>
        <line x1="15" y1="120" x2="95" y2="120"/>
        <line x1="15" y1="135" x2="80" y2="135"/>
        <rect x="15" y="148" width="45" height="8" rx="1"/>
      </svg>

      {/* SVG 2 — Robot Head */}
      <svg style={{ position: 'absolute', right: '5%', top: '10%' }} width="110" height="130" viewBox="0 0 110 130" stroke="white" fill="none" strokeWidth="1.2" opacity="0.12">
        <rect x="20" y="30" width="70" height="70" rx="8"/>
        <circle cx="40" cy="55" r="8"/>
        <circle cx="70" cy="55" r="8"/>
        <rect x="35" y="78" width="40" height="10" rx="3"/>
        <line x1="55" y1="10" x2="55" y2="30"/>
        <circle cx="55" cy="8" r="4"/>
        <line x1="20" y1="65" x2="5" y2="65"/>
        <line x1="90" y1="65" x2="105" y2="65"/>
        <rect x="30" y="100" width="50" height="20" rx="4"/>
      </svg>

      {/* SVG 3 — GitHub Octocat */}
      <svg style={{ position: 'absolute', left: '6%', bottom: '8%' }} width="110" height="110" viewBox="0 0 110 110" stroke="white" fill="none" strokeWidth="1.2" opacity="0.12">
        <circle cx="55" cy="45" r="30"/>
        <path d="M 25 75 Q 15 90 20 105"/>
        <path d="M 85 75 Q 95 90 90 105"/>
        <path d="M 35 80 Q 30 100 40 105"/>
        <path d="M 75 80 Q 80 100 70 105"/>
        <path d="M 55 75 Q 55 95 55 108"/>
        <circle cx="43" cy="40" r="5"/>
        <circle cx="67" cy="40" r="5"/>
      </svg>

      {/* SVG 4 — Circuit Board */}
      <svg style={{ position: 'absolute', right: '4%', bottom: '7%' }} width="150" height="150" viewBox="0 0 150 150" stroke="white" fill="none" strokeWidth="1.2" opacity="0.12">
        <line x1="20" y1="40" x2="80" y2="40"/>
        <line x1="80" y1="40" x2="80" y2="80"/>
        <line x1="80" y1="80" x2="130" y2="80"/>
        <line x1="40" y1="40" x2="40" y2="110"/>
        <line x1="40" y1="110" x2="100" y2="110"/>
        <line x1="100" y1="80" x2="100" y2="130"/>
        <circle cx="40" cy="40" r="4"/>
        <circle cx="80" cy="80" r="4"/>
        <circle cx="100" cy="110" r="4"/>
        <circle cx="130" cy="80" r="4"/>
        <rect x="55" y="32" width="16" height="16" rx="2"/>
        <rect x="92" y="102" width="16" height="16" rx="2"/>
      </svg>

      {/* SVG 5 — News Monitor */}
      <svg style={{ position: 'absolute', right: '2%', top: '44%' }} width="90" height="90" viewBox="0 0 90 90" stroke="white" fill="none" strokeWidth="1.2" opacity="0.12">
        <rect x="10" y="10" width="70" height="50" rx="5"/>
        <line x1="35" y1="60" x2="30" y2="80"/>
        <line x1="55" y1="60" x2="60" y2="80"/>
        <line x1="25" y1="80" x2="65" y2="80"/>
        <path d="M 20 35 Q 45 25 70 35"/>
        <circle cx="45" cy="35" r="8"/>
      </svg>

      {/* SVG 6 — Gear */}
      <svg style={{ position: 'absolute', left: '2%', top: '48%' }} width="80" height="80" viewBox="0 0 80 80" stroke="white" fill="none" strokeWidth="1.2" opacity="0.12">
        <circle cx="40" cy="40" r="15"/>
        <circle cx="40" cy="40" r="8"/>
        <rect x="36" y="5" width="8" height="14" rx="2"/>
        <rect x="36" y="61" width="8" height="14" rx="2"/>
        <rect x="5" y="36" width="14" height="8" rx="2"/>
        <rect x="61" y="36" width="14" height="8" rx="2"/>
        <rect x="15" y="15" width="8" height="14" rx="2" transform="rotate(45 19 22)"/>
        <rect x="57" y="15" width="8" height="14" rx="2" transform="rotate(-45 61 22)"/>
        <rect x="15" y="51" width="8" height="14" rx="2" transform="rotate(-45 19 58)"/>
        <rect x="57" y="51" width="8" height="14" rx="2" transform="rotate(45 61 58)"/>
      </svg>
    </div>
  )

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; background: #000; }
        ::selection { background: rgba(255,255,255,0.15); }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #000; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 3px; }
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes shimmer {
          0% { opacity: 0.4; }
          50% { opacity: 1; }
          100% { opacity: 0.4; }
        }
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-100%); }
          to { opacity: 1; transform: translateX(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>

      {/* Background doodles */}
      {BackgroundDoodles}

      {/* Sidebar toggle button */}
      <button
        onClick={() => setSidebarOpen(prev => !prev)}
        style={{
          position: 'fixed',
          left: sidebarOpen ? 280 : 0,
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 1000,
          backgroundColor: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: '0 8px 8px 0',
          padding: '12px 8px',
          color: 'white',
          fontSize: 14,
          transition: 'left 0.3s ease',
        }}
      >
        {sidebarOpen ? '‹' : '›'}
      </button>

      {/* Sidebar panel */}
      <div style={{
        position: 'fixed', left: 0, top: 0,
        height: '100vh', width: 280,
        backgroundColor: 'rgba(10,10,10,0.95)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderRight: '1px solid rgba(255,255,255,0.08)',
        zIndex: 999,
        overflowY: 'auto',
        padding: '32px 20px',
        transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.3s ease',
      }}>
        {/* Sidebar title */}
        <div style={{
          fontSize: 11, letterSpacing: 4,
          color: 'rgba(255,255,255,0.4)',
          textTransform: 'uppercase', marginBottom: 28,
        }}>
          FILTERS
        </div>

        {/* Sort section */}
        <div style={{ marginBottom: 4 }}>
          <div style={{
            fontSize: 10, letterSpacing: 3,
            color: 'rgba(255,255,255,0.3)',
            textTransform: 'uppercase', marginBottom: 10,
          }}>
            SORT BY
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setSortBy('score')}
              style={{
                flex: 1, padding: '8px 0', borderRadius: 8, fontSize: 12,
                backgroundColor: sortBy === 'score' ? 'rgba(255,255,255,0.15)' : 'transparent',
                border: sortBy === 'score' ? '1px solid rgba(255,255,255,0.3)' : '1px solid rgba(255,255,255,0.08)',
                color: sortBy === 'score' ? 'white' : 'rgba(255,255,255,0.4)',
              }}
            >
              Score
            </button>
            <button
              onClick={() => setSortBy('date')}
              style={{
                flex: 1, padding: '8px 0', borderRadius: 8, fontSize: 12,
                backgroundColor: sortBy === 'date' ? 'rgba(255,255,255,0.15)' : 'transparent',
                border: sortBy === 'date' ? '1px solid rgba(255,255,255,0.3)' : '1px solid rgba(255,255,255,0.08)',
                color: sortBy === 'date' ? 'white' : 'rgba(255,255,255,0.4)',
              }}
            >
              Date
            </button>
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.06)', margin: '24px 0' }} />

        {/* Sources section */}
        <div>
          <div style={{
            fontSize: 10, letterSpacing: 3,
            color: 'rgba(255,255,255,0.3)',
            textTransform: 'uppercase', marginBottom: 10,
          }}>
            SOURCE
          </div>
          {availableSources.map(source => (
            <button
              key={source}
              onClick={() => toggleSource(source)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                width: '100%', padding: '9px 12px', borderRadius: 8, marginBottom: 6,
                fontSize: 12, textAlign: 'left',
                backgroundColor: selectedSources.includes(source) ? 'rgba(255,255,255,0.1)' : 'transparent',
                border: selectedSources.includes(source) ? '1px solid rgba(255,255,255,0.25)' : '1px solid rgba(255,255,255,0.07)',
                color: selectedSources.includes(source) ? 'white' : 'rgba(255,255,255,0.45)',
              }}
            >
              <span>{formatSource(source)}</span>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{stats[source] || 0}</span>
            </button>
          ))}
        </div>

        {/* Divider */}
        <div style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.06)', margin: '24px 0' }} />

        {/* Categories section */}
        <div>
          <div style={{
            fontSize: 10, letterSpacing: 3,
            color: 'rgba(255,255,255,0.3)',
            textTransform: 'uppercase', marginBottom: 10,
          }}>
            CATEGORY
          </div>
          {availableCategories.map(category => (
            <button
              key={category}
              onClick={() => toggleCategory(category)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                width: '100%', padding: '9px 12px', borderRadius: 8, marginBottom: 6,
                fontSize: 12, textAlign: 'left',
                backgroundColor: selectedCategories.includes(category) ? 'rgba(255,255,255,0.1)' : 'transparent',
                border: selectedCategories.includes(category) ? '1px solid rgba(255,255,255,0.25)' : '1px solid rgba(255,255,255,0.07)',
                color: selectedCategories.includes(category) ? 'white' : 'rgba(255,255,255,0.45)',
              }}
            >
              <span>{formatCategory(category)}</span>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
                {signals.filter(s => s.category === category).length}
              </span>
            </button>
          ))}
        </div>

        {/* Divider */}
        <div style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.06)', margin: '24px 0' }} />

        {/* Clear filters */}
        {(selectedSources.length > 0 || selectedCategories.length > 0) && (
          <button
            onClick={() => { setSelectedSources([]); setSelectedCategories([]) }}
            style={{
              width: '100%', padding: '10px', borderRadius: 8,
              backgroundColor: 'transparent',
              border: '1px solid rgba(255,255,255,0.12)',
              color: 'rgba(255,255,255,0.5)', fontSize: 12,
            }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Main content wrapper */}
      <div style={{
        position: 'relative', zIndex: 1,
        minHeight: '100vh',
        backgroundColor: '#000000',
        color: 'white',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        padding: '0 24px',
        transition: 'margin-left 0.3s ease',
        marginLeft: sidebarOpen ? 280 : 0,
      }}>

        {/* HEADER */}
        <div style={{ textAlign: 'center', paddingTop: 70, paddingBottom: 48 }}>
          <h1 style={{
            fontSize: 80, fontWeight: 900, letterSpacing: -3,
            color: 'white', margin: 0, lineHeight: 1,
            textShadow: '0 0 60px rgba(255,255,255,0.25), 0 0 120px rgba(255,255,255,0.08)',
            animation: 'fadeInDown 0.9s ease forwards',
          }}>AIDE</h1>
          <p style={{
            fontSize: 11, letterSpacing: 8,
            color: 'rgba(255,255,255,0.35)',
            textTransform: 'uppercase',
            marginTop: 16,
            animation: 'fadeInDown 0.9s ease 0.15s forwards',
            opacity: 0,
          }}>Adaptive Intelligence Data Engine</p>
        </div>

        {/* STATS BAR */}
        <div style={{
          display: 'flex', justifyContent: 'center',
          gap: 16, flexWrap: 'wrap', marginBottom: 40,
          animation: 'fadeIn 0.8s ease 0.3s forwards', opacity: 0,
        }}>
          <div
            onMouseEnter={() => setStatHover('db_total')}
            onMouseLeave={() => setStatHover(null)}
            style={{
              backgroundColor: 'rgba(255,255,255,0.03)',
              backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
              border: statHover === 'db_total' ? '1px solid rgba(255,255,255,0.22)' : '1px solid rgba(255,255,255,0.07)',
              borderRadius: 18, padding: '22px 36px', textAlign: 'center', minWidth: 140,
              transform: statHover === 'db_total' ? 'translateY(-3px) scale(1.03)' : 'translateY(0) scale(1)',
              transition: 'all 0.25s ease',
            }}
          >
            <div style={{ fontSize: 38, fontWeight: 800, color: 'white', fontFamily: 'monospace', lineHeight: 1 }}>
              {totalEver.toLocaleString()}
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', letterSpacing: 3, textTransform: 'uppercase', marginTop: 8 }}>
              In Database
            </div>
          </div>

          {/* Total signals card */}
          <div
            onMouseEnter={() => setStatHover('total')}
            onMouseLeave={() => setStatHover(null)}
            style={{
              backgroundColor: 'rgba(255,255,255,0.03)',
              backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
              border: statHover === 'total' ? '1px solid rgba(255,255,255,0.22)' : '1px solid rgba(255,255,255,0.07)',
              borderRadius: 18, padding: '22px 36px', textAlign: 'center', minWidth: 140,
              transform: statHover === 'total' ? 'translateY(-3px) scale(1.03)' : 'translateY(0) scale(1)',
              transition: 'all 0.25s ease',
            }}
          >
            <div style={{ fontSize: 38, fontWeight: 800, color: 'white', fontFamily: 'monospace', lineHeight: 1 }}>
              {displayStats.total || 0}
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', letterSpacing: 3, textTransform: 'uppercase', marginTop: 8 }}>
              Total Signals
            </div>
          </div>

          {/* Dynamic per-source cards */}
          {availableSources.map(src => (
            <div
              key={src}
              onMouseEnter={() => setStatHover(src)}
              onMouseLeave={() => setStatHover(null)}
              style={{
                backgroundColor: 'rgba(255,255,255,0.03)',
                backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
                border: statHover === src ? '1px solid rgba(255,255,255,0.22)' : '1px solid rgba(255,255,255,0.07)',
                borderRadius: 18, padding: '22px 36px', textAlign: 'center', minWidth: 140,
                transform: statHover === src ? 'translateY(-3px) scale(1.03)' : 'translateY(0) scale(1)',
                transition: 'all 0.25s ease',
              }}
            >
              <div style={{ fontSize: 38, fontWeight: 800, color: 'white', fontFamily: 'monospace', lineHeight: 1 }}>
                {displayStats[src] || 0}
              </div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', letterSpacing: 3, textTransform: 'uppercase', marginTop: 8 }}>
                {formatSource(src)}
              </div>
            </div>
          ))}
        </div>

        {/* SEARCH BAR */}
        <div style={{ maxWidth: 620, margin: '0 auto 28px auto' }}>
          <input
            type="text"
            placeholder="Search signals..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            style={{
              width: '100%',
              backgroundColor: 'rgba(255,255,255,0.03)',
              backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
              border: searchFocused ? '1px solid rgba(255,255,255,0.35)' : '1px solid rgba(255,255,255,0.08)',
              borderRadius: 14, padding: '15px 22px',
              color: 'white', fontSize: 14, outline: 'none',
              letterSpacing: 1, transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
              boxShadow: searchFocused ? '0 0 24px rgba(255,255,255,0.06)' : 'none',
              fontFamily: 'inherit',
            }}
          />
        </div>

        {/* SIGNAL COUNT */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', letterSpacing: 3, textTransform: 'uppercase' }}>
            Showing {totalFiltered.toLocaleString()} signals &nbsp;·&nbsp; Page {currentPage} of {totalPages || 1}
          </span>
        </div>

        {/* LOADING STATE */}
        {loading && (
          <div style={{ textAlign: 'center', marginTop: 120 }}>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', letterSpacing: 5, textTransform: 'uppercase', animation: 'shimmer 1.5s ease infinite' }}>
              Loading signals...
            </p>
          </div>
        )}

        {/* EMPTY STATE */}
        {!loading && filteredSignals.length === 0 && (
          <div style={{ textAlign: 'center', marginTop: 120 }}>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.25)', letterSpacing: 4, textTransform: 'uppercase' }}>
              No signals found.
            </p>
          </div>
        )}

        {/* SIGNAL FEED */}
        {!loading && filteredSignals.length > 0 && (
          <div style={{ maxWidth: 820, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {paginatedSignals.map((signal, index) => (
              <div
                key={signal.id}
                onMouseEnter={() => setCardHover(signal.id)}
                onMouseLeave={() => setCardHover(null)}
                style={{
                  backgroundColor: 'rgba(255,255,255,0.03)',
                  backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
                  border: cardHover === signal.id ? '1px solid rgba(255,255,255,0.18)' : '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 20, padding: '22px 26px',
                  transform: cardHover === signal.id ? 'translateY(-2px)' : 'translateY(0)',
                  boxShadow: cardHover === signal.id ? '0 8px 40px rgba(255,255,255,0.04)' : 'none',
                  transition: 'all 0.25s ease',
                  animation: `fadeInUp 0.5s ease ${index * 0.04}s forwards`,
                  opacity: 0,
                }}
              >
                {/* Row 1: Title + Score */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                  <a href={signal.url} target="_blank" rel="noopener noreferrer" style={{
                    color: cardHover === signal.id ? 'rgba(255,255,255,0.75)' : 'white',
                    fontSize: 15, fontWeight: 600, textDecoration: 'none',
                    lineHeight: 1.5, flex: 1, transition: 'color 0.2s ease',
                  }}>
                    {signal.title}
                  </a>
                  <div style={{
                    backgroundColor: 'rgba(255,255,255,0.07)',
                    border: '1px solid rgba(255,255,255,0.14)',
                    borderRadius: 20, padding: '4px 13px',
                    fontSize: 13, fontWeight: 700, color: 'white',
                    whiteSpace: 'nowrap', fontFamily: 'monospace', flexShrink: 0,
                  }}>
                    {signal.score_weighted?.toFixed(2)}
                  </div>
                </div>

                {/* Row 2: Badges + Date */}
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 14, flexWrap: 'wrap' }}>
                  {signal.category && (
                    <span style={{
                      backgroundColor: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 20, padding: '3px 11px',
                      fontSize: 10, color: 'rgba(255,255,255,0.5)',
                      letterSpacing: 1.5, textTransform: 'uppercase',
                    }}>
                      {signal.category}
                    </span>
                  )}
                  {signal.source && (
                    <span style={{
                      backgroundColor: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 20, padding: '3px 11px',
                      fontSize: 10, color: 'rgba(255,255,255,0.5)',
                      letterSpacing: 1.5, textTransform: 'uppercase',
                    }}>
                      {formatSource(signal.source)}
                    </span>
                  )}
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', marginLeft: 'auto' }}>
                    {new Date(signal.crawled_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>

                {/* Row 3: Summary headline */}
                {signal.summary_data?.headline && (
                  <p style={{ margin: '12px 0 0 0', fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.65 }}>
                    {signal.summary_data.headline}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, marginTop: 32, marginBottom: 16 }}>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              style={{
                padding: '10px 24px', borderRadius: 10, fontSize: 12,
                backgroundColor: 'transparent',
                border: '1px solid rgba(255,255,255,0.12)',
                color: currentPage === 1 ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.6)',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
              }}
            >
              ← Prev
            </button>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', letterSpacing: 2 }}>
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              style={{
                padding: '10px 24px', borderRadius: 10, fontSize: 12,
                backgroundColor: 'transparent',
                border: '1px solid rgba(255,255,255,0.12)',
                color: currentPage === totalPages ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.6)',
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
              }}
            >
              Next →
            </button>
          </div>
        )}

        {/* FOOTER */}
        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.06)',
          padding: '32px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
          maxWidth: 820,
          margin: '0 auto',
        }}>
          <div>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', letterSpacing: 2, textTransform: 'uppercase' }}>
              Total Processed
            </span>
            <div style={{ fontSize: 28, fontWeight: 700, color: 'white', fontFamily: 'monospace', marginTop: 4 }}>
              {totalEver.toLocaleString()}
            </div>
          </div>
          {lastCrawled !== null && (
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', letterSpacing: 2, textTransform: 'uppercase' }}>
                Last Crawled
              </span>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>
                {lastCrawled.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                {' at '}
                {lastCrawled.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          )}
        </div>

      </div>
    </>
  )
}
