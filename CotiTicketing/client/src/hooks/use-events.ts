import { useQuery } from '@tanstack/react-query';
import { Event } from '@shared/schema';

export function useEvents() {
  return useQuery({
    queryKey: ['/api/events'],
    queryFn: async (): Promise<Event[]> => {
      const response = await fetch('/api/events');
      if (!response.ok) {
        throw new Error('Failed to fetch events');
      }
      return response.json();
    },
  });
}

export function useEvent(id: number) {
  return useQuery({
    queryKey: ['/api/events', id],
    queryFn: async (): Promise<Event> => {
      const response = await fetch(`/api/events/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch event');
      }
      return response.json();
    },
    enabled: !!id,
  });
}
