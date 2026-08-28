import { ArrowUpRight, Broadcast, SignOut } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { authClient } from "./auth-client.ts";
import { Sigil } from "./Mark.tsx";

type Health = { ok: boolean; status?: number };

export function HomePage() {
  const [email, setEmail] = useState<string | null>(null);
  const [health, setHealth] = useState<Health | null>(null);

  useEffect(() => {
    void (async () => {
      const me = await fetch("/_rasputin/api/me", { credentials: "include" });
      if (!me.ok) {
        window.location.assign("/login");
        return;
      }
      const body = (await me.json()) as { user: { email: string } };
      setEmail(body.user.email);
      const probe = await fetch("/_rasputin/api/upstream-health", {
        credentials: "include",
      });
      const data = (await probe.json()) as Health;
      setHealth({ ok: probe.ok && data.ok, status: data.status });
    })().catch(() => {
      setHealth({ ok: false });
    });
  }, []);

  async function signOut() {
    await authClient.signOut();
    window.location.assign("/login");
  }

  const live = health?.ok === true;
  const checking = health === null;

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-void text-ice">
      <div
        className="pointer-events-none absolute left-[-10%] top-[-20%] h-[28rem] w-[28rem] rounded-full bg-emerald-400/15 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-[-20%] right-[-8%] h-[30rem] w-[30rem] rounded-full bg-cyan-400/10 blur-3xl"
        aria-hidden
      />

      <div className="relative mx-auto flex min-h-[100dvh] max-w-[1200px] flex-col px-4 py-8 md:px-10 md:py-12">
        <header className="rise flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Sigil className="h-8 w-8 text-signal" />
            <span className="font-display text-[11px] uppercase tracking-[0.32em] text-signal">
              Rasputin
            </span>
          </div>
          <button
            type="button"
            onClick={() => void signOut()}
            className="group inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-ice/60 transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:scale-[0.98]"
          >
            <SignOut weight="light" className="h-4 w-4" />
            Sign out
          </button>
        </header>

        <div className="grid flex-1 grid-cols-1 gap-6 py-24 md:grid-cols-12 md:gap-8 md:py-32">
          <section className="md:col-span-7">
            <p className="rise rise-2 mb-5 inline-flex rounded-full border border-white/10 px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-signal">
              Cockpit
            </p>
            <h1 className="font-display rise rise-3 text-[clamp(3rem,8vw,6rem)] font-semibold leading-[0.88] tracking-[-0.05em]">
              {live ? "Winnow is live." : checking ? "Syncing link." : "Winnow is down."}
            </h1>
            <p className="rise rise-4 mt-6 max-w-lg text-base leading-relaxed text-ice/55 md:text-lg">
              {live
                ? "The IDE host is answering. Launch into the workspace. A cockpit overlay sits on the IDE so you can return here."
                : checking
                  ? "Probing the IDE host."
                  : "The gateway is up. The machine running Winnow is not responding. Start the IDE on the host, then retry."}
            </p>
            <p className="rise rise-4 mt-8 text-[11px] uppercase tracking-[0.2em] text-ice/35">
              Operator {email ?? "…"}
            </p>
          </section>

          <div className="grid grid-cols-1 gap-4 md:col-span-5">
            <div className="rise rise-3 rounded-[2rem] bg-white/5 p-1.5 ring-1 ring-white/10">
              <div className="rounded-[calc(2rem-0.375rem)] bg-[#080808] p-6 shadow-[inset_0_1px_1px_rgba(255,255,255,0.14)]">
                <div className="mb-6 flex items-center gap-3 text-signal">
                  <Broadcast weight="light" className="h-6 w-6" />
                  <span className="text-[10px] uppercase tracking-[0.22em]">
                    Host link
                  </span>
                </div>
                <p className="font-display text-3xl tracking-[-0.03em]">
                  {checking ? "—" : live ? "Online" : "Offline"}
                </p>
                <p className="mt-2 text-sm text-ice/45">
                  {checking
                    ? "Waiting on /api/health"
                    : live
                      ? "Health probe succeeded"
                      : "Health probe failed"}
                </p>
              </div>
            </div>

            <div className="rise rise-4 rounded-[2rem] bg-white/5 p-1.5 ring-1 ring-white/10">
              <div className="flex h-full flex-col justify-between rounded-[calc(2rem-0.375rem)] bg-[#080808] p-6 shadow-[inset_0_1px_1px_rgba(255,255,255,0.14)]">
                {live ? (
                  <a
                    href="/"
                    className="group inline-flex w-full items-center justify-between rounded-full bg-ice py-1.5 pl-6 pr-1.5 text-[12px] font-semibold uppercase tracking-[0.16em] text-void transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:scale-[0.99] active:scale-[0.98]"
                  >
                    Launch Winnow
                    <span className="grid h-10 w-10 place-items-center rounded-full bg-void/10 transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-1 group-hover:-translate-y-px">
                      <ArrowUpRight weight="light" className="h-4 w-4" />
                    </span>
                  </a>
                ) : (
                  <p className="text-sm leading-relaxed text-ice/50">
                    Launch is held until the host answers. This is not a
                    gateway failure.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
