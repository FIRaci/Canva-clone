import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";

interface SignUpRequest {
  name: string;
  email: string;
  password: string;
  language?: string;
}

export const useSignUp = () => {
  return useMutation<unknown, Error, SignUpRequest>({
    mutationFn: async (json) => {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(json),
      });

      if (!response.ok) {
        const data = await response.json() as { error?: string };
        throw new Error(data.error ?? "Something went wrong");
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success("Account created!");
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });
};
