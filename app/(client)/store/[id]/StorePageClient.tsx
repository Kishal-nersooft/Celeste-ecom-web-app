'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import ProductList from '@/components/ProductList';
import Container from '@/components/Container';
import { getStoreById } from '@/lib/api';
import { useLocation } from '@/contexts/LocationContext';
import { useCategory } from '@/contexts/CategoryContext';
import { Store } from '@/types/store';
import storeImage from '@/images/store-image.jpeg';
import celesteLogo from '@/images/CelesteLogoiconwhitecopy2.png';

const StorePageClient: React.FC<{ storeId: string }> = ({ storeId }) => {
  const { selectedStore } = useLocation();
  const { categories } = useCategory();
  const [store, setStore] = useState<Store | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadStore() {
      if (selectedStore && String(selectedStore.id) === String(storeId)) {
        setStore(selectedStore);
        return;
      }

      try {
        const storeData = await getStoreById(storeId);
        if (!cancelled && storeData) setStore(storeData);
      } catch (error) {
        console.error('Error fetching store:', error);
        if (!cancelled && selectedStore) setStore(selectedStore);
      }
    }

    loadStore();
    return () => {
      cancelled = true;
    };
  }, [storeId, selectedStore]);

  const storeName = store?.name || 'Store';

  return (
    <div className="min-h-screen bg-white">
      <div className="relative h-20 overflow-hidden bg-neutral-900 sm:h-24 md:h-28">
        <Image
          src={storeImage}
          alt=""
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/35 to-black/20" />
      </div>

      <Container className="relative pb-10">
        <div className="-mt-6 flex flex-col items-center text-center sm:-mt-7">
          <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-black ring-4 ring-white sm:h-14 sm:w-14">
            <Image
              src={celesteLogo}
              alt=""
              width={40}
              height={40}
              className="h-8 w-8 object-contain sm:h-9 sm:w-9"
            />
          </div>
          <h1 className="mt-3 max-w-2xl text-2xl font-bold tracking-tight text-neutral-950 sm:text-3xl">
            {storeName}
          </h1>
        </div>

        <div className="mt-4">
          <ProductList
            products={[]}
            categories={categories}
            title
            storeId={parseInt(storeId, 10)}
          />
        </div>
      </Container>
    </div>
  );
};

export default StorePageClient;
