import { ArrowUpRight, GoogleLogo } from "@phosphor-icons/react";
import { useState } from "react";
import { authClient } from "./auth-client.ts";
import { OrbitField, Sigil } from "./Mark.tsx";

type Config = { googleEnabled: boolean };

const GENERIC = "Access denied.";

export function LoginPage({ config }: { config: Config | null }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function google() {
    setError(null);
    setPending(true);
    const { error: err } = await authClient.signIn.social({
      provider: "google",
      callbackURL: "/_rasputin/",
    });
    setPending(false);
    if (err) {
      setError(GENERIC);
    }
  }

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-void text-ice">
      <div
        className="pointer-events-none absolute -left-24 -top-24 h-[28rem] w-[28rem] rounded-full bg-emerald-500/20 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-32 right-0 h-[32rem] w-[32rem] rounded-full bg-cyan-400/10 blur-3xl"
        aria-hidden
      />

      <div className="relative mx-auto grid min-h-[100dvh] w-full max-w-[1400px] grid-cols-1 md:grid-cols-2">
        <section className="flex flex-col justify-between px-4 py-10 md:px-12 md:py-16 lg:px-16">
          <div className="rise flex items-center gap-3">
            <Sigil className="h-9 w-9 text-signal" />
            <span className="font-display text-[11px] uppercase tracking-[0.32em] text-signal">
              Rasputin
            </span>
          </div>

          <div className="max-w-xl py-16 md:py-0">
            <p className="rise rise-2 mb-6 inline-flex rounded-full border border-white/10 px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-signal">
              Clearance gate
            </p>
            <h1 className="font-display rise rise-3 text-[clamp(3.4rem,9vw,6.8rem)] font-semibold leading-[0.86] tracking-[-0.05em]">
              Enter
              <br />
              the wire.
            </h1>
            <p className="rise rise-4 mt-6 max-w-md text-base leading-relaxed text-ice/55 md:text-lg">
              Authenticated corridor into Winnow. Allowlisted operators only.
              The IDE never faces the public net.
            </p>

            <div className="rise rise-4 mt-10">
              {config === null ? (
                <p className="text-sm text-ice/40">Checking clearance…</p>
              ) : config.googleEnabled ? (
                <button
                  type="button"
                  onClick={() => void google()}
                  disabled={pending}
                  className="group inline-flex items-center rounded-full bg-ice py-1.5 pl-6 pr-1.5 text-[12px] font-semibold uppercase tracking-[0.18em] text-void transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:scale-[0.99] active:scale-[0.98] disabled:opacity-50"
                >
                  <GoogleLogo weight="light" className="mr-3 h-5 w-5" />
                  {pending ? "Handshaking" : "Continue with Google"}
                  <span className="ml-4 grid h-10 w-10 place-items-center rounded-full bg-void/10 transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-1 group-hover:-translate-y-px group-hover:scale-105">
                    <ArrowUpRight weight="light" className="h-4 w-4" />
                  </span>
                </button>
              ) : (
                <p className="text-sm text-ice/45">
                  Google sign-in is not configured on this host.
                </p>
              )}
              {error ? (
                <p className="mt-5 text-sm text-rose-300/90">{error}</p>
              ) : null}
            </div>
          </div>

          <p className="rise text-[10px] uppercase tracking-[0.28em] text-ice/30">
            Citadel corridor · encrypted session
          </p>
        </section>

        <aside className="relative hidden min-h-[42vh] md:block">
          <div className="absolute inset-6 rounded-[2rem] bg-white/5 p-1.5 ring-1 ring-white/10">
            <div className="relative h-full overflow-hidden rounded-[calc(2rem-0.375rem)] bg-[#080808] shadow-[inset_0_1px_1px_rgba(255,255,255,0.14)]">
              <OrbitField className="absolute inset-0 h-full w-full opacity-90" />
              <div className="absolute bottom-8 left-8 right-8">
                <p className="font-display text-xs uppercase tracking-[0.28em] text-signal">
                  Vector lock
                </p>
                <p className="mt-2 max-w-xs text-sm leading-relaxed text-ice/50">
                  Session tokens stay on Rasputin. Winnow sees only a machine
                  bearer.
                </p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
