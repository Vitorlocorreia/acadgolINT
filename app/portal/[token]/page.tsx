import { notFound } from "next/navigation";
import type { Viewport } from "next";
import { getStudentPortalData } from "../actions";
import { PortalClient } from "./portal-client";

export const metadata = {
  title: "Sport Club do Recife | Portal do Responsável",
  description:
    "Portal do Responsável - Escolinha Oficial do Sport Club do Recife",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#c81930",
};

interface Props {
  params: Promise<{ token: string }>;
}

export default async function StudentPortalPage({ params }: Props) {
  const { token } = await params;
  const data = await getStudentPortalData(token);

  if (!data) {
    notFound();
  }

  return <PortalClient data={data} />;
}
