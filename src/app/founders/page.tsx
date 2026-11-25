import type { Metadata } from "next";
import { Founders } from "@/components/founders";

export const metadata: Metadata = { title: "For founders · Should I Apply?" };

export default function Page() {
  return <Founders />;
}
