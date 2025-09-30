import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { usePedometer } from "../../hooks/use-pedometer";
import { useFocusEffect } from "@react-navigation/native";

export default function HomeScreen() {
  const { totalSteps, isAvailable, error, manualSync, isSyncing, userId } =
    usePedometer();

  useFocusEffect(
    React.useCallback(() => {
      console.log("Fetching...");
      manualSync();
    }, [])
  );

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.error}>Error: {error}</Text>
        <TouchableOpacity
          style={[styles.syncButton, isSyncing && styles.syncButtonDisabled]}
          activeOpacity={isSyncing ? 1 : 0.2}
          onPress={() => {
            if (!isSyncing) {
              console.log("Retry Sync button clicked!");
              manualSync();
            } else {
              console.log("Button is disabled, sync in progress");
            }
          }}
        >
          {isSyncing ? (
            <>
              <ActivityIndicator
                size="small"
                color="#fff"
                style={styles.syncIcon}
              />
              <Text style={styles.syncButtonText}>Syncing...</Text>
            </>
          ) : (
            <Text style={styles.syncButtonText}>Retry Sync</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  }

  if (isAvailable === false) {
    return (
      <View style={styles.container}>
        <Text>Pedometer not available.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Device ID: {userId}</Text>
      <Text style={styles.steps}>
        Total Steps: {totalSteps.toLocaleString()}
      </Text>
      <TouchableOpacity
        style={[styles.syncButton, isSyncing && styles.syncButtonDisabled]}
        activeOpacity={isSyncing ? 1 : 0.2}
        onPress={() => {
          if (!isSyncing) {
            console.log("Manual Sync button clicked!");
            manualSync();
          } else {
            console.log("Button is disabled, sync in progress");
          }
        }}
      >
        {isSyncing ? (
          <>
            <ActivityIndicator
              size="small"
              color="#fff"
              style={styles.syncIcon}
            />
            <Text style={styles.syncButtonText}>Syncing...</Text>
          </>
        ) : (
          <Text style={styles.syncButtonText}>Manual Sync</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  title: { fontSize: 18, marginBottom: 20 },
  steps: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
  },
  error: {
    color: "red",
    fontSize: 16,
    marginBottom: 20,
  },
  syncButton: {
    marginBottom: 20,
    backgroundColor: "#4a90e2",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  syncButtonDisabled: {
    backgroundColor: "#a0c4f2",
    elevation: 0,
    shadowOpacity: 0,
  },
  syncButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  syncIcon: {
    marginRight: 8,
  },
});
