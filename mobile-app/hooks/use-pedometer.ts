import { useState, useEffect, useRef } from "react";
import { Accelerometer } from "expo-sensors";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import NetInfo from "@react-native-community/netinfo";

const STORAGE_KEY_USERID = "userId";
const STORAGE_KEY_STEPS = "stepDeltas";
const STORAGE_KEY_LAST_SYNCED = "lastSyncedTimestamp";
const POLL_INTERVAL = 2000;
const API_BASE = "http://192.168.100.8:5000/api";

export const usePedometer = () => {
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [isOffline, setIsOffline] = useState(true);
  const [userId, setUserId] = useState<string>("");
  const [deviceSteps, setDeviceSteps] = useState<number>(0);
  const [fetchedTotal, setFetchedTotal] = useState<number>(0);
  const [pendingSum, setPendingSum] = useState<number>(0);
  const [liveDelta, setLiveDelta] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const lastTimestamp = useRef(0);
  const lastMagnitude = useRef(0);
  const deviceStepsRef = useRef(0);
  const deviceStepsAtLastPollRef = useRef(0);
  const pendingEntriesRef = useRef<any[]>([]);
  const userIdRef = useRef("");

  const totalSteps = fetchedTotal + pendingSum + liveDelta;

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const offline = !state.isConnected;
      setIsOffline(offline);
      console.log(`[NET] ${offline ? "Offline" : "Online"}`);
      if (!offline && pendingEntriesRef.current.length > 0) {
        console.log("[NET] Reconnected, auto-syncing...");
        syncPending();
      }
    });

    NetInfo.fetch().then((state) => {
      setIsOffline(!state.isConnected);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const initUserId = async () => {
      try {
        let id = await AsyncStorage.getItem(STORAGE_KEY_USERID);
        if (!id) {
          id = Math.random().toString(36).substring(2, 8);
          await AsyncStorage.setItem(STORAGE_KEY_USERID, id);
        }
        setUserId(id);
        userIdRef.current = id;
      } catch (err) {
        setError("Failed to generate user ID");
      }
    };
    initUserId();
  }, []);

  useEffect(() => {
    if (!userId) return;
    const loadData = async () => {
      try {
        const cached = await AsyncStorage.getItem(STORAGE_KEY_STEPS);
        const entries = cached ? JSON.parse(cached) : [];
        pendingEntriesRef.current = entries;
        setPendingSum(
          entries.reduce(
            (acc: number, e: { steps: number }) => acc + e.steps,
            0
          )
        );

        if (!isOffline) {
          const { data } = await axios.get(`${API_BASE}/steps`, {
            params: { userId, aggregate: "sum" },
          });
          setFetchedTotal(data.total || 0);
        }
      } catch (err) {
        console.error("Load failed:", err);
        if (!isOffline) setError("Failed to load data");
      }
    };
    loadData();
  }, [userId, isOffline]);

  useEffect(() => {
    let subscription: any = null;
    let pollInterval: number;

    const startAccelerometer = async () => {
      try {
        const available = await Accelerometer.isAvailableAsync();
        setIsAvailable(available);
        console.log("Accelerometer available:", available);

        if (!available) {
          setError("Accelerometer not available on this device");
          return;
        }

        Accelerometer.setUpdateInterval(100);

        subscription = Accelerometer.addListener((data) => {
          const { x, y, z } = data;
          const now = Date.now();
          const magnitude = Math.sqrt(x * x + y * y + z * z);

          if (now - lastTimestamp.current > 250) {
            const magnitudeChange = Math.abs(magnitude - lastMagnitude.current);

            if (magnitudeChange > 0.5 && magnitudeChange < 3.0) {
              deviceStepsRef.current += 1;
              const newSteps = deviceStepsRef.current;
              setDeviceSteps(newSteps);
              console.log("Step detected! Total:", newSteps);

              const delta = newSteps - deviceStepsAtLastPollRef.current;
              setLiveDelta(delta);
            }

            lastMagnitude.current = magnitude;
            lastTimestamp.current = now;
          }
        });

        setError(null);

        pollInterval = setInterval(() => {
          handlePoll();
        }, POLL_INTERVAL);
      } catch (err) {
        setError("Failed to start step counting");
      }
    };

    startAccelerometer();

    return () => {
      if (subscription) {
        subscription.remove();
      }
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, []);

  const handlePoll = async () => {
    const currentSteps = deviceStepsRef.current;
    const lastPolled = deviceStepsAtLastPollRef.current;
    const uid = userIdRef.current;

    if (!uid || currentSteps <= lastPolled) {
      console.log("[POLL] No new steps to sync");
      return;
    }

    const delta = currentSteps - lastPolled;
    const entry = { timestamp: Date.now(), steps: delta };

    const newPending = [...pendingEntriesRef.current, entry];
    pendingEntriesRef.current = newPending;
    setPendingSum((prev) => prev + delta);
    await AsyncStorage.setItem(STORAGE_KEY_STEPS, JSON.stringify(newPending));

    setLiveDelta(0);
    deviceStepsAtLastPollRef.current = currentSteps;

    console.log(
      `[POLL] Batched ${delta} steps locally. Pending: ${newPending.length}`
    );

    if (!isOffline && !isSyncing) {
      await syncPending();
    }
  };

  const syncPending = async () => {
    const uid = userIdRef.current;
    const pending = pendingEntriesRef.current;

    if (!uid || pending.length === 0 || isOffline) {
      if (isOffline) console.log("[SYNC] Offline, skipping sync");
      return;
    }

    if (isSyncing) {
      console.log("[SYNC] Already syncing, skipping");
      return;
    }

    setIsSyncing(true);
    try {
      const lastSyncedStr =
        (await AsyncStorage.getItem(STORAGE_KEY_LAST_SYNCED)) || "0";
      let lastDbTs = parseInt(lastSyncedStr);

      const { data: lastEntryRes } = await axios.get(`${API_BASE}/steps`, {
        params: { userId: uid, limit: 1, sort: "-timestamp" },
      });
      if (lastEntryRes.data && lastEntryRes.data.length > 0) {
        lastDbTs = new Date(lastEntryRes.data[0].timestamp).getTime();
      }

      const pendingToSend = pending.filter((e: any) => e.timestamp > lastDbTs);

      if (pendingToSend.length === 0) {
        console.log("[SYNC] Up to date");
        setIsSyncing(false);
        return;
      }

      const sentSum = pendingToSend.reduce(
        (acc: number, e: any) => acc + e.steps,
        0
      );

      for (const entry of pendingToSend) {
        await axios.post(`${API_BASE}/steps`, {
          userId: uid,
          timestamp: entry.timestamp,
          steps: entry.steps,
        });
      }

      const remaining = pending.filter(
        (e: any) => !pendingToSend.some((p: any) => p.timestamp === e.timestamp)
      );
      pendingEntriesRef.current = remaining;
      setPendingSum((prev) => prev - sentSum);
      await AsyncStorage.setItem(STORAGE_KEY_STEPS, JSON.stringify(remaining));
      await AsyncStorage.setItem(
        STORAGE_KEY_LAST_SYNCED,
        Date.now().toString()
      );

      const { data } = await axios.get(`${API_BASE}/steps`, {
        params: { userId: uid, aggregate: "sum" },
      });
      setFetchedTotal(data.total || 0);

      console.log(
        `[SYNC] Success: ${pendingToSend.length} entries, ${sentSum} steps`
      );
    } catch (err: any) {
      console.error("[SYNC] Failed:", err.message);
      setError("Sync failed, retrying when online");
    } finally {
      setIsSyncing(false);
    }
  };

  const manualSync = async () => {
    console.log("[MANUAL SYNC] Button clicked");
    if (isOffline) {
      setError("Offline: Steps saved locally. Connect to sync.");
      return;
    }
    await syncPending();
  };

  return {
    totalSteps,
    deviceSteps,
    isAvailable,
    error,
    isSyncing,
    isOffline,
    userId,
    manualSync,
  };
};
