import type { Metadata } from "next";

import { ClinicView } from "./ClinicView";

export const metadata: Metadata = { title: "Clinic" };

export default function ClinicPage() {
  return <ClinicView />;
}
