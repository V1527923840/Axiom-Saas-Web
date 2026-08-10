import { SignupForm3 } from "./components/signup-form-3"
import { SiteIcp } from "@/components/site-icp"

export default function SignUp3Page() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-background p-4">
      <SignupForm3 className="w-full max-w-5xl" />
      <SiteIcp />
    </div>
  )
}
