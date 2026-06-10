import { useMutation, useQueryClient, QueryKey } from "@tanstack/react-query";
import { useToast } from "@/components/ui/use-toast";

interface UseSaveMutationOptions<T> {
  save: (payload: T) => Promise<unknown>;
  /** Query keys to invalidate after a successful save. */
  invalidate?: QueryKey[];
  successMessage: string;
  errorMessage: string;
  onSuccess?: (result: unknown) => void;
}

/**
 * Drop-in mutation hook that handles the full save lifecycle:
 *   1. Calls `save(payload)`.
 *   2. Invalidates all listed query keys so lists refresh automatically.
 *   3. Shows a success toast and calls `onSuccess` (e.g. navigate away).
 *   4. Shows a destructive toast on error — no more silent console.error catches.
 */
export function useSaveMutation<T>({
  save,
  invalidate = [],
  successMessage,
  errorMessage,
  onSuccess,
}: UseSaveMutationOptions<T>) {
  const { toast } = useToast();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: save,
    onSuccess: async (result) => {
      if (invalidate.length) {
        await Promise.all(
          invalidate.map((key) => qc.invalidateQueries({ queryKey: key }))
        );
      }
      toast({ title: successMessage });
      onSuccess?.(result);
    },
    onError: (e: any) => {
      toast({
        title: e?.response?.data?.message ?? errorMessage,
        variant: "destructive",
      });
    },
  });
}
