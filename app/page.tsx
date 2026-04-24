import { Dashboard } from "@/components/dashboard";
import { getDashboardData } from "@/lib/creative-intelligence";

export default async function Page() {
  const dashboardData = await getDashboardData();
  return <Dashboard data={dashboardData} />;
}
