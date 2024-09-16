"use client";

import * as React from "react";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

export function UsersTable() {
  // 获取用户数据
  const router = useRouter();
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
      getAllUserQuery.refetch();
    } catch (error) {
      console.error("Failed to update user status:", error);
      toast.error("Failed to update user status.");
    }
  };

  // 处理复选框的状态变化（实例）
  const handleInstanceCheckboxChange = async (userId: string, instanceId: string, currentStatus: boolean) => {
    try {
      await updateUsersMutation.mutateAsync({
        userId,
        instanceIds: [instanceId],
        canUse: !currentStatus,
      });
      toast.success(`Instance ability updated successfully.`);
      getAllUserInstanceAbility.refetch();
    } catch (error) {
      console.error("Failed to update instance ability:", error);
      toast.error("Failed to update instance ability.");
    }
  };

  // 检查加载状态和错误
  if (getAllUserQuery.isLoading || getAllUserInstanceAbility.isLoading || getAllServicesQuery.isLoading) return <p>Loading...</p>;
  if (getAllUserQuery.error || getAllUserInstanceAbility.error || getAllServicesQuery.error) return <p>Error loading data</p>;

  // 处理数据
  const sortedUsers = getAllUserQuery.data
    ? [...getAllUserQuery.data].sort((a, b) => (a.comment ?? "").localeCompare(b.comment ?? ""))
    : [];

  const usersWithInstances = sortedUsers.map((user) => {
    const matchedInstances = getAllUserInstanceAbility.data.filter((ability) => ability.userId === user.id);
    const sortedInstances = matchedInstances.sort((a, b) => {
      const serviceA = getServiceNameById(a.instanceId);
      const serviceB = getServiceNameById(b.instanceId);
      return serviceA.localeCompare(serviceB);
    });
    return { ...user, instances: sortedInstances };
  });

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-center">ID</TableHead>
            <TableHead className="text-center">Name</TableHead>
            <TableHead className="text-center">Username</TableHead>
            <TableHead className="text-center">Is Active</TableHead>
            <TableHead className="text-center">lastLoginAt</TableHead>
            <TableHead className="text-center">Instance Abilities</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {usersWithInstances.map((user) => (
            <TableRow key={user.id} className="hover:bg-gray-100">
              <TableCell className="text-center">{(user.comment ?? "").substring(0, 2)}</TableCell>
              <TableCell className="text-center">{user.name}</TableCell>
              <TableCell className="text-center">{user.username}</TableCell>
              <TableCell className="text-center">
                <Checkbox
                  checked={user.isActive}
                  onCheckedChange={() => handleCheckboxChange(user.id, user.isActive ?? false)}
                />
              </TableCell>
              <TableCell className="text-center">
                {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : "Never"}
              </TableCell>
              <TableCell className="text-center">
                <div className="flex flex-wrap justify-center items-center gap-2 overflow-hidden">
                  {user.instances.map((instance) => (
                    <div key={instance.instanceId} className="flex items-center gap-1">
                      <Badge variant="primary">{getServiceNameById(instance.instanceId)}</Badge>
                      <Checkbox
                        checked={instance.canUse}
                        onCheckedChange={() =>
                          handleInstanceCheckboxChange(user.id, instance.instanceId, instance.canUse ?? false)
                        }
                      />
                    </div>
                  ))}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
