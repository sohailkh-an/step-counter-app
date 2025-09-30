const API_URL = "http://localhost:5000";

export interface StepData {
  _id: string;
  userId: string;
  timestamp: string;
  steps: number;
}

export interface StepSummary {
  total: number;
}

export const fetchStepData = async (
  userId: string,
  startDate?: Date,
  endDate?: Date,
  limit?: number
): Promise<StepData[]> => {
  try {
    let url = `${API_URL}/api/steps?userId=${userId}`;

    if (startDate) {
      url += `&startDate=${startDate.toISOString()}`;
    }

    if (endDate) {
      url += `&endDate=${endDate.toISOString()}`;
    }

    if (limit) {
      url += `&limit=${limit}`;
    }

    url += "&sort=-timestamp";

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error("Error fetching step data:", error);
    return [];
  }
};

export const fetchTotalSteps = async (
  userId: string,
  startDate?: Date,
  endDate?: Date
): Promise<number> => {
  try {
    let url = `${API_URL}/api/steps?userId=${userId}&aggregate=sum`;

    if (startDate) {
      url += `&startDate=${startDate.toISOString()}`;
    }

    if (endDate) {
      url += `&endDate=${endDate.toISOString()}`;
    }

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    return data.total;
  } catch (error) {
    console.error("Error fetching total steps:", error);
    return 0;
  }
};
