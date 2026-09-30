'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, MapPin } from 'lucide-react';
import { useLocation } from '@/contexts/LocationContext';
import { Store } from '@/types/store';
import { cn } from '@/lib/utils';

interface StoreCardProps {
  store: Store;
  distanceLabel?: string | null;
  selected?: boolean;
}

function areaInitials(name: string) {
  const area = name.replace(/^celeste\s+daily\s*/i, '').trim() || name;
  const parts = area.split(/[\s-]+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const StoreCard: React.FC<StoreCardProps> = ({ store, distanceLabel, selected = false }) => {
  const router = useRouter();
  const { setSelectedStore, setSelectedLocation, setDeliveryType, setHasSelectedDeliveryType } = useLocation();

  const handleStoreClick = () => {
    setSelectedStore(store);
    setSelectedLocation(store.name);
    setDeliveryType('pickup');
    setHasSelectedDeliveryType(true);
    router.push(`/store/${store.id}`);
  };

  return (
    <button
      type="button"
      onClick={handleStoreClick}
      className={cn(
        'group flex w-full items-stretch gap-3 rounded-2xl border bg-white p-3 text-left transition-all sm:gap-4 sm:p-4',
        selected
          ? 'border-black shadow-sm'
          : 'border-neutral-200 hover:-translate-y-0.5 hover:border-neutral-900 hover:shadow-md'
      )}
    >
      <span
        className={cn(
          'flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center rounded-xl text-lg font-semibold tracking-tight sm:h-24 sm:w-24 sm:text-xl',
          selected ? 'bg-black text-white' : 'bg-neutral-100 text-neutral-900 group-hover:bg-black group-hover:text-white'
        )}
        aria-hidden
      >
        {areaInitials(store.name)}
      </span>

      <span className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
        <span className="flex items-start justify-between gap-3">
          <span className="min-w-0">
            <span className="block truncate text-base font-semibold leading-tight text-neutral-950 sm:text-lg">
              {store.name}
            </span>
            <span className="mt-1 flex items-start gap-1.5 text-sm text-neutral-500">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span className="line-clamp-2">{store.address}</span>
            </span>
          </span>
          {distanceLabel && (
            <span className="shrink-0 rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-700">
              {distanceLabel}
            </span>
          )}
        </span>

        <span className="mt-3 flex items-center justify-between gap-3">
          <span className="text-xs font-medium uppercase tracking-wide text-neutral-400">
            {selected ? 'Your store' : 'Pickup'}
          </span>
          <span className="inline-flex items-center gap-1 text-sm font-medium text-neutral-900">
            Shop
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </span>
        </span>
      </span>
    </button>
  );
};

export default StoreCard;
