import * as type from "../types";

const initialState = { 
    employeeDetails : {},
    authToken : null,
};

export default function authReducer(state = initialState, action) {
    switch (action.type) {
        case type.EMPLOYEE_LOGIN_AUTH:
            return {
                ...state, 
                authToken: action.authToken,
                employeeDetails : action.employeeDetails,
            };
        
        case type.GET_EMPLOYEE_LOGIN_AUTH:
            return {
                ...state, 
                authToken: action.authToken,
                employeeDetails : action.employeeDetails,
            };   

        case type.EMPLOYEE_LOGOUT:
            return initialState;
            
        default:
            return state;
    }
}