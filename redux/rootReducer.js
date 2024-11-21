import { combineReducers } from "redux";
import authReducer from "./auth/authReducer";
import mastersReducer from "./masters/mastersReducer";

const rootReducer = combineReducers({
    employee : authReducer,
    masters : mastersReducer,
})

export default rootReducer;