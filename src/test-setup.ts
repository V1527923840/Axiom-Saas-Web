import "@testing-library/jest-dom/vitest"
import { afterEach } from "vitest"
import { cleanup } from "@testing-library/react"

// vitest.config.ts sets `globals: false`, so RTL can't find a global `afterEach`
// to auto-register its cleanup. Without this, every render leaks into the next
// test's DOM — which for portal-based components (Sheet/Dialog) makes `getBy*`
// queries throw "found multiple elements".
afterEach(cleanup)
