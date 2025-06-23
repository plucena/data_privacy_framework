import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { WalletConnection } from '@/components/wallet-connection';
import { EventCard } from '@/components/event-card';
import { TicketCard } from '@/components/ticket-card';
import { CreateEventForm } from '@/components/create-event-form';
import { PurchaseModal } from '@/components/purchase-modal';
import { TransactionModal } from '@/components/transaction-modal';
import { useEvents } from '@/hooks/use-events';
import { useTicketsByOwner, useProveOwnership, useTransferTicket } from '@/hooks/use-tickets';
import { useCotiWallet } from '@/hooks/use-coti-wallet';
import { Event } from '@shared/schema';
import { TransactionState } from '@/lib/types';
import { Shield, Calendar, Ticket, Plus, Search, Wallet } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function Home() {
  const [activeTab, setActiveTab] = useState('events');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [transactionState, setTransactionState] = useState<TransactionState>({
    isLoading: false,
    isSuccess: false,
    isError: false,
    error: null,
    transactionHash: null,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  const { wallet } = useCotiWallet();
  const { toast } = useToast();
  const { data: events = [], isLoading: eventsLoading } = useEvents();
  const { data: tickets = [], isLoading: ticketsLoading } = useTicketsByOwner(wallet.address);
  const proveOwnershipMutation = useProveOwnership();
  const transferTicketMutation = useTransferTicket();

  // Filter events
  const filteredEvents = events.filter(event => {
    const matchesSearch = event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !categoryFilter || categoryFilter === 'all' || event.category === categoryFilter;
    const matchesDate = !dateFilter || dateFilter === 'all' || checkDateFilter(event.eventDate, dateFilter);
    
    return matchesSearch && matchesCategory && matchesDate;
  });

  const checkDateFilter = (eventDate: string | Date, filter: string) => {
    const date = new Date(eventDate);
    const now = new Date();
    
    switch (filter) {
      case 'this-week':
        const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        return date >= now && date <= weekFromNow;
      case 'this-month':
        const monthFromNow = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
        return date >= now && date <= monthFromNow;
      case 'next-3-months':
        const threeMonthsFromNow = new Date(now.getFullYear(), now.getMonth() + 3, now.getDate());
        return date >= now && date <= threeMonthsFromNow;
      default:
        return true;
    }
  };

  const handlePurchaseTicket = (eventId: number) => {
    const event = events.find(e => e.id === eventId);
    if (event) {
      setSelectedEvent(event);
      setShowPurchaseModal(true);
    }
  };

  const handlePurchaseSuccess = () => {
    setTransactionState({
      isLoading: false,
      isSuccess: true,
      isError: false,
      error: null,
      transactionHash: '0x' + Math.random().toString(16).substring(2, 18),
    });
    setShowTransactionModal(true);
  };

  const handleProveOwnership = async (ticketId: number) => {
    try {
      const result = await proveOwnershipMutation.mutateAsync(ticketId);
      toast({
        title: 'Ownership Verified',
        description: `Ownership proof generated successfully. Verified: ${result.verified}`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to prove ownership',
        variant: 'destructive',
      });
    }
  };

  const handleTransferTicket = async (ticketId: number) => {
    // In a real app, this would open a transfer dialog
    const toAddress = prompt('Enter recipient address:');
    if (!toAddress) return;

    try {
      await transferTicketMutation.mutateAsync({ ticketId, toAddress });
      toast({
        title: 'Transfer Successful',
        description: 'Ticket has been transferred successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to transfer ticket',
        variant: 'destructive',
      });
    }
  };

  const handleViewTickets = () => {
    setActiveTab('tickets');
    setShowTransactionModal(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <div className="flex items-center space-x-2">
                <Shield className="w-8 h-8 text-coti-privacy" />
                <h1 className="text-xl font-bold text-coti-primary">COTI Tickets</h1>
              </div>
            </div>
            <WalletConnection />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="events" className="flex items-center space-x-2">
              <Calendar className="w-4 h-4" />
              <span>Browse Events</span>
            </TabsTrigger>
            <TabsTrigger value="tickets" className="flex items-center space-x-2">
              <Ticket className="w-4 h-4" />
              <span>My Tickets</span>
              {tickets.length > 0 && (
                <Badge className="ml-2 bg-coti-accent text-white">
                  {tickets.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="create" className="flex items-center space-x-2">
              <Plus className="w-4 h-4" />
              <span>Create Event</span>
            </TabsTrigger>
          </TabsList>

          {/* Events Tab */}
          <TabsContent value="events" className="space-y-6">
            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search events..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex space-x-4">
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="Music">Music</SelectItem>
                    <SelectItem value="Sports">Sports</SelectItem>
                    <SelectItem value="Technology">Technology</SelectItem>
                    <SelectItem value="Arts">Arts</SelectItem>
                    <SelectItem value="Business">Business</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Any Date" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any Date</SelectItem>
                    <SelectItem value="this-week">This Week</SelectItem>
                    <SelectItem value="this-month">This Month</SelectItem>
                    <SelectItem value="next-3-months">Next 3 Months</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Events Grid */}
            {eventsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array(6).fill(0).map((_, i) => (
                  <div key={i} className="bg-white rounded-xl shadow-md overflow-hidden animate-pulse">
                    <div className="w-full h-48 bg-gray-200"></div>
                    <div className="p-6 space-y-4">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                      <div className="h-4 bg-gray-200 rounded w-full"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    onPurchase={handlePurchaseTicket}
                  />
                ))}
              </div>
            )}

            {!eventsLoading && filteredEvents.length === 0 && (
              <div className="text-center py-12">
                <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No events found</h3>
                <p className="text-gray-500">Try adjusting your search or filter criteria</p>
              </div>
            )}
          </TabsContent>

          {/* My Tickets Tab */}
          <TabsContent value="tickets" className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">My Tickets</h2>
              <p className="text-gray-600">Manage your private tickets with encrypted ownership proofs</p>
            </div>

            {!wallet.isConnected ? (
              <div className="text-center py-12">
                <Wallet className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Connect Your Wallet</h3>
                <p className="text-gray-500">Please connect your wallet to view your tickets</p>
              </div>
            ) : ticketsLoading ? (
              <div className="space-y-4">
                {Array(3).fill(0).map((_, i) => (
                  <div key={i} className="bg-white rounded-xl shadow-md p-6 animate-pulse">
                    <div className="flex items-center space-x-4">
                      <div className="w-16 h-16 bg-gray-200 rounded-lg"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : tickets.length === 0 ? (
              <div className="text-center py-12">
                <Ticket className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No tickets yet</h3>
                <p className="text-gray-500">Purchase tickets from events to see them here</p>
              </div>
            ) : (
              <div className="space-y-4">
                {tickets.map((ticket) => (
                  <TicketCard
                    key={ticket.id}
                    ticket={ticket}
                    onProveOwnership={handleProveOwnership}
                    onTransfer={handleTransferTicket}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Create Event Tab */}
          <TabsContent value="create">
            <CreateEventForm />
          </TabsContent>
        </Tabs>
      </main>

      {/* Modals */}
      <PurchaseModal
        event={selectedEvent}
        isOpen={showPurchaseModal}
        onClose={() => setShowPurchaseModal(false)}
        onSuccess={handlePurchaseSuccess}
      />

      <TransactionModal
        isOpen={showTransactionModal}
        onClose={() => setShowTransactionModal(false)}
        state={transactionState}
        onViewTickets={handleViewTickets}
      />
    </div>
  );
}
