"use client";

import * as React from "react";
import { api } from "@/trpc/react";
import ReactECharts from "echarts-for-react";

export function UsersUsage() {
  // 获取所有用户数据
  const getAllUserQuery = api.user.getAll.useQuery();

  // 确保在数据存在时才进行过滤
  const activeUsers = React.useMemo(() => {
    if (!getAllUserQuery.data) return []; // 如果数据未加载完成，返回空数组
    return getAllUserQuery.data.filter((user) => user.isActive); // 过滤掉 inactive 用户
  }, [getAllUserQuery.data]);

  // 对用户数据按 comment 属性排序
  const sortedUsers = React.useMemo(() => {
    return [...activeUsers].sort((b, a) => {
      if (!a.comment || !b.comment) return 0; // 如果没有 comment 属性，不排序
      return a.comment.localeCompare(b.comment); // 按字母顺序排序
    });
  }, [activeUsers]);

  // 获取排序后的用户名
  const users = React.useMemo(() => sortedUsers.map((user) => user.name), [sortedUsers]); // 用户名列表

  // 为每个用户独立创建 useQuery 查询 24h 数据
  const userLogs24hQueries = sortedUsers.map((user) =>
    api.resourceLog.sumChatGPTSharedLogsInDurationWindowsByUserId.useQuery({
      durationWindows: ["24h"],
      userId: user.id,
    })
  );

  // 为每个用户独立创建 useQuery 查询 30d 数据
  const userLogs30dQueries = sortedUsers.map((user) =>
    api.resourceLog.sumChatGPTSharedLogsInDurationWindowsByUserId.useQuery({
      durationWindows: ["30d"],
      userId: user.id,
    })
  );

  // 使用 useMemo 提取 24 小时的统计结果
  const usageData24h = React.useMemo(() => {
    return userLogs24hQueries.map((logQuery) => {
      if (logQuery.isLoading || !logQuery.data) return 0; // 数据未加载时返回 0
      return logQuery.data?.[0]?.stats?.count ?? 0; // 提取统计 count 数据，默认为 0
    });
  }, [userLogs24hQueries.map((q) => q.data)]);

  // 使用 useMemo 提取 30 天的统计结果
  const usageData30d = React.useMemo(() => {
    return userLogs30dQueries.map((logQuery) => {
      if (logQuery.isLoading || !logQuery.data) return 0; // 数据未加载时返回 0
      return logQuery.data?.[0]?.stats?.count ?? 0; // 提取统计 count 数据，默认为 0
    });
  }, [userLogs30dQueries.map((q) => q.data)]);

  // 图表配置
  const option24h = React.useMemo(() => {
    return {
      tooltip: {
        trigger: "axis",
        axisPointer: {
          type: "shadow", // 鼠标悬浮显示阴影效果
        },
      },
      grid: {
        left: "3%",
        right: "4%",
        bottom: "3%",
        containLabel: true, // 让标签在图表区域内
      },
      xAxis: {
        type: "value", // X 轴为数值轴
        boundaryGap: [0, 0.01], // 边界留白
      },
      yAxis: {
        type: "category", // Y 轴为分类轴
        data: users, // 用户名作为分类数据
      },
      series: [
        {
          name: "Usage",
          type: "bar", // 柱状图类型
          data: usageData24h, // 使用量数据
          label: {
            show: true, // 显示标签
            position: "right", // 标签显示在条形右侧
          },
        },
      ],
    };
  }, [users, usageData24h]);

  const option30d = React.useMemo(() => {
    return {
      tooltip: {
        trigger: "axis",
        axisPointer: {
          type: "shadow", // 鼠标悬浮显示阴影效果
        },
      },
      grid: {
        left: "3%",
        right: "4%",
        bottom: "3%",
        containLabel: true, // 让标签在图表区域内
      },
      xAxis: {
        type: "value", // X 轴为数值轴
        boundaryGap: [0, 0.01], // 边界留白
      },
      yAxis: {
        type: "category", // Y 轴为分类轴
        data: users, // 用户名作为分类数据
      },
      series: [
        {
          name: "Usage",
          type: "bar", // 柱状图类型
          data: usageData30d, // 使用量数据
          label: {
            show: true, // 显示标签
            position: "right", // 标签显示在条形右侧
          },
        },
      ],
    };
  }, [users, usageData30d]);

  // 如果用户数据未加载完成
  if (getAllUserQuery.isLoading) {
    return <div>加载中...</div>;
  }

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">24h 使用统计</h1>
      <ReactECharts option={option24h} style={{ height: "800px", width: "100%" }} />
      <h1 className="text-xl font-bold mb-4">30d 使用统计</h1>
      <ReactECharts option={option30d} style={{ height: "800px", width: "100%" }} />
    </div>
  );
}
