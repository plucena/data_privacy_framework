import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Ticket, Event } from '@shared/schema';
import { Calendar, MapPin, Lock, Shield, ArrowRightLeft } from 'lucide-react';
import { format } from 'date-fns';

interface TicketCardProps {
  ticket: Ticket & { event: Event };
  onProveOwnership: (ticketId: number) => void;
  onTransfer: (ticketId: number) => void;
}

export function TicketCard({ ticket, onProveOwnership, onTransfer }: TicketCardProps) {
  const getTicketIcon = (category: string) => {
    switch (category) {
      case 'Technology':
        return '🔧';
      case 'Music':
        return '🎵';
      case 'Sports':
        return '⚽';
      case 'Arts':
        return '🎨';
      case 'Business':
        return '💼';
      default:
        return '🎫';
    }
  };

  const getGradientClass = (category: string) => {
    switch (category) {
      case 'Technology':
        return 'from-purple-500 to-pink-500';
      case 'Music':
        return 'from-pink-500 to-purple-500';
      case 'Sports':
        return 'from-blue-500 to-cyan-500';
      case 'Arts':
        return 'from-green-500 to-teal-500';
      case 'Business':
        return 'from-yellow-500 to-orange-500';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className={`w-16 h-16 bg-gradient-to-br ${getGradientClass(ticket.event.category)} rounded-lg flex items-center justify-center text-2xl`}>
            {getTicketIcon(ticket.event.category)}
          </div>
          <div>
            <h3 className="font-bold text-lg text-gray-900">{ticket.event.name}</h3>
            <p className="text-gray-600">
              Ticket ID: <span className="font-mono text-sm">#{ticket.blockchainTicketId.toString().padStart(3, '0')}</span>
            </p>
            <div className="flex items-center space-x-4 mt-2">
              <span className="text-sm text-gray-500 flex items-center">
                <Calendar className="w-4 h-4 mr-1" />
                {format(new Date(ticket.event.eventDate), 'MMM dd, yyyy')}
              </span>
              <span className="text-sm text-gray-500 flex items-center">
                <MapPin className="w-4 h-4 mr-1" />
                {ticket.event.location}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="text-right">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-sm text-gray-500">Purchase Price:</span>
              <span className="text-sm font-medium text-gray-700 flex items-center">
                <Lock className="w-3 h-3 text-coti-privacy mr-1" />
                <span>Encrypted</span>
              </span>
            </div>
            <Badge className="bg-green-100 text-green-800">
              {ticket.verified ? 'Verified' : 'Pending'}
            </Badge>
          </div>
          <div className="flex flex-col space-y-2">
            <Button
              onClick={() => onProveOwnership(ticket.id)}
              className="bg-coti-privacy hover:bg-coti-privacy/90 text-white px-4 py-2 rounded-lg text-sm font-medium transition duration-200"
            >
              <Shield className="w-4 h-4 mr-2" />
              Prove Ownership
            </Button>
            <Button
              onClick={() => onTransfer(ticket.id)}
              variant="outline"
              className="px-4 py-2 rounded-lg text-sm font-medium transition duration-200"
            >
              <ArrowRightLeft className="w-4 h-4 mr-2" />
              Transfer
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
