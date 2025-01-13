"use client";

import * as React from "react";
import { api } from "@/trpc/react";
import ReactECharts from "echarts-for-react";
import ThemedChart from "@/components/ui/chart";
import { EChartsOption } from "echarts"; // 引入 EChartsOption 类型

export function UsersUsage() {
  // 获取所有用户数据和实例数据
  const getAllUserQuery = api.user.getAll.useQuery();
  const getAllUserQueryData = React.useMemo(() => getAllUserQuery.data ?? [], [getAllUserQuery.data]);
  const getAllInstanceQuery = api.serviceInstance.getAllAdmin.useQuery();
  const getAllInstanceQueryData = React.useMemo(() => getAllInstanceQuery.data ?? [], [getAllInstanceQuery.data]);

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
  const batchQuery24h = api.resourceLog.sumChatGPTSharedLogsInBatch.useMutation(); // 使用 mutation
  React.useEffect(() => {
    if (combinations.length > 0) {
      batchQuery24h.mutate({
        combinations,
        durationWindows: ["24h"],
      });
    }
  }, [combinations]);

  // 处理数据用于条形图
  const usageData24h = React.useMemo(() => {
    if (!batchQuery24h.data) {
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
        const data = batchQuery24h.data.find(
          (item) => item.userId === user.id && item.instanceId === instance.id
        );
        userUsage.push(data?.result[0]?.stats.count ?? 0); // 如果无数据则返回 0
      });
      instanceUsageMap.set(user.name, userUsage);
    });

    return { instanceUsageMap, instanceNames };
  }, [batchQuery24h.data, sortedUsers, sortedInstances]);

  // 批量查询所有组合的数据
  const batchQuery30d = api.resourceLog.sumChatGPTSharedLogsInBatch.useMutation(); // 使用 mutation
  React.useEffect(() => {
    if (combinations.length > 0) {
      batchQuery30d.mutate({
        combinations,
        durationWindows: ["30d"],
      });
    }
  }, [combinations]);

  // 处理数据用于条形图
  const usageData30d = React.useMemo(() => {
    if (!batchQuery30d.data) {
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
        const data = batchQuery30d.data.find(
          (item) => item.userId === user.id && item.instanceId === instance.id
        );
        userUsage.push(data?.result[0]?.stats.count ?? 0); // 如果无数据则返回 0
      });
      instanceUsageMap.set(user.name, userUsage);
    });

    return { instanceUsageMap, instanceNames };
  }, [batchQuery30d.data, sortedUsers, sortedInstances]);

  // 模型名称
  const modelNames = React.useMemo(() => {
    return ["gpt-4o", "gpt-4o-canmore", "gpt-4o-mini", "o1", "o1-mini", "gpt-4", "auto"];
  }, []);

  // 获取 userId 和 model 的组合
  const modelCombinations = React.useMemo(() => {
    return sortedUsers.flatMap((user) =>
      modelNames.map((model) => ({
        userId: user.id,
        model,
      }))
    );
  }, [sortedUsers, modelNames]);

  const batchModelQuery24h = api.resourceLog.sumChatGPTSharedModelLogsInBatch.useMutation(); // 使用新的 API
  React.useEffect(() => {
    if (modelCombinations.length > 0) {
      batchModelQuery24h.mutate({
        modelCombinations,
        durationWindows: ["24h"],
      });
    }
  }, [modelCombinations]);

  // 处理数据用于条形图
  const usageDataModel24h = React.useMemo(() => {
    if (!batchModelQuery24h.data) {
      return {
        userUsageMap: new Map<string, number[]>(), // 默认空 Map
      };
    }

    const userUsageMap = new Map<string, number[]>(); // 存储每个用户对每个模型的用量

    sortedUsers.forEach((user) => {
      const userUsage: number[] = [];
      modelNames.forEach((model) => {
        const data = batchModelQuery24h.data.find(
          (item) => item.userId === user.id && item.model === model
        );
        userUsage.push(data?.result[0]?.stats.count ?? 0); // 如果无数据则返回 0
      });
      userUsageMap.set(user.name, userUsage);
    });

    return { userUsageMap };
  }, [batchModelQuery24h.data, sortedUsers, modelNames]);

  // 批量查询所有组合的数据
  const batchModelQuery30d = api.resourceLog.sumChatGPTSharedModelLogsInBatch.useMutation(); // 使用新的 API
  React.useEffect(() => {
    if (modelCombinations.length > 0) {
      batchModelQuery30d.mutate({
        modelCombinations,
        durationWindows: ["30d"],
      });
    }
  }, [modelCombinations]);

  // 处理数据用于条形图
  const usageDataModel30d = React.useMemo(() => {
    if (!batchModelQuery30d.data) {
      return {
        userUsageMap: new Map<string, number[]>(), // 默认空 Map
      };
    }

    const userUsageMap = new Map<string, number[]>(); // 存储每个用户对每个模型的用量

    sortedUsers.forEach((user) => {
      const userUsage: number[] = [];
      modelNames.forEach((model) => {
        const data = batchModelQuery30d.data.find(
          (item) => item.userId === user.id && item.model === model
        );
        userUsage.push(data?.result[0]?.stats.count ?? 0); // 如果无数据则返回 0
      });
      userUsageMap.set(user.name, userUsage);
    });

    return { userUsageMap };
  }, [batchModelQuery30d.data, sortedUsers, modelNames]);

  const fixedColors = [
    "#5470c6", // 蓝色
    "#91cc75", // 绿色
    "#fac858", // 黄色
    "#ee6666", // 红色
    // "#73c0de", // 青色
    "#3ba272", // 深绿
    // "#fc8452", // 橙色
    "#9a60b4", // 紫色
    "#ea7ccc", // 粉色
  ];

  const optionCombined24h = React.useMemo(() => {
    if (!usageData24h.instanceUsageMap || !usageData24h.instanceNames || !usageDataModel24h.userUsageMap) {
      return {};
    }

    // 图例：实例名称和模型名称合并
    const legendData = [
      ...sortedInstances.map((instance) => instance.name), // 实例名称
      ...modelNames.map((model) => model), // 模型名称
    ];

    // 左侧堆叠（实例数据）
    const leftStackSeries = sortedInstances.map((instance, instanceIndex) => ({
      name: instance.name,
      type: "bar",
      stack: "left", // 左侧堆叠
      itemStyle: {
        color: fixedColors[instanceIndex % fixedColors.length], // 使用固定颜色
      },
      data: sortedUsers.map((user) => {
        const userData = usageData24h.instanceUsageMap.get(user.name);
        return userData ? userData[instanceIndex] : 0; // 如果无数据则返回 0
      }),
    }));

    // 右侧堆叠（模型数据）
    const rightStackSeries = modelNames.map((model, modelIndex) => ({
      name: model,
      type: "bar",
      stack: "right", // 右侧堆叠
      itemStyle: {
        color: fixedColors[(sortedInstances.length + modelIndex) % fixedColors.length], // 使用固定颜色，确保与左侧堆叠区分
      },
      data: sortedUsers.map((user) => {
        const userData = usageDataModel24h.userUsageMap.get(user.name);
        return userData ? userData[modelIndex] : 0; // 如果无数据则返回 0
      }),
    }));

    // 合并两个堆叠
    const series = [...leftStackSeries, ...rightStackSeries];

    return {
      tooltip: {
        trigger: "axis",
        axisPointer: {
          type: "shadow",
        },
      },
      legend: {
        data: legendData, // 图例显示所有实例名称和模型名称
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
      series: series,
    } as EChartsOption;;
  }, [usageData24h, usageDataModel24h, sortedUsers, sortedInstances, modelNames]);


  const optionCombined30d = React.useMemo(() => {
    if (!usageData30d.instanceUsageMap || !usageData30d.instanceNames || !usageDataModel30d.userUsageMap) {
      return {};
    }

    // 图例：实例名称和模型名称合并
    const legendData = [
      ...sortedInstances.map((instance) => instance.name), // 实例名称
      ...modelNames.map((model) => model), // 模型名称
    ];

    // 左侧堆叠（实例数据）
    const leftStackSeries = sortedInstances.map((instance, instanceIndex) => ({
      name: instance.name,
      type: "bar",
      stack: "left", // 左侧堆叠
      itemStyle: {
        color: fixedColors[instanceIndex % fixedColors.length], // 使用固定颜色
      },
      data: sortedUsers.map((user) => {
        const userData = usageData30d.instanceUsageMap.get(user.name);
        return userData ? userData[instanceIndex] : 0; // 如果无数据则返回 0
      }),
    }));

    // 右侧堆叠（模型数据）
    const rightStackSeries = modelNames.map((model, modelIndex) => ({
      name: model,
      type: "bar",
      stack: "right", // 右侧堆叠
      itemStyle: {
        color: fixedColors[(sortedInstances.length + modelIndex) % fixedColors.length], // 使用固定颜色，确保与左侧堆叠区分
      },
      data: sortedUsers.map((user) => {
        const userData = usageDataModel30d.userUsageMap.get(user.name);
        return userData ? userData[modelIndex] : 0; // 如果无数据则返回 0
      }),
    }));

    // 合并两个堆叠
    const series = [...leftStackSeries, ...rightStackSeries];

    return {
      tooltip: {
        trigger: "axis",
        axisPointer: {
          type: "shadow",
        },
      },
      legend: {
        data: legendData, // 图例显示所有实例名称和模型名称
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
      series: series,
    } as EChartsOption;;
  }, [usageData30d, usageDataModel30d, sortedUsers, sortedInstances, modelNames]);

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">综合使用统计 24 小时</h1>
      <ThemedChart option={optionCombined24h} style={{ height: "800px", width: "100%" }} />
      <h1 className="text-xl font-bold mb-4">综合使用统计 30 天</h1>
      <ThemedChart option={optionCombined30d} style={{ height: "800px", width: "100%" }} />
    </div>
  );
}
