import CategoriesPageClient from "./CategoriesPageClient";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

const CategoriesPage = async ({ params }: Props) => {
  const { slug } = await params;

  return <CategoriesPageClient categoryId={slug} />;
};

export default CategoriesPage;
