import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { User, Client, Mechanic, Workshop, Repair, AuthorizedPoint, Part, ExpressService, RepairRequest, api, VinDecoded } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { LogOut, Users, Wrench, Building2, ClipboardList, MapPin, Plus, Trash2, Calendar, Package, Zap, FileText, CheckCircle, XCircle, Share2, AlertCircle, Edit, ChevronsUpDown, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { VinDecoderInput } from '@/components/VinDecoderInput';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

interface AdminDashboardProps {
  user: User;
  onLogout: () => void;
}

export default function AdminDashboard({ user, onLogout }: AdminDashboardProps) {
  const { t } = useTranslation(['dashboard', 'repairs', 'parts', 'clients', 'mechanics', 'workshops', 'authorized_points', 'express_service', 'repair_requests', 'toasts', 'common', 'vin']);
  const [clients, setClients] = useState<Client[]>([]);
  const [mechanics, setMechanics] = useState<Mechanic[]>([]);
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [repairs, setRepairs] = useState<Repair[]>([]);
  const [authorizedPoints, setAuthorizedPoints] = useState<AuthorizedPoint[]>([]);
  const [expressServices, setExpressServices] = useState<ExpressService[]>([]);
  const [repairRequests, setRepairRequests] = useState<RepairRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const [clientDialog, setClientDialog] = useState(false);
  const [mechanicDialog, setMechanicDialog] = useState(false);
  const [workshopDialog, setWorkshopDialog] = useState(false);
  const [visitDialog, setVisitDialog] = useState(false);
  const [repairDialog, setRepairDialog] = useState(false);
  const [authorizedPointDialog, setAuthorizedPointDialog] = useState(false);
  const [partsDialog, setPartsDialog] = useState(false);
  const [expressServiceDialog, setExpressServiceDialog] = useState(false);
  const [repairRequestDialog, setRepairRequestDialog] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedRepairForParts, setSelectedRepairForParts] = useState<Repair | null>(null);
  const [selectedRepairRequest, setSelectedRepairRequest] = useState<RepairRequest | null>(null);
  
  const [editRepairDialog, setEditRepairDialog] = useState(false);
  const [editRepair, setEditRepair] = useState<Repair | null>(null);
  const [editExpressDialog, setEditExpressDialog] = useState(false);
  const [editExpress, setEditExpress] = useState<ExpressService | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{type: 'repair' | 'express' | 'request', id: string} | null>(null);
  const [shareFormDialog, setShareFormDialog] = useState(false);
  const [costBreakdownDialog, setCostBreakdownDialog] = useState(false);
  const [selectedRepairForCost, setSelectedRepairForCost] = useState<Repair | null>(null);
  const [parts, setParts] = useState<Part[]>([]);
  const [partForm, setPartForm] = useState({
    name: '',
    supplier_id: '',
    supplier_name: '',
    ordered_online: false,
    estimated_arrival: '',
    cost: '',
    notes: '',
  });
  const [supplierMode, setSupplierMode] = useState<'registered' | 'custom'>('registered');
  const [supplierComboboxOpen, setSupplierComboboxOpen] = useState(false);
  const [supplierSearchQuery, setSupplierSearchQuery] = useState('');

  const [clientForm, setClientForm] = useState({
    name: '',
    email: '',
    phone: '',
    city: '',
    address: '',
    vehicle_info: '',
  });

  const [visitForm, setVisitForm] = useState({
    client_search: '',
    client_id: '',
    scheduled_date: '',
    scheduled_time: '',
    service_type: 'mobile' as 'mobile' | 'workshop',
    location: '',
    issue_description: '',
    mechanic_id: '',
  });

  const [mechanicForm, setMechanicForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    specialties: '',
    is_mobile: false,
    speaks_english: false,
  });

  const [workshopForm, setWorkshopForm] = useState({
    name: '',
    address: '',
    phone: '',
    services: '',
  });

  const [repairForm, setRepairForm] = useState({
    client_search: '',
    client_id: '',
    vehicle_info: '',
    issue_description: '',
    service_type: 'mobile' as 'mobile' | 'workshop',
    location: '',
    scheduled_date: '',
    scheduled_time: '',
    mechanic_id: '',
    cost: '',
    amount_charged: '',
    balance_pending: '',
    status: 'pending' as 'pending' | 'assigned' | 'in_progress' | 'waiting_parts' | 'completed' | 'cancelled' | 'paid' | 'balance_pending',
  });

  const [authorizedPointForm, setAuthorizedPointForm] = useState({
    name: '',
    address: '',
    phone: '',
    services: '',
    contact_person: '',
  });

  const [expressServiceForm, setExpressServiceForm] = useState({
    client_search: '',
    client_id: '',
    vehicle_info: '',
    emergency_type: '',
    description: '',
    priority: 'urgent' as 'urgent' | 'high' | 'critical',
    location: '',
    contact_phone: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [clientsData, mechanicsData, workshopsData, repairsData, pointsData, servicesData, requestsData] = await Promise.all([
        api.getClients(),
        api.getMechanics(),
        api.getWorkshops(),
        api.getRepairs(),
        api.getAuthorizedPoints(),
        api.getExpressServices(),
        api.getRepairRequests(),
      ]);
      setClients(clientsData);
      setMechanics(mechanicsData);
      setWorkshops(workshopsData);
      setRepairs(repairsData);
      setAuthorizedPoints(pointsData);
      setExpressServices(servicesData);
      setRepairRequests(requestsData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los datos',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClient = async () => {
    try {
      const defaultPassword = Math.random().toString(36).slice(-8);
      
      const userData = await api.register({
        email: clientForm.email,
        password: defaultPassword,
        name: clientForm.name,
        role: 'cliente',
        phone: clientForm.phone,
      });
      
      await api.createClient({
        user_id: userData.id,
        city: clientForm.city,
        address: clientForm.address,
        vehicle_info: clientForm.vehicle_info,
      });

      toast({
        description: t('toasts:client.create_success'),
      });
      
      setClientDialog(false);
      setClientForm({ name: '', email: '', phone: '', city: '', address: '', vehicle_info: '' });
      loadData();
    } catch (error: any) {
      console.error('Error creating client:', error);
      const errorMessage = error?.message || t('toasts:client_creation_error');
      toast({
        title: t('toasts:error_title'),
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  const handleCreateMechanic = async () => {
    try {
      const defaultPassword = 'mechanic123';
      const userData = await api.register({
        email: mechanicForm.email,
        password: defaultPassword,
        name: mechanicForm.name,
        role: 'mecanico',
        phone: mechanicForm.phone,
      });
      
      await api.createMechanic({
        user_id: userData.id,
        address: mechanicForm.address,
        specialties: mechanicForm.specialties.split(',').map(s => s.trim()),
        is_mobile: mechanicForm.is_mobile,
        speaks_english: mechanicForm.speaks_english,
      });

      toast({
        title: 'Éxito',
        description: 'Mecánico creado correctamente',
      });
      
      setMechanicDialog(false);
      setMechanicForm({ name: '', email: '', phone: '', address: '', specialties: '', is_mobile: false, speaks_english: false });
      loadData();
    } catch (error) {
      console.error('Error creating mechanic:', error);
      toast({
        title: 'Error',
        description: 'No se pudo crear el mecánico',
        variant: 'destructive',
      });
    }
  };

  const handleCreateWorkshop = async () => {
    try {
      await api.createWorkshop({
        name: workshopForm.name,
        address: workshopForm.address,
        phone: workshopForm.phone,
        services: workshopForm.services.split(',').map(s => s.trim()),
      });

      toast({
        title: 'Éxito',
        description: 'Taller creado correctamente',
      });
      
      setWorkshopDialog(false);
      setWorkshopForm({ name: '', address: '', phone: '', services: '' });
      loadData();
    } catch (error) {
      console.error('Error creating workshop:', error);
      toast({
        title: 'Error',
        description: 'No se pudo crear el taller',
        variant: 'destructive',
      });
    }
  };

  const handleCreateAuthorizedPoint = async () => {
    try {
      await api.createAuthorizedPoint({
        name: authorizedPointForm.name,
        address: authorizedPointForm.address,
        phone: authorizedPointForm.phone,
        services: authorizedPointForm.services.split(',').map(s => s.trim()),
        contact_person: authorizedPointForm.contact_person,
      });

      toast({
        title: 'Éxito',
        description: 'Punto autorizado creado correctamente',
      });
      
      setAuthorizedPointDialog(false);
      setAuthorizedPointForm({ name: '', address: '', phone: '', services: '', contact_person: '' });
      loadData();
    } catch (error) {
      console.error('Error creating authorized point:', error);
      toast({
        title: 'Error',
        description: 'No se pudo crear el punto autorizado',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteClient = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este cliente?')) return;
    try {
      await api.deleteClient(id);
      toast({
        title: 'Éxito',
        description: 'Cliente eliminado correctamente',
      });
      loadData();
    } catch (error) {
      console.error('Error deleting client:', error);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el cliente',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteMechanic = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este mecánico?')) return;
    try {
      await api.deleteMechanic(id);
      toast({
        title: 'Éxito',
        description: 'Mecánico eliminado correctamente',
      });
      loadData();
    } catch (error) {
      console.error('Error deleting mechanic:', error);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el mecánico',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteWorkshop = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este taller?')) return;
    try {
      await api.deleteWorkshop(id);
      toast({
        title: 'Éxito',
        description: 'Taller eliminado correctamente',
      });
      loadData();
    } catch (error) {
      console.error('Error deleting workshop:', error);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el taller',
        variant: 'destructive',
      });
    }
  };

  const filteredClients = clients.filter(client => 
    visitForm.client_search === '' || 
    client.user_name.toLowerCase().includes(visitForm.client_search.toLowerCase()) ||
    client.user_email.toLowerCase().includes(visitForm.client_search.toLowerCase())
  );

  const handleSelectClient = (client: Client) => {
    setSelectedClient(client);
    setVisitForm({
      ...visitForm,
      client_search: client.user_name,
      client_id: client.id,
      location: client.address,
    });
  };

  const handleCreateVisit = async () => {
    if (!selectedClient) {
      toast({
        title: 'Error',
        description: 'Debes seleccionar un cliente',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      const scheduledDateTime = `${visitForm.scheduled_date}T${visitForm.scheduled_time}:00`;
      
      await api.createRepair({
        client_id: selectedClient.id,
        vehicle_info: selectedClient.vehicle_info,
        issue_description: visitForm.issue_description,
        service_type: visitForm.service_type,
        location: visitForm.location,
        scheduled_date: scheduledDateTime,
      });

      toast({
        title: 'Éxito',
        description: 'Visita programada correctamente',
      });
      
      setVisitDialog(false);
      setSelectedClient(null);
      setVisitForm({
        client_search: '',
        client_id: '',
        scheduled_date: '',
        scheduled_time: '',
        service_type: 'mobile',
        location: '',
        issue_description: '',
        mechanic_id: '',
      });
      loadData();
    } catch (error) {
      console.error('Error scheduling visit:', error);
      toast({
        title: 'Error',
        description: 'No se pudo programar la visita',
        variant: 'destructive',
      });
    }
  };

  const handleSelectClientForRepair = (client: Client) => {
    setSelectedClient(client);
    setRepairForm({
      ...repairForm,
      client_search: client.user_name,
      client_id: client.id,
      vehicle_info: client.vehicle_info,
      location: client.address,
    });
  };

  const handleCreateRepair = async () => {
    if (!selectedClient) {
      toast({
        title: 'Error',
        description: 'Debes seleccionar un cliente',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      const scheduledDateTime = repairForm.scheduled_date && repairForm.scheduled_time
        ? `${repairForm.scheduled_date}T${repairForm.scheduled_time}:00`
        : undefined;
      
      const repairData: any = {
        client_id: selectedClient.id,
        vehicle_info: repairForm.vehicle_info,
        issue_description: repairForm.issue_description,
        service_type: repairForm.service_type,
        location: repairForm.location,
        scheduled_date: scheduledDateTime,
      };
      
      if (repairForm.mechanic_id) {
        repairData.mechanic_id = repairForm.mechanic_id;
      }
      
      const createdRepair = await api.createRepair(repairData);
      
      if (repairForm.mechanic_id) {
        await api.updateRepair(createdRepair.id, { mechanic_id: repairForm.mechanic_id });
      }

      toast({
        title: 'Éxito',
        description: 'Reparación creada correctamente',
      });
      
      setRepairDialog(false);
      setSelectedClient(null);
      setRepairForm({
        client_search: '',
        client_id: '',
        vehicle_info: '',
        issue_description: '',
        service_type: 'mobile',
        location: '',
        scheduled_date: '',
        scheduled_time: '',
        mechanic_id: '',
        cost: '',
        amount_charged: '',
        balance_pending: '',
        status: 'pending',
      });
      loadData();
    } catch (error) {
      console.error('Error creating repair:', error);
      toast({
        title: 'Error',
        description: 'No se pudo crear la reparación',
        variant: 'destructive',
      });
    }
  };

  // @ts-ignore - Unused but kept for potential future use
  const handleUpdateRepairStatus = async (repairId: string, newStatus: string) => {
    try {
      await api.updateRepair(repairId, { status: newStatus });
      
      toast({
        title: 'Éxito',
        description: 'Estado actualizado correctamente',
      });
      
      loadData();
    } catch (error) {
      console.error('Error updating repair status:', error);
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el estado',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      assigned: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-purple-100 text-purple-800',
      waiting_parts: 'bg-amber-100 text-amber-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      paid: 'bg-emerald-100 text-emerald-800',
      balance_pending: 'bg-orange-100 text-orange-800',
    };
    const labels: Record<string, string> = {
      pending: 'Pendiente',
      assigned: 'Asignado',
      in_progress: 'En Progreso',
      waiting_parts: 'Esperando Piezas',
      completed: 'Completado',
      cancelled: 'Cancelado',
      paid: 'Pagado',
      balance_pending: 'Balance Pendiente',
    };
    return <Badge className={variants[status] || ''}>{labels[status] || status}</Badge>;
  };

  const handleOpenPartsDialog = async (repair: Repair) => {
    setSelectedRepairForParts(repair);
    try {
      const partsData = await api.getPartsByRepair(repair.id);
      setParts(partsData);
      setPartsDialog(true);
    } catch (error) {
      console.error('Error loading parts:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las piezas',
        variant: 'destructive',
      });
    }
  };

  const handleCreatePart = async () => {
    if (!selectedRepairForParts || !partForm.name) {
      toast({
        title: 'Error',
        description: 'Por favor complete los campos requeridos',
        variant: 'destructive',
      });
      return;
    }

    try {
      await api.createPart({
        repair_id: selectedRepairForParts.id,
        name: partForm.name,
        supplier_id: supplierMode === 'registered' && partForm.supplier_id ? partForm.supplier_id : undefined,
        supplier_name: supplierMode === 'custom' && partForm.supplier_name ? partForm.supplier_name : undefined,
        ordered_online: partForm.ordered_online,
        estimated_arrival: partForm.estimated_arrival || undefined,
        cost: partForm.cost ? parseFloat(partForm.cost) : undefined,
        notes: partForm.notes || undefined,
      });

      toast({
        title: 'Éxito',
        description: 'Pieza agregada correctamente',
      });

      const partsData = await api.getPartsByRepair(selectedRepairForParts.id);
      setParts(partsData);
      setPartForm({
        name: '',
        supplier_id: '',
        supplier_name: '',
        ordered_online: false,
        estimated_arrival: '',
        cost: '',
        notes: '',
      });
      setSupplierMode('registered');
    } catch (error) {
      console.error('Error creating part:', error);
      toast({
        title: 'Error',
        description: 'No se pudo agregar la pieza',
        variant: 'destructive',
      });
    }
  };

  const handleUpdatePartStatus = async (partId: string, newStatus: string) => {
    try {
      await api.updatePart(partId, { status: newStatus });
      
      toast({
        title: 'Éxito',
        description: 'Estado de pieza actualizado',
      });

      if (selectedRepairForParts) {
        const partsData = await api.getPartsByRepair(selectedRepairForParts.id);
        setParts(partsData);
      }
    } catch (error) {
      console.error('Error updating part status:', error);
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el estado',
        variant: 'destructive',
      });
    }
  };

  const handleDeletePart = async (partId: string) => {
    try {
      await api.deletePart(partId);
      
      toast({
        title: 'Éxito',
        description: 'Pieza eliminada correctamente',
      });

      if (selectedRepairForParts) {
        const partsData = await api.getPartsByRepair(selectedRepairForParts.id);
        setParts(partsData);
      }
    } catch (error) {
      console.error('Error deleting part:', error);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar la pieza',
        variant: 'destructive',
      });
    }
  };

  const filteredClientsForExpressService = clients.filter(client =>
    client.user_name.toLowerCase().includes(expressServiceForm.client_search.toLowerCase()) ||
    client.user_email.toLowerCase().includes(expressServiceForm.client_search.toLowerCase())
  );

  const handleSelectClientForExpressService = (client: Client) => {
    setExpressServiceForm({
      ...expressServiceForm,
      client_search: client.user_name,
      client_id: client.id,
      vehicle_info: client.vehicle_info,
      location: client.address,
      contact_phone: client.user_phone,
    });
  };

  const handleCreateExpressService = async () => {
    try {
      await api.createExpressService({
        client_id: expressServiceForm.client_id,
        vehicle_info: expressServiceForm.vehicle_info,
        emergency_type: expressServiceForm.emergency_type,
        description: expressServiceForm.description,
        priority: expressServiceForm.priority,
        location: expressServiceForm.location,
        contact_phone: expressServiceForm.contact_phone,
      });

      toast({
        description: t('toasts:express_service.create_success') || 'Servicio Express creado exitosamente',
      });

      setExpressServiceDialog(false);
      setExpressServiceForm({
        client_search: '',
        client_id: '',
        vehicle_info: '',
        emergency_type: '',
        description: '',
        priority: 'urgent',
        location: '',
        contact_phone: '',
      });
      loadData();
    } catch (error) {
      console.error('Error creating express service:', error);
      toast({
        title: t('toasts:error_title'),
        description: t('toasts:express_service.create_error') || 'No se pudo crear el servicio express',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateExpressServiceStatus = async (serviceId: string, newStatus: string) => {
    try {
      await api.updateExpressService(serviceId, { status: newStatus });
      
      toast({
        description: t('toasts:express_service.update_success') || 'Estado actualizado exitosamente',
      });

      loadData();
    } catch (error) {
      console.error('Error updating express service status:', error);
      toast({
        title: t('toasts:error_title'),
        description: t('toasts:express_service.update_error') || 'No se pudo actualizar el estado',
        variant: 'destructive',
      });
    }
  };

  // @ts-ignore - Unused but kept for potential future use
  const handleDeleteExpressService = async (serviceId: string) => {
    try {
      await api.deleteExpressService(serviceId);
      
      toast({
        description: t('toasts:express_service.delete_success') || 'Servicio eliminado exitosamente',
      });

      loadData();
    } catch (error) {
      console.error('Error deleting express service:', error);
      toast({
        title: t('toasts:error_title'),
        description: t('toasts:express_service.delete_error') || 'No se pudo eliminar el servicio',
        variant: 'destructive',
      });
    }
  };

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      urgent: 'destructive',
      high: 'default',
      critical: 'destructive',
    };
    const labels: Record<string, string> = {
      urgent: t('express_service:priority.urgent'),
      high: t('express_service:priority.high'),
      critical: t('express_service:priority.critical'),
    };
    return <Badge variant={variants[priority] || 'default'}>{labels[priority] || priority}</Badge>;
  };

  const handleViewRepairRequest = (request: RepairRequest) => {
    setSelectedRepairRequest(request);
    setRepairRequestDialog(true);
  };

  const handleConvertRepairRequest = async (requestId: string, mode: 'repair' | 'express') => {
    try {
      await api.convertRepairRequest(requestId, mode);
      toast({
        title: t('toasts:success_title'),
        description: t('repair_requests:toasts.convert_success'),
      });
      loadData();
      setRepairRequestDialog(false);
    } catch (error) {
      console.error('Error converting repair request:', error);
      toast({
        title: t('toasts:error_title'),
        description: t('repair_requests:toasts.convert_error'),
        variant: 'destructive',
      });
    }
  };

  const handleRejectRepairRequest = async (requestId: string) => {
    try {
      await api.rejectRepairRequest(requestId);
      toast({
        title: t('toasts:success_title'),
        description: t('repair_requests:toasts.reject_success'),
      });
      loadData();
      setRepairRequestDialog(false);
    } catch (error) {
      console.error('Error rejecting repair request:', error);
      toast({
        title: t('toasts:error_title'),
        description: t('repair_requests:toasts.reject_error'),
        variant: 'destructive',
      });
    }
  };

  const handleDeleteRepairRequest = async (requestId: string) => {
    try {
      await api.deleteRepairRequest(requestId);
      toast({
        title: t('toasts:success_title'),
        description: t('repair_requests:toasts.delete_success'),
      });
      loadData();
      setRepairRequestDialog(false);
    } catch (error) {
      console.error('Error deleting repair request:', error);
      toast({
        title: t('toasts:error_title'),
        description: t('repair_requests:toasts.delete_error'),
        variant: 'destructive',
      });
    }
  };

  const getRequestStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      new: 'default',
      converted: 'secondary',
      rejected: 'destructive',
    };
    const labels: Record<string, string> = {
      new: t('repair_requests:status.new'),
      converted: t('repair_requests:status.converted'),
      rejected: t('repair_requests:status.rejected'),
    };
    return <Badge variant={variants[status] || 'default'}>{labels[status] || status}</Badge>;
  };

  const handleShareRepair = async (repairId: string) => {
    try {
      const result = await api.generateShareToken(repairId);
      const shareUrl = `${window.location.origin}/track/${result.share_token}`;
      
      await navigator.clipboard.writeText(shareUrl);
      
      toast({
        title: t('toasts:success_title'),
        description: t('repairs:share_success'),
      });
    } catch (error) {
      console.error('Error sharing repair:', error);
      toast({
        title: t('toasts:error_title'),
        description: t('repairs:share_error'),
        variant: 'destructive',
      });
    }
  };

  const handleOpenEditRepair = (repair: Repair) => {
    setEditRepair(repair);
    setEditRepairDialog(true);
  };

  const handleUpdateRepair = async () => {
    if (!editRepair) return;

    try {
      const updateData: any = {
        mechanic_id: editRepair.mechanic_id || undefined,
        service_type: editRepair.service_type,
        location: editRepair.location,
        issue_description: editRepair.issue_description,
        scheduled_date: editRepair.scheduled_date || undefined,
        cost: editRepair.cost ? Number(editRepair.cost) : undefined,
        amount_charged: editRepair.amount_charged ? Number(editRepair.amount_charged) : undefined,
        balance_pending: editRepair.balance_pending ? Number(editRepair.balance_pending) : undefined,
      };

      await api.updateRepair(editRepair.id, updateData);
      
      setRepairs(prev => prev.map(r => r.id === editRepair.id ? { ...r, ...updateData } : r));
      
      toast({
        title: t('toasts:success_title'),
        description: 'Reparación actualizada exitosamente',
      });
      
      setEditRepairDialog(false);
      setEditRepair(null);
    } catch (error) {
      console.error('Error updating repair:', error);
      toast({
        title: t('toasts:error_title'),
        description: 'Error al actualizar la reparación',
        variant: 'destructive',
      });
    }
  };

  const handleOpenEditExpress = (service: ExpressService) => {
    setEditExpress(service);
    setEditExpressDialog(true);
  };

  const handleUpdateExpress = async () => {
    if (!editExpress) return;

    try {
      const updateData: any = {
        mechanic_id: editExpress.mechanic_id || undefined,
        priority: editExpress.priority,
        location: editExpress.location,
        description: editExpress.description,
      };

      await api.updateExpressService(editExpress.id, updateData);
      
      setExpressServices(prev => prev.map(s => s.id === editExpress.id ? { ...s, ...updateData } : s));
      
      toast({
        title: t('toasts:success_title'),
        description: 'Servicio express actualizado exitosamente',
      });
      
      setEditExpressDialog(false);
      setEditExpress(null);
    } catch (error) {
      console.error('Error updating express service:', error);
      toast({
        title: t('toasts:error_title'),
        description: 'Error al actualizar el servicio express',
        variant: 'destructive',
      });
    }
  };

  const handleConfirmDelete = async () => {
    if (!confirmDelete) return;

    try {
      if (confirmDelete.type === 'repair') {
        await api.deleteRepair(confirmDelete.id);
        setRepairs(prev => prev.filter(r => r.id !== confirmDelete.id));
        toast({
          title: t('toasts:success_title'),
          description: 'Reparación eliminada exitosamente',
        });
      } else if (confirmDelete.type === 'express') {
        await api.deleteExpressService(confirmDelete.id);
        setExpressServices(prev => prev.filter(s => s.id !== confirmDelete.id));
        toast({
          title: t('toasts:success_title'),
          description: 'Servicio express eliminado exitosamente',
        });
      } else if (confirmDelete.type === 'request') {
        await api.deleteRepairRequest(confirmDelete.id);
        setRepairRequests(prev => prev.filter(r => r.id !== confirmDelete.id));
        toast({
          title: t('toasts:success_title'),
          description: 'Solicitud eliminada exitosamente',
        });
      }
      
      setConfirmDelete(null);
    } catch (error) {
      console.error('Error deleting:', error);
      toast({
        title: t('toasts:error_title'),
        description: 'Error al eliminar',
        variant: 'destructive',
      });
    }
  };

  const handleCopyFormLink = async (language: 'es' | 'en') => {
    const baseUrl = window.location.origin;
    const path = language === 'es' ? '/solicitar' : '/request';
    const url = `${baseUrl}${path}`;
    
    try {
      await navigator.clipboard.writeText(url);
      toast({
        title: language === 'es' ? 'Completado ✓' : 'Completed ✓',
        description: language === 'es' 
          ? 'Enlace en español copiado al portapapeles' 
          : 'English link copied to clipboard',
      });
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      toast({
        title: language === 'es' ? 'Error' : 'Error',
        description: 'Error al copiar el enlace',
        variant: 'destructive',
      });
    }
  };

  const handleOpenCostBreakdown = async (repair: Repair) => {
    setSelectedRepairForCost(repair);
    try {
      const partsData = await api.getPartsByRepair(repair.id);
      setParts(partsData);
    } catch (error) {
      console.error('Error fetching parts:', error);
    }
    setCostBreakdownDialog(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-2xl">Cargando datos...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-10 py-4 md:py-6">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
            <div className="flex items-center gap-3 md:gap-4">
              <img 
                src="/logo.png" 
                alt="AYJ Auto-Eléctrico Móvil" 
                className="w-16 h-16 md:w-20 md:h-20 object-contain flex-shrink-0"
              />
              <div className="min-w-0">
                <h1 className="text-xl md:text-3xl font-bold text-gray-900 truncate">{t('dashboard:title')}</h1>
                <p className="text-sm md:text-base text-gray-600 truncate">{t('dashboard:welcome', { name: user.name })}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 md:gap-4 justify-end">
              <LanguageSwitcher />
              <Button onClick={onLogout} variant="outline" size="default" className="md:size-lg">
                <LogOut className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                <span className="hidden sm:inline">{t('dashboard:logout')}</span>
                <span className="sm:hidden">Salir</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-10 py-6 md:py-8 space-y-6 md:space-y-8">
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-7 gap-3 md:gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 md:pb-3">
              <CardTitle className="text-xs md:text-base font-medium">{t('dashboard:stats.clients')}</CardTitle>
              <Users className="h-4 w-4 md:h-6 md:w-6 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-3xl font-bold">{clients.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 md:pb-3">
              <CardTitle className="text-xs md:text-base font-medium">{t('dashboard:stats.mechanics')}</CardTitle>
              <Wrench className="h-4 w-4 md:h-6 md:w-6 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-3xl font-bold">{mechanics.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 md:pb-3">
              <CardTitle className="text-xs md:text-base font-medium">{t('dashboard:stats.workshops')}</CardTitle>
              <Building2 className="h-4 w-4 md:h-6 md:w-6 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-3xl font-bold">{workshops.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 md:pb-3">
              <CardTitle className="text-xs md:text-base font-medium">{t('dashboard:stats.repairs')}</CardTitle>
              <ClipboardList className="h-4 w-4 md:h-6 md:w-6 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-3xl font-bold">{repairs.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 md:pb-3">
              <CardTitle className="text-xs md:text-base font-medium">{t('dashboard:stats.authorized_points')}</CardTitle>
              <MapPin className="h-4 w-4 md:h-6 md:w-6 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-3xl font-bold">{authorizedPoints.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 md:pb-3">
              <CardTitle className="text-xs md:text-base font-medium">{t('dashboard:stats.express_service')}</CardTitle>
              <Zap className="h-4 w-4 md:h-6 md:w-6 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-3xl font-bold">{expressServices.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 md:pb-3">
              <CardTitle className="text-xs md:text-base font-medium">{t('repair_requests:title')}</CardTitle>
              <FileText className="h-4 w-4 md:h-6 md:w-6 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-3xl font-bold">{repairRequests.filter(r => r.status === 'new').length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Desktop: Tabs */}
        <Tabs defaultValue="repairs" className="hidden md:block space-y-6">
          <TabsList className="h-12">
            <TabsTrigger value="repairs" className="text-base px-6">{t('dashboard:tabs.repairs')}</TabsTrigger>
            <TabsTrigger value="clients" className="text-base px-6">{t('dashboard:tabs.clients')}</TabsTrigger>
            <TabsTrigger value="mechanics" className="text-base px-6">{t('dashboard:tabs.mechanics')}</TabsTrigger>
            <TabsTrigger value="workshops" className="text-base px-6">{t('dashboard:tabs.workshops')}</TabsTrigger>
            <TabsTrigger value="points" className="text-base px-6">{t('dashboard:tabs.authorized_points')}</TabsTrigger>
            <TabsTrigger value="express" className="text-base px-6 relative">
              {t('dashboard:tabs.express_service')}
              {expressServices.filter(s => s.status !== 'completed' && s.status !== 'cancelled').length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500">
                  <AlertCircle className="h-3 w-3 text-white" />
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="requests" className="text-base px-6 relative">
              {t('repair_requests:title')}
              {repairRequests.filter(r => r.status === 'new').length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500">
                  <AlertCircle className="h-3 w-3 text-white" />
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="repairs">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-xl">{t('dashboard:sections.repairs.title')}</CardTitle>
                  <CardDescription className="text-base">{t('dashboard:sections.repairs.description')}</CardDescription>
                </div>
                <Button onClick={() => setRepairDialog(true)} size="lg">
                  <Plus className="w-5 h-5 mr-2" />
                  {t('common:buttons.create_repair')}
                </Button>
              </CardHeader>
              <CardContent>
                {repairs.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 text-lg">
                    No hay reparaciones registradas
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-base font-semibold px-6 py-4">Cliente</TableHead>
                        <TableHead className="text-base font-semibold px-6 py-4">Vehículo</TableHead>
                        <TableHead className="text-base font-semibold px-6 py-4">Descripción</TableHead>
                        <TableHead className="text-base font-semibold px-6 py-4">Tipo</TableHead>
                        <TableHead className="text-base font-semibold px-6 py-4">Estado</TableHead>
                        <TableHead className="text-base font-semibold px-6 py-4">Mecánico</TableHead>
                        <TableHead className="text-base font-semibold px-6 py-4">Piezas</TableHead>
                        <TableHead className="text-base font-semibold px-6 py-4">Costo</TableHead>
                        <TableHead className="text-base font-semibold px-6 py-4">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {repairs.map((repair) => (
                        <TableRow key={repair.id}>
                          <TableCell className="font-medium text-base px-6 py-4">{repair.client_name}</TableCell>
                          <TableCell className="text-base px-6 py-4">{repair.vehicle_info}</TableCell>
                          <TableCell className="max-w-xs truncate text-base px-6 py-4">{repair.issue_description}</TableCell>
                          <TableCell className="text-base px-6 py-4">{repair.service_type === 'mobile' ? 'Móvil' : 'Taller'}</TableCell>
                          <TableCell className="px-6 py-4">{getStatusBadge(repair.status)}</TableCell>
                          <TableCell className="text-base px-6 py-4">{repair.mechanic_name || t('common:unassigned')}</TableCell>
                          <TableCell className="px-6 py-4">
                            <Button
                              onClick={() => handleOpenPartsDialog(repair)}
                              variant="outline"
                              size="sm"
                            >
                              <Package className="w-4 h-4 mr-2" />
                              Gestionar
                            </Button>
                          </TableCell>
                          <TableCell className="px-6 py-4">
                            <Button
                              onClick={() => handleOpenCostBreakdown(repair)}
                              variant="outline"
                              size="sm"
                              className="font-semibold"
                            >
                              {repair.cost ? `$${repair.cost.toFixed(2)}` : 'N/A'}
                            </Button>
                          </TableCell>
                          <TableCell className="px-6 py-4">
                            <div className="flex gap-2">
                              <Button
                                onClick={() => handleShareRepair(repair.id)}
                                variant="ghost"
                                size="icon"
                                title="Compartir"
                              >
                                <Share2 className="w-5 h-5 text-gray-600" />
                              </Button>
                              <Button
                                onClick={() => handleOpenEditRepair(repair)}
                                variant="ghost"
                                size="icon"
                              >
                                <Edit className="w-5 h-5 text-blue-500" />
                              </Button>
                              <Button
                                onClick={() => setConfirmDelete({ type: 'repair', id: repair.id })}
                                variant="ghost"
                                size="icon"
                              >
                                <Trash2 className="w-5 h-5 text-red-500" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="clients">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-xl">{t('dashboard:sections.clients.title')}</CardTitle>
                  <CardDescription className="text-base">{t('dashboard:sections.clients.description')}</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => setVisitDialog(true)} size="lg">
                    <Calendar className="w-5 h-5 mr-2" />
                    {t('common:buttons.schedule_visit')}
                  </Button>
                  <Button onClick={() => setClientDialog(true)} size="lg">
                    <Plus className="w-5 h-5 mr-2" />
                    {t('common:buttons.add_client')}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {clients.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 text-lg">
                    No hay clientes registrados
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-base font-semibold px-6 py-4">{t('clients:table.headers.name')}</TableHead>
                        <TableHead className="text-base font-semibold px-6 py-4">{t('clients:table.headers.email')}</TableHead>
                        <TableHead className="text-base font-semibold px-6 py-4">{t('clients:table.headers.phone')}</TableHead>
                        <TableHead className="text-base font-semibold px-6 py-4">{t('clients:table.headers.city')}</TableHead>
                        <TableHead className="text-base font-semibold px-6 py-4">{t('clients:table.headers.address')}</TableHead>
                        <TableHead className="text-base font-semibold px-6 py-4">{t('clients:table.headers.vehicle')}</TableHead>
                        <TableHead className="text-base font-semibold px-6 py-4">{t('clients:table.headers.actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {clients.map((client) => (
                        <TableRow key={client.id}>
                          <TableCell className="font-medium text-base px-6 py-4">{client.user_name}</TableCell>
                          <TableCell className="text-base px-6 py-4">{client.user_email}</TableCell>
                          <TableCell className="text-base px-6 py-4">{client.user_phone}</TableCell>
                          <TableCell className="text-base px-6 py-4">{client.city}</TableCell>
                          <TableCell className="text-base px-6 py-4">{client.address}</TableCell>
                          <TableCell className="text-base px-6 py-4">{client.vehicle_info}</TableCell>
                          <TableCell className="px-6 py-4">
                            <Button
                              variant="ghost"
                              size="default"
                              onClick={() => handleDeleteClient(client.id)}
                            >
                              <Trash2 className="w-5 h-5 text-red-500" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="mechanics">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-xl">{t('dashboard:sections.mechanics.title')}</CardTitle>
                  <CardDescription className="text-base">{t('dashboard:sections.mechanics.description')}</CardDescription>
                </div>
                <Button onClick={() => setMechanicDialog(true)} size="lg">
                  <Plus className="w-5 h-5 mr-2" />
                  {t('common:buttons.add_mechanic')}
                </Button>
              </CardHeader>
              <CardContent>
                {mechanics.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 text-lg">
                    No hay mecánicos registrados
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-base font-semibold px-6 py-4">Nombre</TableHead>
                        <TableHead className="text-base font-semibold px-6 py-4">Email</TableHead>
                        <TableHead className="text-base font-semibold px-6 py-4">Teléfono</TableHead>
                        <TableHead className="text-base font-semibold px-6 py-4">Especialidades</TableHead>
                        <TableHead className="text-base font-semibold px-6 py-4">Tipo</TableHead>
                        <TableHead className="text-base font-semibold px-6 py-4">Calificación</TableHead>
                        <TableHead className="text-base font-semibold px-6 py-4">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mechanics.map((mechanic) => (
                        <TableRow key={mechanic.id}>
                          <TableCell className="font-medium text-base px-6 py-4">{mechanic.user_name}</TableCell>
                          <TableCell className="text-base px-6 py-4">{mechanic.user_email}</TableCell>
                          <TableCell className="text-base px-6 py-4">{mechanic.user_phone}</TableCell>
                          <TableCell className="text-base px-6 py-4">{mechanic.specialties.join(', ')}</TableCell>
                          <TableCell className="text-base px-6 py-4">{mechanic.is_mobile ? 'Móvil' : 'Taller'}</TableCell>
                          <TableCell className="text-base px-6 py-4">{mechanic.rating.toFixed(1)} ⭐</TableCell>
                          <TableCell className="px-6 py-4">
                            <Button
                              variant="ghost"
                              size="default"
                              onClick={() => handleDeleteMechanic(mechanic.id)}
                            >
                              <Trash2 className="w-5 h-5 text-red-500" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="workshops">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-xl">{t('dashboard:sections.workshops.title')}</CardTitle>
                  <CardDescription className="text-base">{t('dashboard:sections.workshops.description')}</CardDescription>
                </div>
                <Button onClick={() => setWorkshopDialog(true)} size="lg">
                  <Plus className="w-5 h-5 mr-2" />
                  {t('common:buttons.add_workshop')}
                </Button>
              </CardHeader>
              <CardContent>
                {workshops.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 text-lg">
                    No hay talleres registrados
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-base font-semibold px-6 py-4">Nombre</TableHead>
                        <TableHead className="text-base font-semibold px-6 py-4">Dirección</TableHead>
                        <TableHead className="text-base font-semibold px-6 py-4">Teléfono</TableHead>
                        <TableHead className="text-base font-semibold px-6 py-4">Servicios</TableHead>
                        <TableHead className="text-base font-semibold px-6 py-4">Calificación</TableHead>
                        <TableHead className="text-base font-semibold px-6 py-4">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {workshops.map((workshop) => (
                        <TableRow key={workshop.id}>
                          <TableCell className="font-medium text-base px-6 py-4">{workshop.name}</TableCell>
                          <TableCell className="text-base px-6 py-4">{workshop.address}</TableCell>
                          <TableCell className="text-base px-6 py-4">{workshop.phone}</TableCell>
                          <TableCell className="text-base px-6 py-4">{workshop.services.join(', ')}</TableCell>
                          <TableCell className="text-base px-6 py-4">{workshop.rating.toFixed(1)} ⭐</TableCell>
                          <TableCell className="px-6 py-4">
                            <Button
                              variant="ghost"
                              size="default"
                              onClick={() => handleDeleteWorkshop(workshop.id)}
                            >
                              <Trash2 className="w-5 h-5 text-red-500" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="points">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-xl">{t('authorized_points:title')}</CardTitle>
                  <CardDescription className="text-base">{t('authorized_points:description')}</CardDescription>
                </div>
                <Button onClick={() => setAuthorizedPointDialog(true)} size="lg">
                  <Plus className="w-5 h-5 mr-2" />
                  {t('common:buttons.register')}
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-base font-semibold px-6 py-4">Nombre</TableHead>
                      <TableHead className="text-base font-semibold px-6 py-4">Dirección</TableHead>
                      <TableHead className="text-base font-semibold px-6 py-4">Teléfono</TableHead>
                      <TableHead className="text-base font-semibold px-6 py-4">Servicios</TableHead>
                      <TableHead className="text-base font-semibold px-6 py-4">Contacto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {authorizedPoints.map((point) => (
                      <TableRow key={point.id}>
                        <TableCell className="font-medium text-base px-6 py-4">{point.name}</TableCell>
                        <TableCell className="text-base px-6 py-4">{point.address}</TableCell>
                        <TableCell className="text-base px-6 py-4">{point.phone}</TableCell>
                        <TableCell className="text-base px-6 py-4">{point.services.join(', ')}</TableCell>
                        <TableCell className="text-base px-6 py-4">{point.contact_person}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="express">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-xl">{t('express_service:title')}</CardTitle>
                  <CardDescription className="text-base">{t('express_service:description')}</CardDescription>
                </div>
                <Button onClick={() => setExpressServiceDialog(true)} size="lg">
                  <Plus className="w-5 h-5 mr-2" />
                  {t('express_service:add_button')}
                </Button>
              </CardHeader>
              <CardContent>
                {expressServices.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No hay servicios express registrados
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-base font-semibold px-6 py-4">{t('express_service:table.headers.client')}</TableHead>
                        <TableHead className="text-base font-semibold px-6 py-4">{t('express_service:table.headers.emergency_type')}</TableHead>
                        <TableHead className="text-base font-semibold px-6 py-4">{t('express_service:table.headers.priority')}</TableHead>
                        <TableHead className="text-base font-semibold px-6 py-4">{t('express_service:table.headers.status')}</TableHead>
                        <TableHead className="text-base font-semibold px-6 py-4">{t('express_service:table.headers.location')}</TableHead>
                        <TableHead className="text-base font-semibold px-6 py-4">{t('express_service:table.headers.mechanic')}</TableHead>
                        <TableHead className="text-base font-semibold px-6 py-4">{t('express_service:table.headers.actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {expressServices.map((service) => (
                        <TableRow key={service.id}>
                          <TableCell className="font-medium text-base px-6 py-4">{service.client_name}</TableCell>
                          <TableCell className="text-base px-6 py-4">{service.emergency_type}</TableCell>
                          <TableCell className="text-base px-6 py-4">{getPriorityBadge(service.priority)}</TableCell>
                          <TableCell className="text-base px-6 py-4">
                            <select
                              value={service.status}
                              onChange={(e) => handleUpdateExpressServiceStatus(service.id, e.target.value)}
                              className="border rounded px-2 py-1"
                            >
                              <option value="pending">{t('express_service:status.pending')}</option>
                              <option value="assigned">{t('express_service:status.assigned')}</option>
                              <option value="en_route">{t('express_service:status.en_route')}</option>
                              <option value="in_progress">{t('express_service:status.in_progress')}</option>
                              <option value="completed">{t('express_service:status.completed')}</option>
                              <option value="cancelled">{t('express_service:status.cancelled')}</option>
                            </select>
                          </TableCell>
                          <TableCell className="text-base px-6 py-4">{service.location}</TableCell>
                          <TableCell className="text-base px-6 py-4">{service.mechanic_name || t('common:unassigned')}</TableCell>
                          <TableCell className="px-6 py-4">
                            <div className="flex gap-2">
                              <Button
                                onClick={() => handleOpenEditExpress(service)}
                                variant="ghost"
                                size="icon"
                              >
                                <Edit className="w-5 h-5 text-blue-500" />
                              </Button>
                              <Button
                                onClick={() => setConfirmDelete({ type: 'express', id: service.id })}
                                variant="ghost"
                                size="icon"
                              >
                                <Trash2 className="w-5 h-5 text-red-500" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="requests">
            <Card>
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div>
                  <CardTitle className="text-xl">{t('repair_requests:title')}</CardTitle>
                  <CardDescription className="text-base">{t('repair_requests:subtitle')}</CardDescription>
                </div>
                <Button
                  onClick={() => setShareFormDialog(true)}
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10"
                >
                  <Share2 className="h-6 w-6" />
                </Button>
              </CardHeader>
              <CardContent>
                {repairRequests.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 text-lg">
                    {t('repair_requests:empty')}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('repair_requests:table.name')}</TableHead>
                        <TableHead>{t('repair_requests:table.email')}</TableHead>
                        <TableHead>{t('repair_requests:table.phone')}</TableHead>
                        <TableHead>{t('repair_requests:table.vehicle')}</TableHead>
                        <TableHead>{t('repair_requests:table.service_type')}</TableHead>
                        <TableHead>{t('repair_requests:table.emergency')}</TableHead>
                        <TableHead>{t('repair_requests:table.status')}</TableHead>
                        <TableHead>{t('repair_requests:table.actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {repairRequests.map((request) => (
                        <TableRow key={request.id}>
                          <TableCell className="font-medium">{request.name}</TableCell>
                          <TableCell>{request.email}</TableCell>
                          <TableCell>{request.phone}</TableCell>
                          <TableCell>{request.vehicle_info}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {request.service_type === 'mobile' 
                                ? t('repair_requests:service_types.mobile') 
                                : t('repair_requests:service_types.workshop')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {request.is_emergency ? (
                              <Badge variant="destructive">Sí</Badge>
                            ) : (
                              <Badge variant="secondary">No</Badge>
                            )}
                          </TableCell>
                          <TableCell>{getRequestStatusBadge(request.status)}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewRepairRequest(request)}
                              >
                                {t('repair_requests:actions.view')}
                              </Button>
                              {request.status === 'new' && (
                                <>
                                  <Button
                                    variant="default"
                                    size="sm"
                                    onClick={() => handleConvertRepairRequest(request.id, 'repair')}
                                  >
                                    <CheckCircle className="w-4 h-4 mr-1" />
                                    {t('repair_requests:actions.convert')}
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => handleRejectRepairRequest(request.id)}
                                  >
                                    <XCircle className="w-4 h-4 mr-1" />
                                    {t('repair_requests:actions.reject')}
                                  </Button>
                                </>
                              )}
                              <Button
                                onClick={() => setConfirmDelete({ type: 'request', id: request.id })}
                                variant="ghost"
                                size="icon"
                              >
                                <Trash2 className="w-5 h-5 text-red-500" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Mobile: Accordion */}
        <div className="md:hidden space-y-4">
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="repairs" className="border rounded-lg px-4 bg-white">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center justify-between w-full pr-4">
                  <div className="flex items-center gap-3">
                    <ClipboardList className="h-5 w-5 text-muted-foreground" />
                    <span className="font-semibold">{t('dashboard:tabs.repairs')}</span>
                  </div>
                  <Badge variant="secondary">{repairs.length}</Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 pt-2">
                  <Button onClick={() => setRepairDialog(true)} className="w-full" size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    {t('common:buttons.create_repair')}
                  </Button>
                  {repairs.length === 0 ? (
                    <p className="text-center py-8 text-gray-500 text-sm">No hay reparaciones registradas</p>
                  ) : (
                    <div className="space-y-3">
                      {repairs.map((repair) => (
                        <Card key={repair.id} className="p-3">
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between items-start">
                              <div className="font-semibold">{repair.client_name}</div>
                              {getStatusBadge(repair.status)}
                            </div>
                            <div className="text-gray-600">{repair.vehicle_info}</div>
                            <div className="text-gray-500 text-xs line-clamp-2">{repair.issue_description}</div>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <span>{repair.service_type === 'mobile' ? 'Móvil' : 'Taller'}</span>
                              <span>•</span>
                              <span>{repair.mechanic_name || t('common:unassigned')}</span>
                            </div>
                            <div className="flex gap-2 pt-2">
                              <Button onClick={() => handleOpenPartsDialog(repair)} variant="outline" size="sm" className="flex-1">
                                <Package className="w-3 h-3 mr-1" />
                                Piezas
                              </Button>
                              <Button onClick={() => handleShareRepair(repair.id)} variant="outline" size="sm" className="flex-1">
                                <Share2 className="w-3 h-3 mr-1" />
                                Compartir
                              </Button>
                              <Button onClick={() => handleOpenEditRepair(repair)} variant="ghost" size="sm">
                                <Edit className="w-4 h-4 text-blue-500" />
                              </Button>
                              <Button onClick={() => setConfirmDelete({ type: 'repair', id: repair.id })} variant="ghost" size="sm">
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="clients" className="border rounded-lg px-4 bg-white">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center justify-between w-full pr-4">
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <span className="font-semibold">{t('dashboard:tabs.clients')}</span>
                  </div>
                  <Badge variant="secondary">{clients.length}</Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 pt-2">
                  <div className="flex gap-2">
                    <Button onClick={() => setVisitDialog(true)} className="flex-1" size="sm">
                      <Calendar className="w-4 h-4 mr-2" />
                      {t('common:buttons.schedule_visit')}
                    </Button>
                    <Button onClick={() => setClientDialog(true)} className="flex-1" size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      {t('common:buttons.add_client')}
                    </Button>
                  </div>
                  {clients.length === 0 ? (
                    <p className="text-center py-8 text-gray-500 text-sm">No hay clientes registrados</p>
                  ) : (
                    <div className="space-y-3">
                      {clients.map((client) => (
                        <Card key={client.id} className="p-3">
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between items-start">
                              <div className="font-semibold">{client.user_name}</div>
                              <Button onClick={() => handleDeleteClient(client.id)} variant="ghost" size="sm">
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </div>
                            <div className="text-gray-600">{client.user_email}</div>
                            <div className="text-gray-500 text-xs">{client.user_phone}</div>
                            <div className="text-gray-500 text-xs">{client.city} • {client.address}</div>
                            {client.vehicle_info && (
                              <div className="text-gray-600 text-xs bg-gray-50 p-2 rounded">{client.vehicle_info}</div>
                            )}
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="mechanics" className="border rounded-lg px-4 bg-white">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center justify-between w-full pr-4">
                  <div className="flex items-center gap-3">
                    <Wrench className="h-5 w-5 text-muted-foreground" />
                    <span className="font-semibold">{t('dashboard:tabs.mechanics')}</span>
                  </div>
                  <Badge variant="secondary">{mechanics.length}</Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 pt-2">
                  <Button onClick={() => setMechanicDialog(true)} className="w-full" size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    {t('common:buttons.add_mechanic')}
                  </Button>
                  {mechanics.length === 0 ? (
                    <p className="text-center py-8 text-gray-500 text-sm">No hay mecánicos registrados</p>
                  ) : (
                    <div className="space-y-3">
                      {mechanics.map((mechanic) => (
                        <Card key={mechanic.id} className="p-3">
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between items-start">
                              <div className="font-semibold">{mechanic.user_name}</div>
                              <Button onClick={() => handleDeleteMechanic(mechanic.id)} variant="ghost" size="sm">
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </div>
                            <div className="text-gray-600">{mechanic.user_email}</div>
                            <div className="text-gray-500 text-xs">{mechanic.user_phone}</div>
                            <div className="text-gray-500 text-xs">{mechanic.address}</div>
                            <div className="flex flex-wrap gap-1 pt-1">
                              {mechanic.specialties.map((specialty, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">{specialty}</Badge>
                              ))}
                            </div>
                            <div className="flex gap-2 text-xs">
                              {mechanic.is_mobile && <Badge variant="secondary">Móvil</Badge>}
                              {mechanic.speaks_english && <Badge variant="secondary">English</Badge>}
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="workshops" className="border rounded-lg px-4 bg-white">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center justify-between w-full pr-4">
                  <div className="flex items-center gap-3">
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                    <span className="font-semibold">{t('dashboard:tabs.workshops')}</span>
                  </div>
                  <Badge variant="secondary">{workshops.length}</Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 pt-2">
                  <Button onClick={() => setWorkshopDialog(true)} className="w-full" size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    {t('common:buttons.add_workshop')}
                  </Button>
                  {workshops.length === 0 ? (
                    <p className="text-center py-8 text-gray-500 text-sm">No hay talleres registrados</p>
                  ) : (
                    <div className="space-y-3">
                      {workshops.map((workshop) => (
                        <Card key={workshop.id} className="p-3">
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between items-start">
                              <div className="font-semibold">{workshop.name}</div>
                              <Button onClick={() => handleDeleteWorkshop(workshop.id)} variant="ghost" size="sm">
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </div>
                            <div className="text-gray-600">{workshop.address}</div>
                            <div className="text-gray-500 text-xs">{workshop.phone}</div>
                            <div className="flex flex-wrap gap-1 pt-1">
                              {workshop.services.map((service, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">{service}</Badge>
                              ))}
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="points" className="border rounded-lg px-4 bg-white">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center justify-between w-full pr-4">
                  <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                    <span className="font-semibold">{t('dashboard:tabs.authorized_points')}</span>
                  </div>
                  <Badge variant="secondary">{authorizedPoints.length}</Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 pt-2">
                  <Button onClick={() => setAuthorizedPointDialog(true)} className="w-full" size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    {t('common:buttons.add_authorized_point')}
                  </Button>
                  {authorizedPoints.length === 0 ? (
                    <p className="text-center py-8 text-gray-500 text-sm">No hay tiendas registradas</p>
                  ) : (
                    <div className="space-y-3">
                      {authorizedPoints.map((point) => (
                        <Card key={point.id} className="p-3">
                          <div className="space-y-2 text-sm">
                            <div className="font-semibold">{point.name}</div>
                            <div className="text-gray-600">{point.address}</div>
                            <div className="text-gray-500 text-xs">{point.phone}</div>
                            <div className="flex flex-wrap gap-1 pt-1">
                              {point.services.map((service, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">{service}</Badge>
                              ))}
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="express" className="border rounded-lg px-4 bg-white">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center justify-between w-full pr-4">
                  <div className="flex items-center gap-3">
                    <Zap className="h-5 w-5 text-muted-foreground" />
                    <span className="font-semibold">{t('dashboard:tabs.express_service')}</span>
                    {expressServices.filter(s => s.status !== 'completed' && s.status !== 'cancelled').length > 0 && (
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                  <Badge variant="secondary">{expressServices.length}</Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 pt-2">
                  <Button onClick={() => setExpressServiceDialog(true)} className="w-full" size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    {t('common:buttons.create_express_service')}
                  </Button>
                  {expressServices.length === 0 ? (
                    <p className="text-center py-8 text-gray-500 text-sm">No hay servicios express registrados</p>
                  ) : (
                    <div className="space-y-3">
                      {expressServices.map((service) => (
                        <Card key={service.id} className="p-3">
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between items-start">
                              <div className="font-semibold">{service.client_name}</div>
                              {getPriorityBadge(service.priority)}
                            </div>
                            <div className="text-gray-600">{service.vehicle_info}</div>
                            <div className="text-gray-500 text-xs line-clamp-2">{service.description}</div>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <span>{service.location}</span>
                              <span>•</span>
                              <span>{service.mechanic_name || t('common:unassigned')}</span>
                            </div>
                            <div className="flex gap-2 pt-2">
                              <Button onClick={() => handleOpenEditExpress(service)} variant="outline" size="sm" className="flex-1">
                                <Edit className="w-3 h-3 mr-1" />
                                Editar
                              </Button>
                              <Button onClick={() => setConfirmDelete({ type: 'express', id: service.id })} variant="ghost" size="sm">
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="requests" className="border rounded-lg px-4 bg-white">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center justify-between w-full pr-4">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <span className="font-semibold">{t('repair_requests:title')}</span>
                    {repairRequests.filter(r => r.status === 'new').length > 0 && (
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                  <Badge variant="secondary">{repairRequests.filter(r => r.status === 'new').length}</Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 pt-2">
                  <Button onClick={() => setShareFormDialog(true)} className="w-full" size="sm" variant="outline">
                    <Share2 className="w-4 h-4 mr-2" />
                    {t('common:buttons.share_form')}
                  </Button>
                  {repairRequests.length === 0 ? (
                    <p className="text-center py-8 text-gray-500 text-sm">No hay solicitudes</p>
                  ) : (
                    <div className="space-y-3">
                      {repairRequests.map((request) => (
                        <Card key={request.id} className="p-3">
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between items-start">
                              <div className="font-semibold">{request.name}</div>
                              {getRequestStatusBadge(request.status)}
                            </div>
                            <div className="text-gray-600">{request.vehicle_info}</div>
                            <div className="text-gray-500 text-xs">{request.email} • {request.phone}</div>
                            <div className="text-gray-500 text-xs line-clamp-2">{request.description}</div>
                            {request.status === 'new' && (
                              <div className="flex gap-2 pt-2">
                                <Button onClick={() => handleViewRepairRequest(request)} variant="outline" size="sm" className="flex-1">
                                  Ver
                                </Button>
                                <Button onClick={() => handleConvertRepairRequest(request.id, 'repair')} variant="default" size="sm" className="flex-1">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Convertir
                                </Button>
                                <Button onClick={() => handleRejectRepairRequest(request.id)} variant="ghost" size="sm">
                                  <XCircle className="w-4 h-4 text-red-500" />
                                </Button>
                              </div>
                            )}
                            {request.status !== 'new' && (
                              <Button onClick={() => setConfirmDelete({ type: 'request', id: request.id })} variant="ghost" size="sm" className="w-full">
                                <Trash2 className="w-4 h-4 text-red-500 mr-2" />
                                Eliminar
                              </Button>
                            )}
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </main>

      {/* Client Dialog */}
      <Dialog open={clientDialog} onOpenChange={setClientDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('clients:dialog.title')}</DialogTitle>
            <DialogDescription>
              {t('clients:dialog.description')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="client-name">{t('clients:dialog.name_label')}</Label>
              <Input
                id="client-name"
                value={clientForm.name}
                onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })}
                placeholder={t('clients:dialog.name_placeholder')}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="client-email">{t('clients:dialog.email_label')}</Label>
              <Input
                id="client-email"
                type="email"
                value={clientForm.email}
                onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })}
                placeholder={t('clients:dialog.email_placeholder')}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="client-phone">{t('clients:dialog.phone_label')}</Label>
              <Input
                id="client-phone"
                value={clientForm.phone}
                onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })}
                placeholder={t('clients:dialog.phone_placeholder')}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="client-city">{t('clients:dialog.city_label')}</Label>
              <Input
                id="client-city"
                value={clientForm.city}
                onChange={(e) => setClientForm({ ...clientForm, city: e.target.value })}
                placeholder={t('clients:dialog.city_placeholder')}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="client-address">{t('clients:dialog.address_label')}</Label>
              <Input
                id="client-address"
                value={clientForm.address}
                onChange={(e) => setClientForm({ ...clientForm, address: e.target.value })}
                placeholder={t('clients:dialog.address_placeholder')}
              />
            </div>
            <VinDecoderInput
              onDecoded={(decoded: VinDecoded) => {
                setClientForm({ ...clientForm, vehicle_info: decoded.summary });
              }}
              className="grid gap-2"
            />
            <div className="grid gap-2">
              <Label htmlFor="client-vehicle">{t('clients:dialog.vehicle_label')}</Label>
              <Textarea
                id="client-vehicle"
                value={clientForm.vehicle_info}
                onChange={(e) => setClientForm({ ...clientForm, vehicle_info: e.target.value })}
                placeholder={t('clients:dialog.vehicle_placeholder')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClientDialog(false)}>
              {t('common:actions.cancel')}
            </Button>
            <Button onClick={handleCreateClient}>
              {t('clients:dialog.create_button')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mechanic Dialog */}
      <Dialog open={mechanicDialog} onOpenChange={setMechanicDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('mechanics:dialog.title')}</DialogTitle>
            <DialogDescription>
              {t('mechanics:dialog.description')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="mechanic-name">{t('mechanics:dialog.name_label')}</Label>
              <Input
                id="mechanic-name"
                value={mechanicForm.name}
                onChange={(e) => setMechanicForm({ ...mechanicForm, name: e.target.value })}
                placeholder={t('mechanics:dialog.name_placeholder')}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="mechanic-email">{t('mechanics:dialog.email_label')}</Label>
              <Input
                id="mechanic-email"
                type="email"
                value={mechanicForm.email}
                onChange={(e) => setMechanicForm({ ...mechanicForm, email: e.target.value })}
                placeholder={t('mechanics:dialog.email_placeholder')}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="mechanic-phone">{t('mechanics:dialog.phone_label')}</Label>
              <Input
                id="mechanic-phone"
                value={mechanicForm.phone}
                onChange={(e) => setMechanicForm({ ...mechanicForm, phone: e.target.value })}
                placeholder={t('mechanics:dialog.phone_placeholder')}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="mechanic-address">{t('mechanics:dialog.address_label')}</Label>
              <Input
                id="mechanic-address"
                value={mechanicForm.address}
                onChange={(e) => setMechanicForm({ ...mechanicForm, address: e.target.value })}
                placeholder={t('mechanics:dialog.address_placeholder')}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="mechanic-specialties">{t('mechanics:dialog.specialization_label')}</Label>
              <Input
                id="mechanic-specialties"
                value={mechanicForm.specialties}
                onChange={(e) => setMechanicForm({ ...mechanicForm, specialties: e.target.value })}
                placeholder={t('mechanics:dialog.specialization_placeholder')}
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="mechanic-mobile"
                checked={mechanicForm.is_mobile}
                onChange={(e) => setMechanicForm({ ...mechanicForm, is_mobile: e.target.checked })}
                className="w-4 h-4"
              />
              <Label htmlFor="mechanic-mobile">{t('mechanics:dialog.mobile_label')}</Label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="mechanic-speaks-english"
                checked={mechanicForm.speaks_english}
                onChange={(e) => setMechanicForm({ ...mechanicForm, speaks_english: e.target.checked })}
                className="w-4 h-4"
              />
              <Label htmlFor="mechanic-speaks-english">{t('mechanics:dialog.speaks_english_label')}</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMechanicDialog(false)}>
              {t('common:actions.cancel')}
            </Button>
            <Button onClick={handleCreateMechanic}>
              {t('mechanics:dialog.create_button')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Workshop Dialog */}
      <Dialog open={workshopDialog} onOpenChange={setWorkshopDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('workshops:dialog.title')}</DialogTitle>
            <DialogDescription>
              {t('workshops:dialog.description')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="workshop-name">{t('workshops:dialog.name_label')}</Label>
              <Input
                id="workshop-name"
                value={workshopForm.name}
                onChange={(e) => setWorkshopForm({ ...workshopForm, name: e.target.value })}
                placeholder={t('workshops:dialog.name_placeholder')}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="workshop-address">{t('workshops:dialog.address_label')}</Label>
              <Input
                id="workshop-address"
                value={workshopForm.address}
                onChange={(e) => setWorkshopForm({ ...workshopForm, address: e.target.value })}
                placeholder={t('workshops:dialog.address_placeholder')}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="workshop-phone">{t('workshops:dialog.phone_label')}</Label>
              <Input
                id="workshop-phone"
                value={workshopForm.phone}
                onChange={(e) => setWorkshopForm({ ...workshopForm, phone: e.target.value })}
                placeholder={t('workshops:dialog.phone_placeholder')}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="workshop-services">{t('workshops:dialog.services_label')}</Label>
              <Textarea
                id="workshop-services"
                value={workshopForm.services}
                onChange={(e) => setWorkshopForm({ ...workshopForm, services: e.target.value })}
                placeholder={t('workshops:dialog.services_placeholder')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWorkshopDialog(false)}>
              {t('common:actions.cancel')}
            </Button>
            <Button onClick={handleCreateWorkshop}>
              {t('workshops:dialog.create_button')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Authorized Point Dialog */}
      <Dialog open={authorizedPointDialog} onOpenChange={setAuthorizedPointDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('authorized_points:dialog.title')}</DialogTitle>
            <DialogDescription>
              {t('authorized_points:dialog.description')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="point-name">{t('authorized_points:dialog.name_label')}</Label>
              <Input
                id="point-name"
                value={authorizedPointForm.name}
                onChange={(e) => setAuthorizedPointForm({ ...authorizedPointForm, name: e.target.value })}
                placeholder={t('authorized_points:dialog.name_placeholder')}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="point-address">{t('authorized_points:dialog.address_label')}</Label>
              <Input
                id="point-address"
                value={authorizedPointForm.address}
                onChange={(e) => setAuthorizedPointForm({ ...authorizedPointForm, address: e.target.value })}
                placeholder={t('authorized_points:dialog.address_placeholder')}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="point-phone">{t('authorized_points:dialog.phone_label')}</Label>
              <Input
                id="point-phone"
                value={authorizedPointForm.phone}
                onChange={(e) => setAuthorizedPointForm({ ...authorizedPointForm, phone: e.target.value })}
                placeholder={t('authorized_points:dialog.phone_placeholder')}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="point-services">{t('authorized_points:dialog.services_label')}</Label>
              <Textarea
                id="point-services"
                value={authorizedPointForm.services}
                onChange={(e) => setAuthorizedPointForm({ ...authorizedPointForm, services: e.target.value })}
                placeholder={t('authorized_points:dialog.services_placeholder')}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="point-contact">{t('authorized_points:dialog.contact_label')}</Label>
              <Input
                id="point-contact"
                value={authorizedPointForm.contact_person}
                onChange={(e) => setAuthorizedPointForm({ ...authorizedPointForm, contact_person: e.target.value })}
                placeholder={t('authorized_points:dialog.contact_placeholder')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAuthorizedPointDialog(false)}>
              {t('common:actions.cancel')}
            </Button>
            <Button onClick={handleCreateAuthorizedPoint}>
              {t('authorized_points:dialog.register_button')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Visit Scheduling Dialog */}
      <Dialog open={visitDialog} onOpenChange={setVisitDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('clients:visit_dialog.title')}</DialogTitle>
            <DialogDescription>
              {t('clients:visit_dialog.description')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="client-search">{t('clients:visit_dialog.search_label')}</Label>
              <Input
                id="client-search"
                value={visitForm.client_search}
                onChange={(e) => setVisitForm({ ...visitForm, client_search: e.target.value })}
                placeholder={t('clients:visit_dialog.search_placeholder')}
              />
              {visitForm.client_search && filteredClients.length > 0 && !selectedClient && (
                <div className="border rounded-md max-h-40 overflow-y-auto">
                  {filteredClients.slice(0, 5).map((client) => (
                    <div
                      key={client.id}
                      onClick={() => handleSelectClient(client)}
                      className="p-2 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
                    >
                      <div className="font-medium">{client.user_name}</div>
                      <div className="text-sm text-gray-500">{client.user_email}</div>
                    </div>
                  ))}
                </div>
              )}
              {selectedClient && (
                <div className="p-2 bg-blue-50 rounded-md border border-blue-200">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium">{selectedClient.user_name}</div>
                      <div className="text-sm text-gray-500">{selectedClient.user_email}</div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedClient(null);
                        setVisitForm({ ...visitForm, client_search: '', client_id: '', location: '' });
                      }}
                    >
                      {t('common:actions.change')}
                    </Button>
                  </div>
                </div>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="visit-date">{t('clients:visit_dialog.date_label')}</Label>
              <Input
                id="visit-date"
                type="date"
                value={visitForm.scheduled_date}
                onChange={(e) => setVisitForm({ ...visitForm, scheduled_date: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="visit-time">{t('clients:visit_dialog.time_label')}</Label>
              <Input
                id="visit-time"
                type="time"
                value={visitForm.scheduled_time}
                onChange={(e) => setVisitForm({ ...visitForm, scheduled_time: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="visit-type">{t('repairs:dialog.service_type_label')}</Label>
              <select
                id="visit-type"
                value={visitForm.service_type}
                onChange={(e) => setVisitForm({ ...visitForm, service_type: e.target.value as 'mobile' | 'workshop' })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="mobile">{t('repairs:dialog.service_mobile')}</option>
                <option value="workshop">{t('repairs:dialog.service_workshop')}</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="visit-location">{t('clients:visit_dialog.location_label')}</Label>
              <Input
                id="visit-location"
                value={visitForm.location}
                onChange={(e) => setVisitForm({ ...visitForm, location: e.target.value })}
                placeholder={t('clients:visit_dialog.location_placeholder')}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="visit-mechanic">{t('clients:visit_dialog.mechanic_label')}</Label>
              <select
                id="visit-mechanic"
                value={visitForm.mechanic_id}
                onChange={(e) => setVisitForm({ ...visitForm, mechanic_id: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">{t('common:none')}</option>
                {mechanics.map((mechanic) => (
                  <option key={mechanic.id} value={mechanic.id}>
                    {mechanic.user_name} - {mechanic.is_mobile ? t('repairs:service_type.mobile') : t('repairs:service_type.workshop')}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="visit-issue">{t('clients:visit_dialog.description_label')}</Label>
              <Textarea
                id="visit-issue"
                value={visitForm.issue_description}
                onChange={(e) => setVisitForm({ ...visitForm, issue_description: e.target.value })}
                placeholder={t('clients:visit_dialog.description_placeholder')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVisitDialog(false)}>
              {t('common:actions.cancel')}
            </Button>
            <Button onClick={handleCreateVisit}>
              {t('clients:visit_dialog.schedule_button')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Repair Creation Dialog */}
      <Dialog open={repairDialog} onOpenChange={setRepairDialog}>
        <DialogContent className="sm:max-w-lg max-h-screen overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('repairs:dialog.title')}</DialogTitle>
            <DialogDescription>
              {t('repairs:dialog.description')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="repair-client-search">{t('repairs:dialog.search_client')}</Label>
              <Input
                id="repair-client-search"
                value={repairForm.client_search}
                onChange={(e) => setRepairForm({ ...repairForm, client_search: e.target.value })}
                placeholder={t('repairs:dialog.search_placeholder')}
              />
              {repairForm.client_search && filteredClients.length > 0 && !selectedClient && (
                <div className="border rounded-md max-h-40 overflow-y-auto">
                  {filteredClients.slice(0, 5).map((client) => (
                    <div
                      key={client.id}
                      onClick={() => handleSelectClientForRepair(client)}
                      className="p-2 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
                    >
                      <div className="font-medium">{client.user_name}</div>
                      <div className="text-sm text-gray-500">{client.user_email}</div>
                    </div>
                  ))}
                </div>
              )}
              {selectedClient && (
                <div className="p-2 bg-blue-50 rounded-md border border-blue-200">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium">{selectedClient.user_name}</div>
                      <div className="text-sm text-gray-500">{selectedClient.user_email}</div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedClient(null);
                        setRepairForm({ ...repairForm, client_search: '', client_id: '', vehicle_info: '', location: '' });
                      }}
                    >
                      {t('common:actions.change')}
                    </Button>
                  </div>
                </div>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="repair-vehicle">{t('repairs:dialog.vehicle_label')}</Label>
              <Input
                id="repair-vehicle"
                value={repairForm.vehicle_info}
                onChange={(e) => setRepairForm({ ...repairForm, vehicle_info: e.target.value })}
                placeholder={t('repairs:dialog.vehicle_placeholder')}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="repair-issue">{t('repairs:dialog.issue_label')}</Label>
              <Textarea
                id="repair-issue"
                value={repairForm.issue_description}
                onChange={(e) => setRepairForm({ ...repairForm, issue_description: e.target.value })}
                placeholder={t('repairs:dialog.issue_placeholder')}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="repair-type">{t('repairs:dialog.service_type_label')}</Label>
              <select
                id="repair-type"
                value={repairForm.service_type}
                onChange={(e) => setRepairForm({ ...repairForm, service_type: e.target.value as 'mobile' | 'workshop' })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="mobile">{t('repairs:dialog.service_mobile')}</option>
                <option value="workshop">{t('repairs:dialog.service_workshop')}</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="repair-location">{t('repairs:dialog.location_label')}</Label>
              <Input
                id="repair-location"
                value={repairForm.location}
                onChange={(e) => setRepairForm({ ...repairForm, location: e.target.value })}
                placeholder={t('repairs:dialog.location_placeholder')}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="repair-date">{t('repairs:dialog.date_label')}</Label>
              <Input
                id="repair-date"
                type="date"
                value={repairForm.scheduled_date}
                onChange={(e) => setRepairForm({ ...repairForm, scheduled_date: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="repair-time">{t('repairs:dialog.time_label')}</Label>
              <Input
                id="repair-time"
                type="time"
                value={repairForm.scheduled_time}
                onChange={(e) => setRepairForm({ ...repairForm, scheduled_time: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="repair-mechanic">{t('repairs:dialog.mechanic_label')}</Label>
              <select
                id="repair-mechanic"
                value={repairForm.mechanic_id}
                onChange={(e) => setRepairForm({ ...repairForm, mechanic_id: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">{t('common:none')}</option>
                {mechanics.map((mechanic) => (
                  <option key={mechanic.id} value={mechanic.id}>
                    {mechanic.user_name} - {mechanic.is_mobile ? t('repairs:service_type.mobile') : t('repairs:service_type.workshop')}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="repair-cost">{t('repairs:dialog.cost_label')}</Label>
              <Input
                id="repair-cost"
                type="number"
                step="0.01"
                value={repairForm.cost}
                onChange={(e) => setRepairForm({ ...repairForm, cost: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="repair-amount-charged">{t('repairs:dialog.amount_charged_label')}</Label>
              <Input
                id="repair-amount-charged"
                type="number"
                step="0.01"
                value={repairForm.amount_charged}
                onChange={(e) => setRepairForm({ ...repairForm, amount_charged: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="repair-balance-pending">{t('repairs:dialog.balance_pending_label')}</Label>
              <Input
                id="repair-balance-pending"
                type="number"
                step="0.01"
                value={repairForm.balance_pending}
                onChange={(e) => setRepairForm({ ...repairForm, balance_pending: e.target.value })}
                placeholder="0.00"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRepairDialog(false)}>
              {t('common:actions.cancel')}
            </Button>
            <Button onClick={handleCreateRepair}>
              {t('repairs:dialog.create_button')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={expressServiceDialog} onOpenChange={setExpressServiceDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('express_service:dialog.title')}</DialogTitle>
            <DialogDescription>
              {t('express_service:dialog.description')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="express-client-search">{t('express_service:dialog.search_client')}</Label>
              <Input
                id="express-client-search"
                value={expressServiceForm.client_search}
                onChange={(e) => setExpressServiceForm({ ...expressServiceForm, client_search: e.target.value })}
                placeholder={t('express_service:dialog.search_placeholder')}
              />
              {expressServiceForm.client_search && filteredClientsForExpressService.length > 0 && (
                <div className="border rounded-md max-h-40 overflow-y-auto">
                  {filteredClientsForExpressService.map((client) => (
                    <div
                      key={client.id}
                      className="p-2 hover:bg-gray-100 cursor-pointer"
                      onClick={() => handleSelectClientForExpressService(client)}
                    >
                      <div className="font-medium">{client.user_name}</div>
                      <div className="text-sm text-gray-500">{client.user_email}</div>
                    </div>
                  ))}
                </div>
              )}
              {expressServiceForm.client_search && filteredClientsForExpressService.length === 0 && (
                <div className="text-sm text-gray-500 p-2">
                  {t('express_service:dialog.no_results')}
                </div>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="express-vehicle">{t('express_service:dialog.vehicle_label')}</Label>
              <Input
                id="express-vehicle"
                value={expressServiceForm.vehicle_info}
                onChange={(e) => setExpressServiceForm({ ...expressServiceForm, vehicle_info: e.target.value })}
                placeholder={t('express_service:dialog.vehicle_placeholder')}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="express-emergency-type">{t('express_service:dialog.emergency_type_label')}</Label>
              <Input
                id="express-emergency-type"
                value={expressServiceForm.emergency_type}
                onChange={(e) => setExpressServiceForm({ ...expressServiceForm, emergency_type: e.target.value })}
                placeholder={t('express_service:dialog.emergency_type_placeholder')}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="express-description">{t('express_service:dialog.description_label')}</Label>
              <Textarea
                id="express-description"
                value={expressServiceForm.description}
                onChange={(e) => setExpressServiceForm({ ...expressServiceForm, description: e.target.value })}
                placeholder={t('express_service:dialog.description_placeholder')}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="express-priority">{t('express_service:dialog.priority_label')}</Label>
              <select
                id="express-priority"
                value={expressServiceForm.priority}
                onChange={(e) => setExpressServiceForm({ ...expressServiceForm, priority: e.target.value as 'urgent' | 'high' | 'critical' })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="urgent">{t('express_service:priority.urgent')}</option>
                <option value="high">{t('express_service:priority.high')}</option>
                <option value="critical">{t('express_service:priority.critical')}</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="express-location">{t('express_service:dialog.location_label')}</Label>
              <Input
                id="express-location"
                value={expressServiceForm.location}
                onChange={(e) => setExpressServiceForm({ ...expressServiceForm, location: e.target.value })}
                placeholder={t('express_service:dialog.location_placeholder')}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="express-phone">{t('express_service:dialog.contact_phone_label')}</Label>
              <Input
                id="express-phone"
                value={expressServiceForm.contact_phone}
                onChange={(e) => setExpressServiceForm({ ...expressServiceForm, contact_phone: e.target.value })}
                placeholder={t('express_service:dialog.contact_phone_placeholder')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExpressServiceDialog(false)}>
              {t('common:actions.cancel')}
            </Button>
            <Button onClick={handleCreateExpressService}>
              {t('express_service:dialog.create_button')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={partsDialog} onOpenChange={setPartsDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('parts:dialog.title')}</DialogTitle>
            <DialogDescription>
              {selectedRepairForParts && `${t('parts:dialog.repair_label')}: ${selectedRepairForParts.client_name} - ${selectedRepairForParts.vehicle_info}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div className="border rounded-lg p-4 bg-gray-50">
              <h3 className="font-semibold mb-4">{t('parts:dialog.add_new_part')}</h3>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="part-name">{t('parts:dialog.name_label')}</Label>
                  <Input
                    id="part-name"
                    value={partForm.name}
                    onChange={(e) => setPartForm({ ...partForm, name: e.target.value })}
                    placeholder={t('parts:dialog.name_placeholder')}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="part-supplier">{t('parts:dialog.supplier_label')}</Label>
                  <Popover open={supplierComboboxOpen} onOpenChange={setSupplierComboboxOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={supplierComboboxOpen}
                        className="w-full justify-between"
                      >
                        {supplierMode === 'custom' && partForm.supplier_name
                          ? partForm.supplier_name
                          : supplierMode === 'registered' && partForm.supplier_id
                          ? authorizedPoints.find((p) => p.id === partForm.supplier_id)?.name
                          : t('parts:dialog.supplier_placeholder')}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                      <Command>
                        <CommandInput 
                          placeholder={t('parts:dialog.supplier_search')} 
                          value={supplierSearchQuery}
                          onValueChange={setSupplierSearchQuery}
                        />
                        <CommandList>
                          <CommandEmpty>
                            <div className="p-2 text-sm text-muted-foreground">
                              {t('parts:dialog.supplier_no_results')}
                            </div>
                          </CommandEmpty>
                          <CommandGroup>
                            <CommandItem
                              onSelect={() => {
                                setSupplierMode('registered');
                                setPartForm({ ...partForm, supplier_id: '', supplier_name: '' });
                                setSupplierComboboxOpen(false);
                                setSupplierSearchQuery('');
                              }}
                            >
                              <Check
                                className={`mr-2 h-4 w-4 ${
                                  !partForm.supplier_id && !partForm.supplier_name ? 'opacity-100' : 'opacity-0'
                                }`}
                              />
                              {t('parts:dialog.no_supplier')}
                            </CommandItem>
                            {authorizedPoints.map((point) => (
                              <CommandItem
                                key={point.id}
                                value={point.name}
                                onSelect={() => {
                                  setSupplierMode('registered');
                                  setPartForm({ ...partForm, supplier_id: point.id, supplier_name: '' });
                                  setSupplierComboboxOpen(false);
                                  setSupplierSearchQuery('');
                                }}
                              >
                                <Check
                                  className={`mr-2 h-4 w-4 ${
                                    partForm.supplier_id === point.id ? 'opacity-100' : 'opacity-0'
                                  }`}
                                />
                                {point.name}
                              </CommandItem>
                            ))}
                            {supplierSearchQuery.trim() && (
                              <CommandItem
                                onSelect={() => {
                                  setSupplierMode('custom');
                                  setPartForm({ ...partForm, supplier_id: '', supplier_name: supplierSearchQuery.trim() });
                                  setSupplierComboboxOpen(false);
                                  setSupplierSearchQuery('');
                                }}
                              >
                                <Plus className="mr-2 h-4 w-4" />
                                {t('parts:dialog.supplier_use_custom', { query: supplierSearchQuery.trim() })}
                              </CommandItem>
                            )}
                            <CommandItem
                              onSelect={() => {
                                setSupplierMode('custom');
                                setPartForm({ ...partForm, supplier_id: '', supplier_name: '' });
                                setSupplierComboboxOpen(false);
                                setSupplierSearchQuery('');
                              }}
                            >
                              <Plus className="mr-2 h-4 w-4" />
                              {t('parts:dialog.supplier_custom')}
                            </CommandItem>
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {supplierMode === 'custom' && (
                    <Input
                      value={partForm.supplier_name}
                      onChange={(e) => setPartForm({ ...partForm, supplier_name: e.target.value })}
                      placeholder={t('parts:dialog.supplier_custom_placeholder')}
                      className="mt-2"
                    />
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="part-ordered-online"
                    checked={partForm.ordered_online}
                    onChange={(e) => setPartForm({ ...partForm, ordered_online: e.target.checked })}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="part-ordered-online">{t('parts:dialog.ordered_online')}</Label>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="part-arrival">{t('parts:dialog.arrival_label')}</Label>
                  <Input
                    id="part-arrival"
                    type="date"
                    value={partForm.estimated_arrival}
                    onChange={(e) => setPartForm({ ...partForm, estimated_arrival: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="part-cost">{t('parts:dialog.cost_label')}</Label>
                  <Input
                    id="part-cost"
                    type="number"
                    step="0.01"
                    value={partForm.cost}
                    onChange={(e) => setPartForm({ ...partForm, cost: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="part-notes">{t('parts:dialog.notes_label')}</Label>
                  <Textarea
                    id="part-notes"
                    value={partForm.notes}
                    onChange={(e) => setPartForm({ ...partForm, notes: e.target.value })}
                    placeholder={t('parts:dialog.notes_placeholder')}
                  />
                </div>
                <Button onClick={handleCreatePart}>
                  <Plus className="w-4 h-4 mr-2" />
                  {t('parts:dialog.add_button')}
                </Button>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-4">{t('parts:dialog.registered_parts')}</h3>
              {parts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {t('parts:dialog.no_parts')}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('parts:table.part')}</TableHead>
                      <TableHead>{t('parts:table.supplier')}</TableHead>
                      <TableHead>{t('parts:table.status')}</TableHead>
                      <TableHead>{t('parts:table.type')}</TableHead>
                      <TableHead>{t('parts:table.arrival')}</TableHead>
                      <TableHead>{t('parts:table.cost')}</TableHead>
                      <TableHead>{t('parts:table.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parts.map((part) => (
                      <TableRow key={part.id}>
                        <TableCell className="font-medium">{part.name}</TableCell>
                        <TableCell>
                          {part.supplier_id 
                            ? authorizedPoints.find(p => p.id === part.supplier_id)?.name || 'N/A'
                            : part.supplier_name || 'N/A'}
                        </TableCell>
                        <TableCell>
                          <select
                            value={part.status}
                            onChange={(e) => handleUpdatePartStatus(part.id, e.target.value)}
                            className="border rounded px-2 py-1 text-sm"
                          >
                            <option value="pending">{t('parts:status.pending')}</option>
                            <option value="ordered">{t('parts:status.ordered')}</option>
                            <option value="received">{t('parts:status.received')}</option>
                          </select>
                        </TableCell>
                        <TableCell>
                          <Badge variant={part.ordered_online ? "default" : "secondary"}>
                            {part.ordered_online ? t('parts:type.online') : t('parts:type.in_person')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {part.estimated_arrival ? new Date(part.estimated_arrival).toLocaleDateString() : 'N/A'}
                        </TableCell>
                        <TableCell>
                          {part.cost ? `$${part.cost.toFixed(2)}` : 'N/A'}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeletePart(part.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setPartsDialog(false)}>
              {t('common:actions.close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={costBreakdownDialog} onOpenChange={setCostBreakdownDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('repairs:cost_breakdown.title')}</DialogTitle>
            <DialogDescription>
              {selectedRepairForCost && `${selectedRepairForCost.client_name} - ${selectedRepairForCost.vehicle_info}`}
            </DialogDescription>
          </DialogHeader>
          {selectedRepairForCost && (
            <div className="space-y-4">
              <div className="border rounded-lg p-4 bg-gray-50">
                <h3 className="font-semibold mb-4 text-lg">{t('repairs:cost_breakdown.details')}</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-gray-700">{t('repairs:cost_breakdown.parts_cost')}</span>
                    <span className="font-semibold">
                      ${parts
                        .filter(p => p.repair_id === selectedRepairForCost.id)
                        .reduce((sum, part) => sum + (part.cost || 0), 0)
                        .toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-gray-700">{t('repairs:cost_breakdown.labor_cost')}</span>
                    <span className="font-semibold">
                      ${((selectedRepairForCost.cost || 0) - parts
                        .filter(p => p.repair_id === selectedRepairForCost.id)
                        .reduce((sum, part) => sum + (part.cost || 0), 0)).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-gray-700">{t('repairs:cost_breakdown.additional_services')}</span>
                    <span className="font-semibold">$0.00</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-t-2 border-gray-400 mt-2">
                    <span className="text-lg font-bold">{t('repairs:cost_breakdown.total_cost')}</span>
                    <span className="text-lg font-bold text-blue-600">
                      ${(selectedRepairForCost.cost || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="border rounded-lg p-4 bg-blue-50">
                <h3 className="font-semibold mb-3 text-lg">{t('repairs:cost_breakdown.payment_status')}</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-700">{t('repairs:cost_breakdown.amount_charged')}</span>
                    <span className="font-semibold">
                      ${(selectedRepairForCost.amount_charged || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-t">
                    <span className="text-gray-700 font-semibold">{t('repairs:cost_breakdown.balance_pending')}</span>
                    <span className={`font-bold text-lg ${(selectedRepairForCost.balance_pending || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      ${(selectedRepairForCost.balance_pending || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setCostBreakdownDialog(false)}>
              {t('common:actions.close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={repairRequestDialog} onOpenChange={setRepairRequestDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('repair_requests:dialog.title')}</DialogTitle>
          </DialogHeader>
          {selectedRepairRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="font-semibold">{t('repair_requests:table.name')}</Label>
                  <p>{selectedRepairRequest.name}</p>
                </div>
                <div>
                  <Label className="font-semibold">{t('repair_requests:table.email')}</Label>
                  <p>{selectedRepairRequest.email}</p>
                </div>
                <div>
                  <Label className="font-semibold">{t('repair_requests:table.phone')}</Label>
                  <p>{selectedRepairRequest.phone}</p>
                </div>
                <div>
                  <Label className="font-semibold">{t('repair_requests:table.service_type')}</Label>
                  <p>
                    {selectedRepairRequest.service_type === 'mobile' 
                      ? t('repair_requests:service_types.mobile') 
                      : t('repair_requests:service_types.workshop')}
                  </p>
                </div>
              </div>
              <div>
                <Label className="font-semibold">{t('repair_requests:table.vehicle')}</Label>
                <p>{selectedRepairRequest.vehicle_info}</p>
              </div>
              <div>
                <Label className="font-semibold">{t('repair_requests:table.location')}</Label>
                <p>{selectedRepairRequest.location}</p>
              </div>
              <div>
                <Label className="font-semibold">Descripción</Label>
                <p className="whitespace-pre-wrap">{selectedRepairRequest.description}</p>
              </div>
              {selectedRepairRequest.preferred_datetime && (
                <div>
                  <Label className="font-semibold">{t('repair_requests:table.date')}</Label>
                  <p>{new Date(selectedRepairRequest.preferred_datetime).toLocaleString()}</p>
                </div>
              )}
              <div className="flex gap-4">
                <div>
                  <Label className="font-semibold">{t('repair_requests:table.emergency')}</Label>
                  <p>{selectedRepairRequest.is_emergency ? 'Sí' : 'No'}</p>
                </div>
                <div>
                  <Label className="font-semibold">{t('repair_requests:table.status')}</Label>
                  <div>{getRequestStatusBadge(selectedRepairRequest.status)}</div>
                </div>
              </div>
              {selectedRepairRequest.status === 'new' && (
                <div className="pt-4 border-t">
                  <p className="text-sm text-gray-600 mb-4">{t('repair_requests:dialog.convert_message')}</p>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleConvertRepairRequest(selectedRepairRequest.id, 'repair')}
                      className="flex-1"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      {t('repair_requests:dialog.convert_repair')}
                    </Button>
                    <Button
                      onClick={() => handleConvertRepairRequest(selectedRepairRequest.id, 'express')}
                      variant="secondary"
                      className="flex-1"
                    >
                      <Zap className="w-4 h-4 mr-2" />
                      {t('repair_requests:dialog.convert_express')}
                    </Button>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Button
                      onClick={() => handleRejectRepairRequest(selectedRepairRequest.id)}
                      variant="destructive"
                      className="flex-1"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      {t('repair_requests:actions.reject')}
                    </Button>
                    <Button
                      onClick={() => handleDeleteRepairRequest(selectedRepairRequest.id)}
                      variant="outline"
                      className="flex-1"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      {t('repair_requests:actions.delete')}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setRepairRequestDialog(false)}>
              {t('common:actions.close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editRepairDialog} onOpenChange={setEditRepairDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('common:dialogs.edit_repair')}</DialogTitle>
          </DialogHeader>
          {editRepair && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Mecánico Asignado</Label>
                <select
                  value={editRepair.mechanic_id || ''}
                  onChange={(e) => setEditRepair({ ...editRepair, mechanic_id: e.target.value })}
                  className="border rounded px-3 py-2"
                >
                  <option value="">{t('common:unassigned')}</option>
                  {mechanics.map((mechanic) => (
                    <option key={mechanic.id} value={mechanic.id}>
                      {mechanic.user_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label>Tipo de Servicio</Label>
                <select
                  value={editRepair.service_type}
                  onChange={(e) => setEditRepair({ ...editRepair, service_type: e.target.value as 'mobile' | 'workshop' })}
                  className="border rounded px-3 py-2"
                >
                  <option value="mobile">Móvil</option>
                  <option value="workshop">Taller</option>
                </select>
              </div>
              <div className="grid gap-2">
                <Label>Ubicación</Label>
                <Input
                  value={editRepair.location || ''}
                  onChange={(e) => setEditRepair({ ...editRepair, location: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Descripción del Problema</Label>
                <Textarea
                  value={editRepair.issue_description}
                  onChange={(e) => setEditRepair({ ...editRepair, issue_description: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Fecha Programada</Label>
                <Input
                  type="datetime-local"
                  value={editRepair.scheduled_date ? new Date(editRepair.scheduled_date).toISOString().slice(0, 16) : ''}
                  onChange={(e) => setEditRepair({ ...editRepair, scheduled_date: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Costo Estimado</Label>
                <Input
                  type="number"
                  value={editRepair.cost || ''}
                  onChange={(e) => setEditRepair({ ...editRepair, cost: e.target.value ? Number(e.target.value) : undefined })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditRepairDialog(false)}>
              {t('common:actions.cancel')}
            </Button>
            <Button onClick={handleUpdateRepair}>
              {t('common:actions.save_changes')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editExpressDialog} onOpenChange={setEditExpressDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('common:dialogs.edit_express_service')}</DialogTitle>
          </DialogHeader>
          {editExpress && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Mecánico Asignado</Label>
                <select
                  value={editExpress.mechanic_id || ''}
                  onChange={(e) => setEditExpress({ ...editExpress, mechanic_id: e.target.value })}
                  className="border rounded px-3 py-2"
                >
                  <option value="">{t('common:unassigned')}</option>
                  {mechanics.map((mechanic) => (
                    <option key={mechanic.id} value={mechanic.id}>
                      {mechanic.user_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label>Prioridad</Label>
                <select
                  value={editExpress.priority}
                  onChange={(e) => setEditExpress({ ...editExpress, priority: e.target.value as 'urgent' | 'high' | 'critical' })}
                  className="border rounded px-3 py-2"
                >
                  <option value="urgent">Urgente</option>
                  <option value="high">Alta</option>
                  <option value="critical">Crítica</option>
                </select>
              </div>
              <div className="grid gap-2">
                <Label>Ubicación</Label>
                <Input
                  value={editExpress.location}
                  onChange={(e) => setEditExpress({ ...editExpress, location: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Descripción</Label>
                <Textarea
                  value={editExpress.description}
                  onChange={(e) => setEditExpress({ ...editExpress, description: e.target.value })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditExpressDialog(false)}>
              {t('common:actions.cancel')}
            </Button>
            <Button onClick={handleUpdateExpress}>
              {t('common:actions.save_changes')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('common:dialogs.confirm_delete')}</DialogTitle>
            <DialogDescription>
              {t('common:dialogs.confirm_delete_message')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>
              {t('common:actions.cancel')}
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              {t('common:actions.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={shareFormDialog} onOpenChange={setShareFormDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('common:dialogs.share_public_form')}</DialogTitle>
            <DialogDescription>
              {t('common:dialogs.share_public_form_description')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Español</Label>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={`${window.location.origin}/solicitar`}
                  className="flex-1"
                />
                <Button
                  onClick={() => handleCopyFormLink('es')}
                  variant="outline"
                  size="icon"
                >
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">English</Label>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={`${window.location.origin}/request`}
                  className="flex-1"
                />
                <Button
                  onClick={() => handleCopyFormLink('en')}
                  variant="outline"
                  size="icon"
                >
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShareFormDialog(false)}>
              {t('common:actions.close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
