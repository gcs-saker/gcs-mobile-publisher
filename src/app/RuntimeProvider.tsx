import { createContext, type PropsWithChildren, useContext } from "react";
import { createBrowserRuntime } from "./browserRuntime";
import type { RuntimeDependencies } from "./ports";

const RuntimeContext = createContext<RuntimeDependencies | null>(null);
const defaultRuntime = createBrowserRuntime();

export interface RuntimeProviderProps extends PropsWithChildren {
  dependencies?: RuntimeDependencies;
}

export function RuntimeProvider({ children, dependencies = defaultRuntime }: RuntimeProviderProps) {
  return <RuntimeContext.Provider value={dependencies}>{children}</RuntimeContext.Provider>;
}

export function useRuntime(): RuntimeDependencies {
  const runtime = useContext(RuntimeContext);
  if (!runtime) throw new Error("RuntimeProvider is required");
  return runtime;
}
