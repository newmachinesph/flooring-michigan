import type { Metadata } from "next";
import FlooringMichiganView from "./view";

export const metadata: Metadata = {
  title: "Premium Flooring in Michigan",
  description:
    "Explore Michigan flooring with precise filters, plank size sliders, and a modern catalog-focused experience.",
};

export default function FlooringMichiganPage() {
  return <FlooringMichiganView />;
}

