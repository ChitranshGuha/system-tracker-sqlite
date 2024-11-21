import * as type from "../types";

const initObj = {
    list : [],
    count : null
}

const initialState = { 
    workspaces : initObj,
    projects : initObj,
    tasks : initObj
};

export default function mastersReducer(state = initialState, action) {
    switch (action.type) {
        case type.GET_WORKSPACES_LIST:
            return {
                ...state, 
                workspaces : {
                    list : action.workspaces,
                    count : action.count,
                },
            };

        case type.GET_PROJECTS_LIST:
            return {
                ...state, 
                projects : {
                    list : action.projects,
                    count : action.count,
                },
            };

        case type.GET_TASKS_LIST:
            return {
                ...state, 
                tasks : {
                    list : action.tasks,
                    count : action.count,
                },
            };
            
        default:
            return state;
    }
}