import { useLocalSearchParams } from "expo-router";

import CategoryPage from "@/components/CategoryPage";

// Fallback page for categories without their own file (e.g. new ones added from admin)
export default function CategoryScreen() {
  const { categoryId } = useLocalSearchParams();

  return <CategoryPage categoryId={categoryId} />;
}
