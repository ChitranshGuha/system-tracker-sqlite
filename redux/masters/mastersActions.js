import axios from "axios";
import { API_BASE_URL } from "../../utils/constants";

export function gettingMastersList(authToken,apiRoute,key,payload){
    return async dispatch => {
        try{
            const response = await axios.post(`${API_BASE_URL}/${apiRoute}`,payload || {}, 
            {
                headers: { 
                    "Authorization": `Bearer ${authToken}`, 
                    "Content-Type" : "application/json",
                }
            })
            
            const type = `GET_${key?.toUpperCase()}_LIST`;
            const data = response?.data?.data?.rows;
            const count = response?.data?.data?.count;

            dispatch(getMastersList(data,count,type,key))

        }catch(error){
            console.log(error)
        }
}}

export function getMastersList(data, count, type, key){
    return {
        type,
        [`${key}`]: data,
        count,
    }
}