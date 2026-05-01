package com.zifeng.module.admin.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardStats {

    private long totalVisits;
    private long todayVisits;
    private long totalIps;
    private long todayIps;
    private long onlineUsers;
    private long totalUsers;
    private long totalBookshelfItems;
    private long totalReadingHistory;
    private List<Map<String, Object>> visitTrend;
    private List<Map<String, Object>> recentVisitLogs;
}
