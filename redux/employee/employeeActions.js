import axios from 'axios';
import { API_BASE_URL } from '../../utils/constants';
import { GET_APPUSAGES_LIST } from '../types';

export function gettingEmployeeActionsList(authToken, apiRoute, key, payload) {
  return async (dispatch) => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/${apiRoute}`,
        payload || {},
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const type = `GET_${key?.toUpperCase()}_LIST`;
      const data = response?.data?.data?.rows;
      const count = response?.data?.data?.count;

      dispatch(getEmployeeActionsList(data, count, type, key));
    } catch (error) {
      console.log(error);
    }
  };
}

export function getEmployeeActionsList(data, count, type, key) {
  return {
    type,
    [`${key}`]: data,
    count,
  };
}

export function gettingAppUsages(authToken, payload) {
  return async (dispatch) => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/employee/project/appWebsiteDetailsUsage/list`,
        payload || {},
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const type = GET_APPUSAGES_LIST;
      const data = response?.data?.data;

      dispatch(getAppUsages(data));
    } catch (error) {
      console.log(error);
    }
  };
}

export function getAppUsages(data) {
  return {
    type: GET_APPUSAGES_LIST,
    appUsages: data,
  };
}
