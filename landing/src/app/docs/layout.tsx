import "./docs.css";
import DocsLayout from "./DocsLayout";

export const metadata = {
  title: "Docs — Clustr",
  description: "Documentation for Clustr, the multi-agent workspace for AI coding.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <DocsLayout>{children}</DocsLayout>;
}
