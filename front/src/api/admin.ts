import { apiClient } from "./client";

export const getDashboard = async() => {
    const response = await apiClient.get("/admin/dashboard");

    return response.data;
}