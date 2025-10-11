import Container from "@/components/Container";
import HomeClient from "./HomeClient";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export default function Home() {
  // Let HomeClient handle all data fetching on the client side
  // This ensures Firebase authentication context is available for pricing calculation
  return (
    <Container className="pb-10">
      <HomeClient products={[]} categories={[]} />
    </Container>
  );
}
