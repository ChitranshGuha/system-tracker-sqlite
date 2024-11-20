import { combineReducers } from "redux";
import authReducer from "./auth/authReducer";

const rootReducer = combineReducers({
    employee : authReducer,
})

export default rootReducer;