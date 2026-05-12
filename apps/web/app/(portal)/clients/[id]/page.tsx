import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getClientById } from "../_mock";

import { ClientDetail } from "./ClientDetail";

type Props = { params: { id: string } };

export function generateMetadata({ params }: Props): Metadata {
  const client = getClientById(params.id);
  return { title: client ? client.name : "Client" };
}

export default function ClientPage({ params }: Props) {
  // Existence check on the server so unknown IDs 404 cleanly. The full mock
  // (which contains lucide-react component refs that can't cross the RSC
  // boundary) is read inside ClientDetail itself.
  if (!getClientById(params.id)) notFound();
  return <ClientDetail id={params.id} />;
}
