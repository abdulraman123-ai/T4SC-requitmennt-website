"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type AttemptPathway = "general" | "department" | "practical";
type AttemptPhase = "loading" | "not_started" | "starting" | "active" | "submitted" | "error";
type SaveState = "not_saved" | "saving" | "saved" | "not_confirmed";

type AttemptEnvelope = {
  idempotencyKey: string;
  attemptToken: string;
  attemptId?: string;
};

type AttemptData = {
  id: string;
  status: string;
  response?: Record<string, unknown>;
  responseVersion?: number;
  startedAt?: string;
  expiresAt?: string | null;
  lastSavedAt?: string | null;
  submittedAt?: string | null;
};

type Options = {
  reference: string;
  email: string;
  pathway: AttemptPathway;
  department?: string;
};

export function useAssessmentAttempt({ reference, email, pathway, department }: Options) {
  const [phase, setPhase] = useState<AttemptPhase>("loading");
  const [error, setError] = useState("");
  const [attemptId, setAttemptId] = useState("");
  const [restoredResponse, setRestoredResponse] = useState<Record<string, unknown>>({});
  const [responseVersion, setResponseVersion] = useState(0);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("not_saved");
  const tokenRef = useRef("");
  const versionRef = useRef(0);
  const saveQueueRef = useRef<Promise<boolean>>(Promise.resolve(true));

  const storageKey = reference
    ? "t4sc-attempt:" + reference + ":" + pathway + ":" + (department || "")
    : "";

  const storeAttempt = useCallback((value: AttemptEnvelope) => {
    if (!storageKey) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(value));
    } catch {
      setError("This browser could not save the secure attempt details. Enable local storage before starting.");
    }
  }, [storageKey]);

  const acceptAttempt = useCallback((data: AttemptData, envelope: AttemptEnvelope) => {
    const nextEnvelope = { ...envelope, attemptId: data.id };
    tokenRef.current = envelope.attemptToken;
    setAttemptId(data.id);
    versionRef.current = data.responseVersion ?? 0;
    setResponseVersion(data.responseVersion ?? 0);
    setRestoredResponse(data.response && typeof data.response === "object" ? data.response : {});
    setLastSavedAt(data.lastSavedAt ?? null);
    setPhase(data.status === "submitted" ? "submitted" : data.status === "active" ? "active" : "error");
    storeAttempt(nextEnvelope);
    if (data.status !== "active" && data.status !== "submitted") {
      setError("This assessment attempt is not active. Contact T4SC support for assistance.");
    }
  }, [storeAttempt]);

  const postAttempt = useCallback(async (payload: Record<string, unknown>) => {
    const response = await fetch("/api/assessments/attempts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(typeof data.error === "string" ? data.error : "The assessment attempt service could not confirm this action.");
    }
    return data as { attempt: AttemptData; saved?: boolean; responseVersion?: number; lastSavedAt?: string };
  }, []);

  useEffect(() => {
    if (!reference || !email || !storageKey) return;
    let cancelled = false;

    async function restore() {
      setPhase("loading");
      setError("");
      let envelope: AttemptEnvelope | null = null;
      try {
        const raw = localStorage.getItem(storageKey);
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<AttemptEnvelope>;
          if (
            typeof parsed.idempotencyKey === "string" &&
            typeof parsed.attemptToken === "string"
          ) {
            envelope = {
              idempotencyKey: parsed.idempotencyKey,
              attemptToken: parsed.attemptToken,
              ...(typeof parsed.attemptId === "string" ? { attemptId: parsed.attemptId } : {}),
            };
          }
        }
      } catch {
        envelope = null;
      }

      if (cancelled) return;
      if (!envelope) {
        setPhase("not_started");
        return;
      }

      try {
        const action = envelope.attemptId ? "attempt_read" : "attempt_start";
        const data = await postAttempt({
          action,
          reference,
          email,
          pathway,
          ...(department ? { department } : {}),
          idempotencyKey: envelope.idempotencyKey,
          attemptToken: envelope.attemptToken,
          ...(envelope.attemptId ? { attemptId: envelope.attemptId } : {}),
        });
        if (cancelled) return;
        acceptAttempt(data.attempt, envelope);
      } catch (restoreError) {
        if (cancelled) return;
        setPhase("error");
        setError(restoreError instanceof Error ? restoreError.message : "Your assessment could not be restored. Contact T4SC support.");
      }
    }

    void restore();
    return () => { cancelled = true; };
  }, [reference, email, pathway, department, storageKey, postAttempt, acceptAttempt]);

  const start = useCallback(async () => {
    if (!reference || !email || phase === "starting" || phase === "active") return false;
    setError("");
    setPhase("starting");
    let envelope: AttemptEnvelope;
    try {
      const raw = localStorage.getItem(storageKey);
      const parsed = raw ? JSON.parse(raw) as Partial<AttemptEnvelope> : null;
      envelope = parsed && typeof parsed.idempotencyKey === "string" && typeof parsed.attemptToken === "string"
        ? { idempotencyKey: parsed.idempotencyKey, attemptToken: parsed.attemptToken, ...(typeof parsed.attemptId === "string" ? { attemptId: parsed.attemptId } : {}) }
        : { idempotencyKey: crypto.randomUUID(), attemptToken: crypto.randomUUID() };
      storeAttempt(envelope);
      const data = await postAttempt({
        action: "attempt_start",
        reference,
        email,
        pathway,
        ...(department ? { department } : {}),
        idempotencyKey: envelope.idempotencyKey,
        attemptToken: envelope.attemptToken,
      });
      acceptAttempt(data.attempt, envelope);
      return data.attempt.status === "active";
    } catch (startError) {
      setPhase("error");
      setError(startError instanceof Error ? startError.message : "T4SC could not start the official attempt.");
      return false;
    }
  }, [reference, email, pathway, department, phase, storageKey, postAttempt, acceptAttempt, storeAttempt]);

  const saveCheckpoint = useCallback((response: Record<string, unknown>) => {
    const queued = saveQueueRef.current.then(async () => {
      if (!attemptId || !tokenRef.current || phase !== "active") return false;
      setSaveState("saving");
      const nextVersion = versionRef.current + 1;
      try {
        const data = await postAttempt({
          action: "attempt_save",
          reference,
          email,
          attemptId,
          attemptToken: tokenRef.current,
          responseVersion: nextVersion,
          response,
        });
        const acceptedVersion = data.responseVersion ?? nextVersion;
        versionRef.current = Math.max(versionRef.current, acceptedVersion);
        setResponseVersion(versionRef.current);
        setLastSavedAt(data.lastSavedAt ?? null);
        setSaveState("saved");
        return true;
      } catch {
        setSaveState("not_confirmed");
        return false;
      }
    });
    saveQueueRef.current = queued;
    return queued;
  }, [attemptId, phase, postAttempt, reference, email]);

  return {
    phase,
    started: phase === "active",
    attemptId,
    restoredResponse,
    responseVersion,
    lastSavedAt,
    saveState,
    error,
    start,
    saveCheckpoint,
  };
}
