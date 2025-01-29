export const getEmployeeToken = () => localStorage.getItem('employeeAuthToken');

export const getSystemTimezone = () => {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
};
