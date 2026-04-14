import {
  useCallback,
  useEffect,
  useState,
  type DependencyList,
  type Dispatch,
  type SetStateAction,
} from "react";

export interface AsyncState<T> {
  data: T | null;
  error: string | null;
  isLoading: boolean;
  reload: () => Promise<void>;
  setData: Dispatch<SetStateAction<T | null>>;
}

export const useAsyncData = <T>(
  loader: () => Promise<T>,
  deps: DependencyList,
): AsyncState<T> => {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await loader();
      setData(result);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }, deps);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, error, isLoading, reload: load, setData };
};
