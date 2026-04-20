import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { SignInButton } from "@/components/auth/sign-in-button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { authOptions } from "@/lib/auth";

export default async function LoginPage() {
  const session = await getServerSession(authOptions);

  if (session?.user?.id) {
    redirect("/dashboard");
  }

  return (
    <main className="mx-auto flex min-h-[100svh] w-full max-w-xl items-center px-4 py-8 sm:px-6 sm:py-10">
      <Card className="w-full p-5 sm:p-8">
        <div className="space-y-5">
          <Badge className="w-fit">Google Sign-in</Badge>
          <div>
            <h1 className="text-3xl font-semibold text-foreground sm:text-4xl">Sign in to Ember</h1>
            <p className="mt-2 text-sm text-muted">Choose mode and continue with Google.</p>
          </div>
          <div className="grid gap-3">
            <SignInButton
              callbackUrl="/dashboard"
              label="Continue as user"
              modeIntent="user"
            />
            <SignInButton
              callbackUrl="/partner?mode=viewer"
              label="Continue as partner"
              variant="secondary"
              modeIntent="partner"
            />
          </div>
        </div>
      </Card>
    </main>
  );
}
