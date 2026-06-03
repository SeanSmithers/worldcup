import { useEffect, useRef, useState } from "react";
import { FifaApi } from "../api/fifa";
import type { SnapshotResult } from "../api/types";
import type { Player } from "../lib/sweepstakes";

const POLL_INTERVAL_MS = 10_000;

export interface SweepstakesState {
  players: Player[] | null;
  snapshot: SnapshotResult | null;
  loading: boolean;
  error: string | null;
  groupId: string;
}

// Load /players/<groupId>.json and start polling the FIFA API. Returns
// {players, snapshot, loading, error}. The hook is responsible for cancelling
// in-flight requests and the polling interval when groupId changes / on unmount.
export function useSweepstakes(groupId: string): SweepstakesState {
  const [players, setPlayers] = useState<Player[] | null>(null);
  const [snapshot, setSnapshot] = useState<SnapshotResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const api = useRef(FifaApi.forWorldCup2026());

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setPlayers(null);
    setSnapshot(null);

    const loadPlayers = async () => {
      try {
        const url = `${import.meta.env.BASE_URL}players/${groupId}.json`;
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error(`No sweepstakes file at ${url} (${res.status})`);
        const data = (await res.json()) as { players: Player[] };
        if (!cancelled) setPlayers(data.players);
      } catch (e) {
        if (!cancelled) setError(toMessage(e));
      }
    };

    const loadSnapshot = async () => {
      try {
        const snap = await api.current.fetchSnapshot(controller.signal);
        if (!cancelled) {
          setSnapshot(snap);
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setError(toMessage(e));
          setLoading(false);
        }
      }
    };

    void loadPlayers();
    void loadSnapshot();

    const interval = window.setInterval(() => {
      void loadSnapshot();
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      controller.abort();
      window.clearInterval(interval);
    };
  }, [groupId]);

  return { players, snapshot, loading, error, groupId };
}

function toMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e);
}
