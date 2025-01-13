"use client";

import * as React from "react";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { DataTable } from "@/components/data-table";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

import { z } from "zod";
// 定义 Zod schema
const UserReadAdminWithLastLoginSchema = z.object({
  id: z.string(),
  name: z.string(),
  username: z.string(),
  isActive: z.boolean().nullable(),
  lastLoginAt: z.date().nullable(),
  instances: z.array(
    z.object({
      createdAt: z.date(),
      updatedAt: z.date(),
      userId: z.string(),
      instanceId: z.string(),
      token: z.string().nullable(),
      canUse: z.boolean(),
      data: z.any().optional(),
    })
  ),
});

export function UsersTable() {
  // 获取用户数据
  const getAllUserQuery = api.user.getAll.useQuery();
  const getAllUserInstanceAbility = api.userInstanceAbility.getMany.useQuery({});
  const getAllServicesQuery = api.serviceInstance.getAllAdmin.useQuery();
  const updateUsersMutation = api.user.update.useMutation();
  const updateInstanceUseStatusMutation = api.userInstanceAbility.updateInstanceUseStatus.useMutation();

  // 获取服务名称
  const getServiceNameById = (instanceId: string) => {
    const service = getAllServicesQuery.data?.find((service) => service.id === instanceId);
    return service ? service.name : instanceId;
  };

  // 处理复选框的状态变化（用户）
  const handleCheckboxChange = async (userId: string, currentStatus: boolean) => {
    try {
      await updateUsersMutation.mutateAsync({ id: userId, isActive: !currentStatus });
      toast.success(`User status updated successfully.`);
      await getAllUserQuery.refetch(); // 等待 refetch 完成
    } catch (error) {
      console.error("Failed to update user status:", error);
      toast.error("Failed to update user status.");
    }
  };

  // 处理复选框的状态变化（实例）
  const handleInstanceCheckboxChange = async (userId: string, instanceId: string, currentStatus: boolean) => {
    try {
      await updateInstanceUseStatusMutation.mutateAsync({
        userId,
        instanceIds: [instanceId],
        canUse: !currentStatus,
      });
      toast.success(`Instance ability updated successfully.`);
      await getAllUserInstanceAbility.refetch(); // 等待 refetch 完成
    } catch (error) {
      console.error("Failed to update instance ability:", error);
      toast.error("Failed to update instance ability.");
    }
  };

  // 处理数据
  const sortedUsers = getAllUserQuery.data
    ? [...getAllUserQuery.data].sort((a, b) => (a.comment ?? "").localeCompare(b.comment ?? ""))
    : [];

  const usersWithInstances = sortedUsers.map((user) => {
    const matchedInstances = getAllUserInstanceAbility.data?.filter((ability) => ability.userId === user.id) ?? []; // 使用 ?? 操作符

    const sortedInstances = matchedInstances.sort((a, b) => {
      const serviceA = getServiceNameById(a.instanceId);
      const serviceB = getServiceNameById(b.instanceId);
      return serviceA.localeCompare(serviceB);
    });

    return { ...user, instances: sortedInstances };
  });

  // 修改 columns 定义，明确指定 accessorKey 类型
  const columns: Array<{
    header: string;
    accessorKey: keyof z.infer<typeof UserReadAdminWithLastLoginSchema>; // 确保与 schema 一致
    cell?: ({ row }: { row: any }) => React.ReactNode;
  }> = [
      {
        header: "Comment",
        accessorKey: "comment", // 使用 `comment` 作为访问键
        cell: ({ row }: { row: any }) => (
          <div className="text-center">{(row.original.comment ?? "").substring(0, 2)}</div>
        ),
      }, { header: "Name", accessorKey: "name" },
      { header: "Username", accessorKey: "username" },
      {
        header: "Is Active",
        accessorKey: "isActive",
        cell: ({ row }: { row: any }) => (
          <Checkbox
            checked={row.original.isActive ?? false}
            onCheckedChange={() => handleCheckboxChange(row.original.id, row.original.isActive ?? false)}
          />
        ),
      },
      {
        header: "Last Login At",
        accessorKey: "lastLoginAt",
        cell: ({ row }: { row: any }) =>
          row.original.lastLoginAt ? new Date(row.original.lastLoginAt).toLocaleDateString() : "Never",
      },
      {
        header: "Instance Abilities",
        accessorKey: "instances",
        cell: ({ row }: { row: any }) => (
          <div className="flex flex-wrap justify-center items-center gap-2 overflow-hidden">
            {row.original.instances.map((instance: any) => (
              <div key={instance.instanceId} className="flex items-center gap-1">
                <Badge variant="outline">{getServiceNameById(instance.instanceId)}</Badge>
                <Checkbox
                  checked={instance.canUse ?? false}
                  onCheckedChange={() =>
                    handleInstanceCheckboxChange(row.original.id, instance.instanceId, instance.canUse ?? false)
                  }
                />
              </div>
            ))}
          </div>
        ),
      },
    ];

  return (
    <div className="w-full">
      <DataTable
        data={usersWithInstances}
        filterSearchField={"username"}
        schema={UserReadAdminWithLastLoginSchema} // 使用 Zod schema 符合类型要求
        columns={columns} // 自定义渲染列
        defaultPageSize={100}
      />
    </div>
  );
}