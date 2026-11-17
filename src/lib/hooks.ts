import { useEffect, useState } from 'react';
import { fetchAllCategories, fetchCatalog, fetchCategories, fetchProduct, type CatalogQuery, type CatalogResult } from './catalog';
import type { CatalogProduct, Category } from '../types';

interface AsyncState<T> {
  data: T;
  loading: boolean;
  error: string | null;
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'Não foi possível concluir esta consulta.';
}

export function useCatalog(query: CatalogQuery, refreshKey = 0, enabled = true): AsyncState<CatalogResult> & { stale: boolean } {
  const queryKey = JSON.stringify(query);
  const [state, setState] = useState<AsyncState<CatalogResult> & { queryKey: string }>({
    data: { products: [], total: 0, page: query.page ?? 1, pageSize: query.pageSize ?? 24 },
    loading: true,
    error: null,
    queryKey,
  });

  useEffect(() => {
    if (!enabled) {
      setState({
        data: { products: [], total: 0, page: query.page ?? 1, pageSize: query.pageSize ?? 24 },
        loading: false,
        error: null,
        queryKey,
      });
      return;
    }
    const controller = new AbortController();
    setState((current) => ({ ...current, loading: true, error: null }));
    void fetchCatalog(query, controller.signal)
      .then((data) => setState({ data, loading: false, error: null, queryKey }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState((current) => ({ ...current, loading: false, error: errorMessage(error), queryKey }));
      });
    return () => controller.abort();
    // queryKey é a chave estável (JSON.stringify) derivada de query, usada no
    // lugar do objeto para não refazer a consulta a cada render do chamador
    // (query é um literal novo a cada vez). O efeito lê query via closure.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, queryKey, refreshKey]);

  // `stale` marca o intervalo em que o estado ainda descreve a consulta
  // anterior: o React só aplica o loading:true no flush seguinte, então um
  // efeito do chamador que rode no mesmo flush da troca de query leria
  // data/loading do conteúdo antigo achando que já são do novo.
  return { data: state.data, loading: state.loading, error: state.error, stale: state.queryKey !== queryKey };
}

export function useCategories(refreshKey = 0): AsyncState<Category[]> {
  const [state, setState] = useState<AsyncState<Category[]>>({ data: [], loading: true, error: null });
  useEffect(() => {
    const controller = new AbortController();
    void fetchCategories(controller.signal)
      .then((data) => setState({ data, loading: false, error: null }))
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setState({ data: [], loading: false, error: errorMessage(error) });
      });
    return () => controller.abort();
  }, [refreshKey]);
  return state;
}

export function useAllCategories(refreshKey = 0): AsyncState<Category[]> {
  const [state, setState] = useState<AsyncState<Category[]>>({ data: [], loading: true, error: null });
  useEffect(() => {
    const controller = new AbortController();
    void fetchAllCategories(controller.signal)
      .then((data) => setState({ data, loading: false, error: null }))
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setState({ data: [], loading: false, error: errorMessage(error) });
      });
    return () => controller.abort();
  }, [refreshKey]);
  return state;
}

export function useProduct(identifier: string, refreshKey = 0): AsyncState<CatalogProduct | null> {
  const [state, setState] = useState<AsyncState<CatalogProduct | null>>({ data: null, loading: true, error: null });
  useEffect(() => {
    const controller = new AbortController();
    setState({ data: null, loading: true, error: null });
    void fetchProduct(identifier, controller.signal)
      .then((data) => setState({ data, loading: false, error: null }))
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setState({ data: null, loading: false, error: errorMessage(error) });
      });
    return () => controller.abort();
  }, [identifier, refreshKey]);
  return state;
}
