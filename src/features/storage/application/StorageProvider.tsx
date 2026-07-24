import { createContext, type PropsWithChildren, useContext, useRef } from "react";
import {
  createBrowserStorage,
  type StorageRepositories,
} from "./storageRuntime";

const StorageContext = createContext<Promise<StorageRepositories> | null>(null);

export interface StorageProviderProps extends PropsWithChildren {
  repositories?: Promise<StorageRepositories>;
}

export function StorageProvider({ children, repositories }: StorageProviderProps) {
  const repositoriesRef = useRef<Promise<StorageRepositories> | null>(null);
  if (!repositoriesRef.current) {
    repositoriesRef.current = repositories
      ?? createBrowserStorage(typeof indexedDB === "undefined" ? null : indexedDB);
  }
  return (
    <StorageContext.Provider value={repositoriesRef.current}>
      {children}
    </StorageContext.Provider>
  );
}

export function useStorageRepositories(): Promise<StorageRepositories> {
  const repositories = useContext(StorageContext);
  if (!repositories) throw new Error("StorageProvider is required");
  return repositories;
}
