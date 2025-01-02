import axios from 'axios';
import { API_BASE_URL } from '../../utils/constants';

export function activityActions(authToken, activityType, payload, isDetail) {
  return async () => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/employee/project/project/task/activity${isDetail ? '/detail' : ''}/${activityType}`,
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
        error: error,
      };
    }
  };
}
