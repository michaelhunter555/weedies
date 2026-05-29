import { useQueryClient } from "@tanstack/react-query";

export const useInvalidateQuery = () => {
  const queryClient = useQueryClient();
  const invalidateQuery = async (dependencyKey: string) => {
    return await queryClient.invalidateQueries({ queryKey: [dependencyKey], exact: false });
  };

  return {
    invalidateQuery,
  };
};
