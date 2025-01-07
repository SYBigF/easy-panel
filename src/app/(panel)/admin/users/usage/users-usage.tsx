"use client";

import * as React from "react";
import { api } from "@/trpc/react";
import ReactECharts from "echarts-for-react";

export function UsersUsage() {
  // 获取所有用户数据和实例数据
  const getAllUserQuery = api.user.getAll.useQuery();
  const getAllUserQueryData = React.useMemo(() => getAllUserQuery.data || [], [getAllUserQuery.data]);
  const getAllInstanceQuery = api.serviceInstance.getAllAdmin.useQuery();
  const getAllInstanceQueryData = React.useMemo(() => getAllInstanceQuery.data || [], [getAllInstanceQuery.data]);

  // 确保在数据存在时才进行过滤
  const activeUsers = React.useMemo(() => {
    return getAllUserQueryData.filter((user) => user?.isActive);
  }, [getAllUserQueryData]);

  // 对用户数据按 comment 属性排序
  const sortedUsers = React.useMemo(() => {
    if (!activeUsers.length) return [];
    return [...activeUsers].sort((b, a) => {
      if (!a.comment || !b.comment) return 0; // 如果没有 comment 属性，不排序
      return a.comment.localeCompare(b.comment); // 按字母顺序排序
    });
  }, [activeUsers]);
  const sortedInstances = React.useMemo(() => {
    if (!getAllInstanceQueryData.length) return [];
    return [...getAllInstanceQueryData].sort((a, b) => {
      if (!a.name || !b.name) return 0; // 如果没有 name 属性，不排序
      return a.name.localeCompare(b.name); // 按字母顺序排序
    });
  }, [getAllInstanceQueryData]);

  // 获取 userId 和 instanceId 的组合
  const combinations = React.useMemo(() => {
    return sortedUsers.flatMap((user) =>
      sortedInstances.map((instance) => ({
        userId: user.id,
        instanceId: instance.id,
      }))
    );
  }, [sortedUsers, sortedInstances]);

  // 批量查询所有组合的数据
  const batchQuery = api.resourceLog.sumChatGPTSharedLogsInBatch.useMutation(); // 使用 mutation
  React.useEffect(() => {
    if (combinations.length > 0) {
      batchQuery.mutate({
        combinations,
        durationWindows: ["30d"],
      });
    }
  }, [combinations]);

  // 处理数据用于条形图
  const usageData30d = React.useMemo(() => {
    if (!batchQuery.data) {
      return {
        instanceUsageMap: new Map<string, number[]>(), // 默认空 Map
        instanceNames: sortedInstances.map((instance) => instance.name), // 默认实例名称
      };
    }
  
    const instanceUsageMap = new Map<string, number[]>(); // 存储每个用户对每个实例的用量
    const instanceNames = sortedInstances.map((instance) => instance.name);
  
    sortedUsers.forEach((user) => {
      const userUsage: number[] = []; // 显式声明 userUsage 的类型为 number[]
      sortedInstances.forEach((instance) => {
        const data = batchQuery.data.find(
          (item) => item.userId === user.id && item.instanceId === instance.id
        );
        userUsage.push(data?.result[0]?.stats.count || 0); // 如果无数据则返回 0
      });
      instanceUsageMap.set(user.name, userUsage);
    });
  
    return { instanceUsageMap, instanceNames };
  }, [batchQuery.data, sortedUsers, sortedInstances]);

  // 配置 ECharts 的 option
  const option30d = React.useMemo(() => {
    if (!usageData30d.instanceUsageMap || !usageData30d.instanceNames) return {};

    return {
      tooltip: {
        trigger: "axis",
        axisPointer: {
          type: "shadow",
        },
      },
      legend: {
        data: sortedInstances.map((instance) => instance.name), // 图例显示实例名称
      },
      grid: {
        left: "3%",
        right: "4%",
        bottom: "3%",
        containLabel: true,
      },
      xAxis: {
        type: "value",
        boundaryGap: [0, 0.01],
      },
      yAxis: {
        type: "category",
        data: sortedUsers.map((user) => user.name), // 用户名称作为分类数据
      },
      series: sortedInstances.map((instance) => ({
        name: instance.name,
        type: "bar",
        stack: "total", // 堆叠条形图
        data: sortedUsers.map((user) => {
          // 获取当前实例的当前用户用量
          const userData = usageData30d.instanceUsageMap.get(user.name);
          const instanceIndex = sortedInstances.findIndex((inst) => inst.name === instance.name);
          return userData ? userData[instanceIndex] : 0; // 如果无数据则返回 0
        }),
      })),
    };
  }, [usageData30d, sortedUsers]);

  // // 如果用户数据未加载完成
  // if (getAllUserQuery.isLoading) {
  //   return <div>加载中...</div>;
  // }

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">30d 使用统计</h1>
      <ReactECharts option={option30d} style={{ height: "800px", width: "100%" }} />
    </div>
  );
}
