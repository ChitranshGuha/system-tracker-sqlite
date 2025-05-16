import axios from 'axios';
import * as type from '../types';
import { API_BASE_URL } from '../../utils/constants';

export function loginOrRegisterEmployee(payload) {
  return (dispatch) =>
    axios
      .post(`${API_BASE_URL}/employee/auth/login`, payload)
      .then((data) => {
        const authToken = data?.data?.data?.token;
        const employeeDetails = data?.data?.data?.user;
        dispatch(loginEmployee(authToken, employeeDetails));
        return {
          success: true,
          message: data?.data?.message,
          authToken,
        };
      })
      .catch((error) => {
        return {
          success: false,
          error: error?.response || 'Server Error',
        };
      });
}

export function loginEmployee(authToken, employeeDetails) {
  localStorage.setItem('employeeAuthToken', authToken);
  localStorage.setItem('employeeDetails', JSON.stringify(employeeDetails));

  return {
    type: type.EMPLOYEE_LOGIN_AUTH,
    authToken,
    employeeDetails,
  };
}

export function getAuthDetails() {
  const authToken = localStorage.getItem('employeeAuthToken');
  const employeeDetails = JSON.parse(localStorage.getItem('employeeDetails'));

  return {
    type: type.GET_EMPLOYEE_LOGIN_AUTH,
    authToken,
    employeeDetails,
  };
}

export function logOutEmployee() {
  localStorage.removeItem('employeeAuthToken');
  localStorage.removeItem('employeeDetails');
  localStorage.clear();

  return {
    type: type.EMPLOYEE_LOGOUT,
  };
}

// App Update Checker

export function appUpdateChecker(payload) {
  return async () => {
    try {
      const res = await axios.post(
        `${API_BASE_URL}/employee/auth/app-version/get`,
        payload
      );

      return {
        success: true,
        data: res?.data?.data,
      };
    } catch (error) {
      return {
        success: false,
        message: error?.response?.data?.error || 'Server Error',
      };
    }
  };
}
