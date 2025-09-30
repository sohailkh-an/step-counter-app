import { useState, useEffect, useRef } from "react";
import { Chart, registerables } from "chart.js";
import { fetchStepData, fetchTotalSteps, StepData } from "../../services/api";
import styles from "./Dashboard.module.css";

Chart.register(...registerables);

type TimePeriod = "day" | "week" | "month" | "year";

const Dashboard = () => {
  const [stepData, setStepData] = useState<StepData[]>([]);
  const [totalSteps, setTotalSteps] = useState<number>(0);
  const [averageSteps, setAverageSteps] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("week");
  const [userId, setUserId] = useState<string>("");
  const [showModal, setShowModal] = useState<boolean>(true);
  const [userIdInput, setUserIdInput] = useState<string>("");

  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);

  const getDateRange = (): { startDate: Date; endDate: Date } => {
    const endDate = new Date();
    const startDate = new Date();

    switch (timePeriod) {
      case "day":
        startDate.setHours(0, 0, 0, 0);
        break;
      case "week":
        startDate.setDate(endDate.getDate() - 7);
        break;
      case "month":
        startDate.setMonth(endDate.getMonth() - 1);
        break;
      case "year":
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
    }

    return { startDate, endDate };
  };

  const fetchData = async () => {
    setLoading(true);

    try {
      const { startDate, endDate } = getDateRange();

      const steps = await fetchStepData(userId, startDate, endDate);
      setStepData(steps);

      const total = await fetchTotalSteps(userId, startDate, endDate);
      setTotalSteps(total);

      const daysDiff = Math.max(
        1,
        Math.ceil(
          (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
        )
      );
      setAverageSteps(Math.round(total / daysDiff));
    } catch (error) {
      console.log("Failed to fetch step data", error);
    } finally {
      setLoading(false);
    }
  };

  const initChart = () => {
    if (!chartRef.current) {
      return;
    }

    if (stepData.length === 0) {
      return;
    }

    if (chartInstance.current) {
      chartInstance.current.destroy();
      chartInstance.current = null;
    }

    const ctx = chartRef.current.getContext("2d");

    if (!ctx) {
      return;
    }

    const dataByDate: { [key: string]: number } = {};

    stepData.forEach((item) => {
      const date = new Date(item.timestamp);
      const dateKey = date.toLocaleDateString();

      if (dataByDate[dateKey]) {
        dataByDate[dateKey] += item.steps;
      } else {
        dataByDate[dateKey] = item.steps;
      }
    });

    const sortedDates = Object.keys(dataByDate).sort((a, b) => {
      return new Date(a).getTime() - new Date(b).getTime();
    });

    const labels = sortedDates;
    const data = sortedDates.map((date) => dataByDate[date]);

    chartInstance.current = new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Steps",
            data,
            backgroundColor: "rgba(74, 144, 226, 0.6)",
            borderColor: "#4a90e2",
            borderWidth: 2,
            borderRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            padding: 12,
            cornerRadius: 6,
            titleFont: {
              size: 14,
              weight: "bold",
            },
            bodyFont: {
              size: 14,
            },
            displayColors: false,
            callbacks: {
              label: function (context) {
                return `Steps: ${context.parsed.y.toLocaleString()}`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: {
              display: false,
            },
            ticks: {
              maxRotation: 45,
              minRotation: 45,
              font: {
                size: 11,
              },
            },
          },
          y: {
            beginAtZero: true,
            grid: {
              color: "rgba(0, 0, 0, 0.05)",
            },
            ticks: {
              precision: 0,
              callback: function (value) {
                return value.toLocaleString();
              },
            },
          },
        },
      },
    });
  };

  const handleTimePeriodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTimePeriod(e.target.value as TimePeriod);
  };

  useEffect(() => {
    const storedUserId = localStorage.getItem("stepCounterUserId");
    if (storedUserId) {
      setUserId(storedUserId);
      setShowModal(false);
    }
  }, []);

  useEffect(() => {
    if (userId) {
      fetchData();
    }
  }, [timePeriod, userId]);

  useEffect(() => {
    if (!loading && stepData.length > 0) {
      setTimeout(() => {
        initChart();
      }, 100);
    }

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
        chartInstance.current = null;
      }
    };
  }, [stepData, loading]);

  const handleUserIdSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (userIdInput.trim()) {
      localStorage.setItem("stepCounterUserId", userIdInput.trim());
      setUserId(userIdInput.trim());
      setShowModal(false);
    }
  };

  return (
    <div className={styles.dashboardContainer}>
      {showModal ? (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h2>Welcome to Step Counter</h2>
            <p>Please enter your User ID displayed on your mobile app</p>
            <form onSubmit={handleUserIdSubmit}>
              <input
                type="text"
                value={userIdInput}
                onChange={(e) => setUserIdInput(e.target.value)}
                placeholder="Enter your User ID"
                className={styles.input}
                required
              />
              <button type="submit" className={styles.button}>
                Continue
              </button>
            </form>
          </div>
        </div>
      ) : (
        <>
          <div className={styles.header}>
            <h1 className={styles.title}>Step Counter Dashboard</h1>
            <div className={styles.dateControls}>
              <select
                className={styles.select}
                value={timePeriod}
                onChange={handleTimePeriodChange}
              >
                <option value="day">Today</option>
                <option value="week">Last 7 Days</option>
                <option value="month">Last 30 Days</option>
                <option value="year">Last 365 Days</option>
              </select>
            </div>
          </div>

          <div className={styles.statsContainer}>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Total Steps</div>
              <div className={styles.statValue}>
                {loading ? "-" : totalSteps.toLocaleString()}
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Daily Average</div>
              <div className={styles.statValue}>
                {loading ? "-" : averageSteps.toLocaleString()}
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Last Recorded</div>
              <div className={styles.statValue}>
                {loading || stepData.length === 0
                  ? "-"
                  : stepData[0].steps.toLocaleString()}
              </div>
            </div>
          </div>

          <div className={styles.chartContainer}>
            <h2 className={styles.chartTitle}>Step History</h2>
            {loading ? (
              <div className={styles.loadingContainer}>
                <div className={styles.loadingSpinner}></div>
              </div>
            ) : stepData.length === 0 ? (
              <div className={styles.noData}>
                <div className={styles.noDataIcon}>📊</div>
                <p>No step data available for the selected period</p>
              </div>
            ) : (
              <div
                style={{ position: "relative", height: "400px", width: "100%" }}
              >
                <canvas ref={chartRef}></canvas>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
