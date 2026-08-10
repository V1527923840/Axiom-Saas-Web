import { SignupForm1 } from "./components/signup-form-1"
import { Logo } from "@/components/logo"
import { SiteIcp } from "@/components/site-icp"
import { LoginHeroSvg } from "@/components/illustrations/login-hero-svg"

export default function SignUpPage() {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <a href="/" className="flex items-center gap-2 font-medium">
            <div className="bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-md">
              <Logo size={24} />
            </div>
            Axiom
          </a>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-sm md:max-w-md">
            <SignupForm1 />
          </div>
        </div>
        <SiteIcp className="mt-auto" />
      </div>
      <div className="relative hidden bg-white text-slate-950 dark:bg-[#0A0A0A] dark:text-white lg:block">
        <LoginHeroSvg className="absolute inset-0 h-full w-full" />
      </div>
    </div>
  )
}