import { ForgotPasswordForm3 } from "./components/forgot-password-form-3"
import { SiteIcp } from "@/components/site-icp"

export default function ForgotPassword3Page() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-background p-4">
      <ForgotPasswordForm3 className="w-full max-w-sm md:max-w-4xl" />
      <SiteIcp />
    </div>
  )
}
