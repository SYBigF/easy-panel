import { PageShell } from "../../../_components/dashboard-shell";
import { PageHeader } from "../../../_components/page-header";
import { UsersUsage } from "./users-usage";

export default function UsersPage({ }) {
  return (
    <PageShell>
      <PageHeader heading="Usage" text="用户使用量" />
      <UsersUsage />
    </PageShell>
  );
}
