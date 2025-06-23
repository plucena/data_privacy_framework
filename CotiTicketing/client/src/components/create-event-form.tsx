import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { apiRequest } from '@/lib/queryClient';
import { CreateEventFormData } from '@/lib/types';
import { Info, Lock, Plus } from 'lucide-react';
import { useCotiWallet } from '@/hooks/use-coti-wallet';
import { useToast } from '@/hooks/use-toast';

const createEventSchema = z.object({
  name: z.string().min(1, 'Event name is required'),
  description: z.string().min(1, 'Description is required'),
  category: z.string().min(1, 'Category is required'),
  location: z.string().min(1, 'Location is required'),
  eventDate: z.string().min(1, 'Event date is required'),
  price: z.number().positive('Price must be positive'),
  totalSupply: z.number().int().positive('Total supply must be a positive integer'),
  resaleAllowed: z.boolean(),
  resaleMarkup: z.number().optional(),
});

export function CreateEventForm() {
  const [showResaleOptions, setShowResaleOptions] = useState(false);
  const { wallet } = useCotiWallet();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<CreateEventFormData>({
    resolver: zodResolver(createEventSchema),
    defaultValues: {
      name: '',
      description: '',
      category: '',
      location: '',
      eventDate: '',
      price: 0,
      totalSupply: 100,
      resaleAllowed: false,
      resaleMarkup: 0,
    },
  });

  const createEventMutation = useMutation({
    mutationFn: async (data: CreateEventFormData) => {
      if (!wallet.address) {
        throw new Error('Wallet not connected');
      }

      const eventData = {
        ...data,
        organizerAddress: wallet.address,
        contractAddress: null,
        encryptedPrice: null,
        encryptedTotalSupply: null,
        encryptedTicketsSold: null,
        encryptedResaleMarkup: null,
      };

      const response = await apiRequest('POST', '/api/events', eventData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
      form.reset();
      toast({
        title: 'Event Created',
        description: 'Your event has been created successfully with encrypted pricing.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create event',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: CreateEventFormData) => {
    createEventMutation.mutate(data);
  };

  if (!wallet.isConnected) {
    return (
      <div className="max-w-2xl mx-auto">
        <Alert>
          <Info className="w-4 h-4" />
          <AlertDescription>
            Please connect your wallet to create events.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Create New Event</h2>
        <p className="text-gray-600">Create an event with private pricing and encrypted ticket information</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="bg-white rounded-xl shadow-md p-8 space-y-6">
          {/* Event Basic Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Info className="w-5 h-5 mr-2 text-coti-secondary" />
              Event Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Event Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter event name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Music">Music</SelectItem>
                        <SelectItem value="Sports">Sports</SelectItem>
                        <SelectItem value="Technology">Technology</SelectItem>
                        <SelectItem value="Arts">Arts</SelectItem>
                        <SelectItem value="Business">Business</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="eventDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Event Date</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input placeholder="Event location" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea rows={3} placeholder="Describe your event..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Private Pricing Section */}
          <div className="space-y-4 border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Lock className="w-5 h-5 mr-2 text-coti-privacy" />
              Private Pricing & Supply
              <span className="ml-2 bg-purple-100 text-purple-800 text-xs font-medium px-2 py-1 rounded-full">Encrypted</span>
            </h3>
            
            <Alert className="bg-purple-50 border-purple-200">
              <Info className="w-4 h-4 text-purple-600" />
              <AlertDescription className="text-purple-800">
                <p className="font-medium mb-1">Privacy Protection</p>
                <p>Ticket pricing and supply information will be encrypted on the COTI blockchain, ensuring only authorized parties can access this sensitive information.</p>
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center">
                      Ticket Price (COTI)
                      <Lock className="w-3 h-3 text-coti-privacy ml-1" />
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="totalSupply"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center">
                      Total Supply
                      <Lock className="w-3 h-3 text-coti-privacy ml-1" />
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="100"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Resale Settings */}
          <div className="space-y-4 border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Plus className="w-5 h-5 mr-2 text-coti-secondary" />
              Resale Settings
            </h3>
            
            <FormField
              control={form.control}
              name="resaleAllowed"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={(checked) => {
                        field.onChange(checked);
                        setShowResaleOptions(!!checked);
                      }}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Allow ticket resale</FormLabel>
                  </div>
                </FormItem>
              )}
            />

            {showResaleOptions && (
              <div className="pl-7 space-y-4">
                <FormField
                  control={form.control}
                  name="resaleMarkup"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center">
                        Maximum Resale Markup (%)
                        <Lock className="w-3 h-3 text-coti-privacy ml-1" />
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="10"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <p className="text-xs text-gray-500">This value will be encrypted to prevent manipulation</p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 pt-6">
            <Button
              type="submit"
              disabled={createEventMutation.isPending}
              className="flex-1 bg-coti-secondary hover:bg-coti-secondary/90 text-white py-3 px-6 rounded-lg font-medium transition duration-200 flex items-center justify-center"
            >
              <Plus className="w-4 h-4 mr-2" />
              {createEventMutation.isPending ? 'Creating...' : 'Create Event'}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="flex-1 py-3 px-6 rounded-lg font-medium transition duration-200"
              onClick={() => form.reset()}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
