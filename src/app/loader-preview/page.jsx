import { notFound } from "next/navigation";
import LoaderPreviewClient from "./LoaderPreviewClient";

export const metadata = {
  title: "Loader preview — SpendScope",
  robots: { index: false, follow: false },
};

/**
 * Developer-only page for viewing every SpendScope loader variant.
 * Returns the 404 page in production builds unless NEXT_PUBLIC_ENABLE_LOADER_PREVIEW=1.
 */
export default function LoaderPreviewPage() {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.NEXT_PUBLIC_ENABLE_LOADER_PREVIEW !== "1"
  ) {
    notFound();
  }
  return <LoaderPreviewClient />;
}
