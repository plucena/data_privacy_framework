import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Event } from '@shared/schema';
import { Calendar, MapPin, Lock } from 'lucide-react';
import { format } from 'date-fns';

interface EventCardProps {
  event: Event;
  onPurchase: (eventId: number) => void;
}

const categoryColors = {
  Technology: 'bg-purple-100 text-purple-800',
  Music: 'bg-pink-100 text-pink-800',
  Sports: 'bg-blue-100 text-blue-800',
  Arts: 'bg-green-100 text-green-800',
  Business: 'bg-yellow-100 text-yellow-800',
};

const eventImages = {
  Technology: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400',
  Music: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400',
  Sports: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400',
  Arts: 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400',
  Business: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400',
};

export function EventCard({ event, onPurchase }: EventCardProps) {
  const categoryColor = categoryColors[event.category as keyof typeof categoryColors] || 'bg-gray-100 text-gray-800';
  const eventImage = eventImages[event.category as keyof typeof eventImages] || eventImages.Technology;

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition duration-300">
      <img 
        src={eventImage} 
        alt={event.name} 
        className="w-full h-48 object-cover"
      />
      <div className="p-6">
        <div className="flex items-center justify-between mb-2">
          <Badge className={categoryColor}>
            {event.category}
          </Badge>
          <div className="flex items-center text-coti-privacy">
            <Lock className="w-4 h-4 mr-1" />
            <span className="text-xs">Private Pricing</span>
          </div>
        </div>
        
        <h3 className="font-bold text-lg text-gray-900 mb-2">{event.name}</h3>
        <p className="text-gray-600 text-sm mb-4 line-clamp-2">{event.description}</p>
        
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center text-gray-500 text-sm">
            <Calendar className="w-4 h-4 mr-2" />
            <span>{format(new Date(event.eventDate), 'MMM dd, yyyy')}</span>
          </div>
          <div className="flex items-center text-gray-500 text-sm">
            <MapPin className="w-4 h-4 mr-2" />
            <span>{event.location}</span>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">Available:</span>
            <span className="text-sm font-medium text-gray-700 flex items-center">
              <Lock className="w-3 h-3 text-coti-privacy mr-1" />
              <span>Encrypted</span>
            </span>
          </div>
          <Button
            onClick={() => onPurchase(event.id)}
            className="bg-coti-secondary hover:bg-coti-secondary/90 text-white px-4 py-2 rounded-lg font-medium transition duration-200"
          >
            Buy Ticket
          </Button>
        </div>
      </div>
    </div>
  );
}
