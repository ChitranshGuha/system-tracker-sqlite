import axios from 'axios';
import { API_BASE_URL } from '../../utils/constants';

export function activityActions(
  authToken,
  activityType,
  payload,
  isDetail
  // isReport
) {
  return async () => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/employee/project/project/task/activity${isDetail ? '/detail' : ''}/${activityType}`,
        // `${API_BASE_URL}/employee/project/project/task/activity${isDetail ? (isReport ? '/report' : '/detail') : ''}/${activityType}`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return {
        success: true,
        ...(activityType === 'start'
          ? {
              id: response?.data?.data?.id,
            }
          : {}),
      };
    } catch (error) {
      return {
        success: false,
        error: error?.response,
      };
    }
  };
}

export function getActivityEndStatus(authToken, payload) {
  return async () => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/employee/project/project/task/activity/get`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return {
        success: true,
        data: response?.data?.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error,
      };
    }
  };
}

export function removeActivityDetailTimeout(authToken, payload) {
  return async () => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/employee/project/project/task/activity/timeout/remove`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error: error,
      };
    }
  };
}

export function hardResetApp(authToken, payload) {
  return async () => {
    try {
      await axios.post(`${API_BASE_URL}/employee/project/hard-reset`, payload, {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });

      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error: error,
      };
    }
  };
}

export function trackedHourDetails(authToken, payload) {
  return async () => {
    try {
      await axios.post(
        `${API_BASE_URL}/employee/project/tracked-hours`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error: error,
      };
    }
  };
}
