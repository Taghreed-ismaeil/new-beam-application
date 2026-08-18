import { useLocalSearchParams } from "expo-router";

export default function ConfirmScreen() {
  const { from } = useLocalSearchParams();

  console.log("FROM:", from);

  return <h1>hi</h1>;
}
