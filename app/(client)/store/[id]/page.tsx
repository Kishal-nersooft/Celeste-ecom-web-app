import StorePageClient from './StorePageClient';

interface StorePageProps {
  params: {
    id: string;
  };
}

export default function StorePage({ params }: StorePageProps) {
  return <StorePageClient storeId={params.id} />;
}
