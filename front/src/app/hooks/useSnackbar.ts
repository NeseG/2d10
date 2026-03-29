import { useSnackbarContext } from '../providers/SnackbarProvider'

export function useSnackbar() {
  return useSnackbarContext()
}
