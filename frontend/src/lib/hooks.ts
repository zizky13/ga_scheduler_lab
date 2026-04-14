import { useQuery } from '@tanstack/react-query'
import { timeSlotsApi, roomsApi } from '@/lib/api'

export function useTimeSlots() {
  return useQuery({
    queryKey: ['timeslots'],
    queryFn: () => timeSlotsApi.list(),
    staleTime: 5 * 60_000,
  })
}

export function useRooms() {
  return useQuery({
    queryKey: ['rooms'],
    queryFn: () => roomsApi.list(),
    staleTime: 5 * 60_000,
  })
}
