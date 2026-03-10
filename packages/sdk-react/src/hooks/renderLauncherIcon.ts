import type { ReactElement } from "react";

export async function renderLauncherIconToSvg(
  icon: ReactElement
): Promise<string> {
  const { renderToStaticMarkup } = await import("react-dom/server.browser");
  return renderToStaticMarkup(icon);
}
