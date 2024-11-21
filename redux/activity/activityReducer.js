import * as type from "../types";

const initObj = {
    list : [],
    count : null
}

const initialState = { 
    activities : initObj,
};

export default function activityReducer(state = initialState, action) {
    switch (action.type) {
        case type.GET_ACTIVITIES_LIST:
            return {
                ...state, 
                activities : {
                    list : action.activities,
                    count : action.count,
                },
            };

        default:
            return state;
    }
}