import type { ComponentType } from "react";

type ComponentModule<ExportName extends string> = Record<
  ExportName,
  ComponentType
>;

export function lazyNamedRoute<ExportName extends string>(
  loadModule: () => Promise<ComponentModule<ExportName>>,
  exportName: ExportName,
) {
  return async () => {
    const module = await loadModule();
    return { Component: module[exportName] };
  };
}
