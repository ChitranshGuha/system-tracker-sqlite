import { combineReducers } from 'redux';
import authReducer from './auth/authReducer';
import employeeReducer from './employee/employeeReducer';

const rootReducer = combineReducers({
  auth: authReducer,
  employee: employeeReducer,
});

export default rootReducer;
