import { useEffect, useState } from "react";
import { HomePage } from "./Home.tsx";
import { LoginPage } from "./Login.tsx";

type Config = { googleEnabled: boolean; passwordEnabled: boolean };

export function App() {
  const path = window.location.pathname;
  const onHome =
    path === "/_rasputin" ||
    path === "/_rasputin/" ||
    path === "/_rasputin/status";

  const [config, setConfig] = useState<Config | null>(null);

  useEffect(() => {
    void fetch("/_rasputin/api/config")
      .then((res) => res.json())
      .then(setConfig)
      .catch(() => setConfig({ googleEnabled: false, passwordEnabled: false }));
  }, []);

  return (
    <>
      <div className="grain" aria-hidden />
      {onHome ? <HomePage /> : <LoginPage config={config} />}
    </>
  );
}
