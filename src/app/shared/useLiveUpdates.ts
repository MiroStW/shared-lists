"use client";

import { useEffect, useRef } from "react";
import { getClientId } from "./clientId";

// Bursts of changes (e.g. an agent adding several items) are bundled into one
// reload per subscriber.
const DEBOUNCE_MS = 300;

type LiveChange = { listIds: string[]; clientId: string | null };

// `null` means the stream (re)opened and changes may have been missed.
type Subscriber = (listIds: string[] | null) => void;

// One EventSource per tab, shared by every hook instance and closed when the
// last one unmounts.
const subscribers = new Set<Subscriber>();
let source: EventSource | null = null;

const notify = (listIds: string[] | null) => {
  for (const subscriber of [...subscribers]) subscriber(listIds);
};

const openSource = () => {
  const eventSource = new EventSource("/api/events");

  eventSource.addEventListener("change", (event) => {
    let change: LiveChange;
    try {
      change = JSON.parse((event as MessageEvent<string>).data);
    } catch {
      return;
    }
    if (change.clientId === getClientId()) return;
    notify(change.listIds ?? []);
  });
  // Reload once whenever the stream (re)opens: changes made between the
  // initial data load and the subscription, or during a reconnect after an
  // error (the browser reconnects by itself), were not delivered.
  eventSource.onopen = () => notify(null);
  return eventSource;
};

const subscribe = (subscriber: Subscriber) => {
  subscribers.add(subscriber);
  source ??= openSource();
  return () => {
    subscribers.delete(subscriber);
    if (subscribers.size === 0 && source) {
      source.close();
      source = null;
    }
  };
};

// Calls `refresh` (debounced) when another tab, user or agent changed a list
// for which `affects` returns true, and once each time the stream (re)opens.
// `refresh` must reload without a loading state so nothing flickers.
export const useLiveUpdates = (
  affects: (listIds: string[]) => boolean,
  refresh: () => void,
) => {
  const affectsRef = useRef(affects);
  const refreshRef = useRef(refresh);
  useEffect(() => {
    affectsRef.current = affects;
    refreshRef.current = refresh;
  });

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = subscribe((listIds) => {
      if (listIds && !affectsRef.current(listIds)) return;
      clearTimeout(timer);
      timer = setTimeout(() => refreshRef.current(), DEBOUNCE_MS);
    });
    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, []);
};
