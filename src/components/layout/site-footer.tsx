import { EthevexAttribution } from "@/components/brand/attribution/ethevex-attribution";
import { PageFrame } from "./page-frame";

export function SiteFooter() {
  return (
    <footer className="border-t border-border py-6">
      <PageFrame>
        <EthevexAttribution
          variant="inline"
          size="compact"
          appearance="inherit"
          className="site-attribution"
        />
      </PageFrame>
    </footer>
  );
}
