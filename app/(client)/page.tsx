import Container from "@/components/Container";
import { getHomeCatalogue } from "@/lib/home-catalogue";
import HomeClient from "./HomeClient";

// Catalogue is requested per visit (pricing/inventory). Data is fetched on the
// server below so the first HTML response includes categories and product rows.
export const dynamic = "force-dynamic";

export default async function Home() {
  const { products, categories, parentCategoryNames, parentProducts } =
    await getHomeCatalogue();

  return (
    <Container className="pb-10">
      <HomeClient
        products={products}
        categories={categories}
        parentCategoryNames={parentCategoryNames}
        parentProducts={parentProducts}
      />
    </Container>
  );
}
