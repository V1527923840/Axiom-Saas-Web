import { siteConfig } from "@/config/site"

export function SiteFooter() {
  return (
    <footer className="border-t bg-background">
      <div className="px-4 py-6 lg:px-6">
        <div className="flex flex-col items-center justify-center space-y-2 text-center">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} {siteConfig.fullName}. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground">
            <a
              href={siteConfig.icp.recordUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="hover:text-primary"
            >
              {siteConfig.icp.recordNumber}
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}
