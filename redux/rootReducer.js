import { combineReducers } from "redux";
import authReducer from "./auth/authReducer";
import mastersReducer from "./masters/mastersReducer";
import activityReducer from "./activity/activityReducer";

const rootReducer = combineReducers({
    employee : authReducer,
    masters : mastersReducer,
    activity : activityReducer,
})

export default rootReducer;