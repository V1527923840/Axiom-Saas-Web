import { LoginForm3 } from "./components/login-form-3"
import { SiteIcp } from "@/components/site-icp"

export default function LoginPage() {
  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="w-full max-w-sm md:max-w-4xl">
        <LoginForm3 />
      </div>
      <SiteIcp />
    </div>
  )
}
