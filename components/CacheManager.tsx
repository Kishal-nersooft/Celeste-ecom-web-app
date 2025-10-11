'use client';

import React, { useState, useEffect } from 'react';
import { getCacheStats, clearProductCache, invalidateAllCache } from '@/lib/product-cache';

interface CacheManagerProps {
  showStats?: boolean;
  showControls?: boolean;
}

const CacheManager: React.FC<CacheManagerProps> = ({ 
  showStats = false, 
  showControls = false 
}) => {
  const [stats, setStats] = useState<{ size: number; entries: string[] }>({ size: 0, entries: [] });
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (showStats) {
      updateStats();
    }
  }, [showStats]);

  const updateStats = () => {
    const cacheStats = getCacheStats();
    setStats(cacheStats);
  };

  const handleClearCache = () => {
    clearProductCache();
    updateStats();
    console.log('📦 Cache cleared by user');
  };

  const handleClearAllCache = () => {
    invalidateAllCache();
    updateStats();
    console.log('📦 All cache cleared by user');
  };

  if (!showStats && !showControls) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Toggle Button */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="bg-blue-600 text-white p-2 rounded-full shadow-lg hover:bg-blue-700 transition-colors"
        title="Cache Manager"
      >
        📦
      </button>

      {/* Cache Panel */}
      {isVisible && (
        <div className="absolute bottom-12 right-0 bg-white border border-gray-200 rounded-lg shadow-xl p-4 min-w-80 max-w-96">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-semibold text-gray-900">Cache Manager</h3>
            <button
              onClick={() => setIsVisible(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          {showStats && (
            <div className="mb-4">
              <div className="text-sm text-gray-600 mb-2">
                <strong>Cache Entries:</strong> {stats.size}
              </div>
              {stats.entries.length > 0 && (
                <div className="text-xs text-gray-500 max-h-32 overflow-y-auto">
                  <div className="font-medium mb-1">Cached Queries:</div>
                  {stats.entries.map((entry, index) => (
                    <div key={index} className="truncate">
                      {entry}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {showControls && (
            <div className="space-y-2">
              <button
                onClick={handleClearCache}
                className="w-full bg-yellow-500 text-white px-3 py-2 rounded text-sm hover:bg-yellow-600 transition-colors"
              >
                Clear Product Cache
              </button>
              <button
                onClick={handleClearAllCache}
                className="w-full bg-red-500 text-white px-3 py-2 rounded text-sm hover:bg-red-600 transition-colors"
              >
                Clear All Cache
              </button>
              <button
                onClick={updateStats}
                className="w-full bg-gray-500 text-white px-3 py-2 rounded text-sm hover:bg-gray-600 transition-colors"
              >
                Refresh Stats
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CacheManager;
