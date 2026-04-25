import { Dashboard } from "@/components/dashboard";
import { getDashboardData } from "@/lib/creative-intelligence";

export default async function Page() {
  const data = await getDashboardData();
  return <Dashboard data={data} />;
}
