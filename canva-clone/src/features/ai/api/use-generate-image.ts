import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";

import { client } from "@/lib/hono";

type ResponseType = InferResponseType<typeof client.api.ai["generate-image"]["$post"]>;
type RequestType = InferRequestType<typeof client.api.ai["generate-image"]["$post"]>["json"];

export const useGenerateImage = () => {
  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async (json) => {
      const response = await client.api.ai["generate-image"].$post({ json });
      if (!response.ok) throw new Error("Failed to generate image");
      return await response.json();
    },
    onError: () => {
      toast.error("Failed to generate image. Please try again.");
    },
  });

  return mutation;
};
