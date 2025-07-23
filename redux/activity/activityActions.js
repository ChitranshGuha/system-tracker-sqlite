import axios from 'axios';
import { API_BASE_URL } from '../../utils/constants';
import moment from 'moment';

export function activityActions(authToken, activityType, payload, isDetail) {
  return async () => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/employee${isDetail ? '/v2' : ''}/project/project/task/activity${isDetail ? '/detail' : ''}/${activityType}`,
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
        ...(activityType === 'end'
          ? {
              totalTime: response?.data?.data?.totalTime,
              idleTime: response?.data?.data?.idleTime,
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

export function fetchTrackingTimeDetails(authToken, payload) {
  return async () => {
    try {
      const res = await axios.post(
        `${API_BASE_URL}/employee/project/tracked-hours`,
        {
          ...payload,
          entityType: 'MEMBER',
          durationType: 'DAY',
          data: 'HOURS',
          startDate: moment().format('YYYY-MM-DD'),
          endDate: moment().format('YYYY-MM-DD'),
        },
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return {
        success: true,
        data: res?.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error,
      };
    }
  };
}
