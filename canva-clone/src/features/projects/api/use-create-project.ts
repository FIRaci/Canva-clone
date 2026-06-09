import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";

import { client } from "@/lib/hono";

type ResponseType = InferResponseType<(typeof client.api.projects)["$post"], 200>;
type RequestType = InferRequestType<(typeof client.api.projects)["$post"]>["json"];

class ProjectCreateError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ProjectCreateError";
    this.status = status;
  }
}

export const useCreateProject = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async (json) => {
      const response = await client.api.projects.$post({ json });

      if (!response.ok) {
        let message = "Failed to create project.";

        try {
          const body = await response.json();
          if (body && typeof body === "object" && "error" in body && typeof body.error === "string") {
            message = body.error;
          }
        } catch {
          // Keep fallback message when response body is not JSON.
        }

        throw new ProjectCreateError(message, response.status);
      }

      return await response.json();
    },
    onSuccess: () => {
      toast.success("Project created.");

      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: (error) => {
      if (error instanceof ProjectCreateError && error.status === 401) {
        toast.error("Your session has expired. Redirecting to sign in...");
        window.location.href = "/sign-in";
        return;
      }

      toast.error(error.message || "Failed to create project.");
    },
  });

  return mutation;
};
