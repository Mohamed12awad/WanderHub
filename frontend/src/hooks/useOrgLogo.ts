import { useState, useEffect } from "react";

const KEY = "ui-org-logo";

export function useOrgLogo() {
  const [logo, setLogoState] = useState<string | null>(() => localStorage.getItem(KEY));

  useEffect(() => {
    const handler = () => setLogoState(localStorage.getItem(KEY));
    window.addEventListener("org-logo-changed", handler);
    return () => window.removeEventListener("org-logo-changed", handler);
  }, []);

  const setLogo = (dataUrl: string | null) => {
    if (dataUrl) localStorage.setItem(KEY, dataUrl);
    else localStorage.removeItem(KEY);
    setLogoState(dataUrl);
    window.dispatchEvent(new Event("org-logo-changed"));
  };

  return { logo, setLogo };
}
