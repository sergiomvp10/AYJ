import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { User, Client, Mechanic, Workshop, Repair, AuthorizedPoint, Part, api, VinDecoded } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { LogOut, Users, Wrench, Building2, ClipboardList, MapPin, Plus, Trash2, Calendar, Package } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { VinDecoderInput } from '@/components/VinDecoderInput';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

interface AdminDashboardProps {
  user: User;
  onLogout: () => void;
}

export default function AdminDashboard({ user, onLogout }: AdminDashboardProps) {
  const { t } = useTranslation(['dashboard', 'repairs', 'parts', 'clients', 'mechanics', 'workshops', 'authorized_points', 'toasts', 'common', 'vin']);
  const [clients, setClients] = useState<Client[]>([]);
  const [mechanics, setMechanics] = useState<Mechanic[]>([]);
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [repairs, setRepairs] = useState<Repair[]>([]);
  const [authorizedPoints, setAuthorizedPoints] = useState<AuthorizedPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const [clientDialog, setClientDialog] = useState(false);
  const [mechanicDialog, setMechanicDialog] = useState(false);
  const [workshopDialog, setWorkshopDialog] = useState(false);
  const [visitDialog, setVisitDialog] = useState(false);
  const [repairDialog, setRepairDialog] = useState(false);
  const [authorizedPointDialog, setAuthorizedPointDialog] = useState(false);
  const [partsDialog, setPartsDialog] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedRepairForParts, setSelectedRepairForParts] = useState<Repair | null>(null);
  const [parts, setParts] = useState<Part[]>([]);
  const [partForm, setPartForm] = useState({
    name: '',
    supplier_id: '',
    ordered_online: false,
    estimated_arrival: '',
    cost: '',
    notes: '',
  });

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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [clientsData, mechanicsData, workshopsData, repairsData, pointsData] = await Promise.all([
        api.getClients(),
        api.getMechanics(),
        api.getWorkshops(),
        api.getRepairs(),
        api.getAuthorizedPoints(),
      ]);
      setClients(clientsData);
      setMechanics(mechanicsData);
      setWorkshops(workshopsData);
      setRepairs(repairsData);
      setAuthorizedPoints(pointsData);
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
        supplier_id: partForm.supplier_id || undefined,
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
        ordered_online: false,
        estimated_arrival: '',
        cost: '',
        notes: '',
      });
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
        <div className="max-w-screen-2xl mx-auto px-6 sm:px-8 lg:px-10 py-6 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <img 
              src="/logo.png" 
              alt="AYJ Auto-Eléctrico Móvil" 
              className="w-20 h-20 object-contain"
            />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Panel de Administración</h1>
              <p className="text-base text-gray-600">Bienvenido, {user.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            <Button onClick={onLogout} variant="outline" size="lg">
              <LogOut className="w-5 h-5 mr-2" />
              Cerrar Sesión
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-screen-2xl mx-auto px-6 sm:px-8 lg:px-10 py-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 md:gap-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-base font-medium">Clientes</CardTitle>
              <Users className="h-6 w-6 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{clients.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-base font-medium">Mecánicos</CardTitle>
              <Wrench className="h-6 w-6 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{mechanics.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-base font-medium">Talleres</CardTitle>
              <Building2 className="h-6 w-6 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{workshops.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-base font-medium">Reparaciones</CardTitle>
              <ClipboardList className="h-6 w-6 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{repairs.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-base font-medium">Puntos Autorizados</CardTitle>
              <MapPin className="h-6 w-6 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{authorizedPoints.length}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="repairs" className="space-y-6">
          <TabsList className="h-12">
            <TabsTrigger value="repairs" className="text-base px-6">Reparaciones</TabsTrigger>
            <TabsTrigger value="clients" className="text-base px-6">Clientes</TabsTrigger>
            <TabsTrigger value="mechanics" className="text-base px-6">Mecánicos</TabsTrigger>
            <TabsTrigger value="workshops" className="text-base px-6">Talleres</TabsTrigger>
            <TabsTrigger value="points" className="text-base px-6">Puntos Autorizados</TabsTrigger>
          </TabsList>

          <TabsContent value="repairs">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-xl">Reparaciones</CardTitle>
                  <CardDescription className="text-base">Lista de todas las reparaciones en el sistema</CardDescription>
                </div>
                <Button onClick={() => setRepairDialog(true)} size="lg">
                  <Plus className="w-5 h-5 mr-2" />
                  Crear Reparación
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
                          <TableCell className="text-base px-6 py-4">{repair.mechanic_name || 'Sin asignar'}</TableCell>
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
                            <select
                              value={repair.status}
                              onChange={(e) => handleUpdateRepairStatus(repair.id, e.target.value)}
                              className="text-base border rounded px-3 py-2"
                            >
                              <option value="pending">Pendiente</option>
                              <option value="assigned">Asignado</option>
                              <option value="in_progress">En Progreso</option>
                              <option value="waiting_parts">Esperando Piezas</option>
                              <option value="completed">Completado</option>
                              <option value="cancelled">Cancelado</option>
                              <option value="paid">Pagado</option>
                              <option value="balance_pending">Balance Pendiente</option>
                            </select>
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
                  <CardTitle className="text-xl">Clientes</CardTitle>
                  <CardDescription className="text-base">Lista de todos los clientes registrados</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => setVisitDialog(true)} size="lg">
                    <Calendar className="w-5 h-5 mr-2" />
                    Programar Visita
                  </Button>
                  <Button onClick={() => setClientDialog(true)} size="lg">
                    <Plus className="w-5 h-5 mr-2" />
                    Agregar Cliente
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
                  <CardTitle className="text-xl">Mecánicos</CardTitle>
                  <CardDescription className="text-base">Lista de todos los mecánicos registrados</CardDescription>
                </div>
                <Button onClick={() => setMechanicDialog(true)} size="lg">
                  <Plus className="w-5 h-5 mr-2" />
                  Agregar Mecánico
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
                  <CardTitle className="text-xl">Talleres</CardTitle>
                  <CardDescription className="text-base">Lista de todos los talleres registrados</CardDescription>
                </div>
                <Button onClick={() => setWorkshopDialog(true)} size="lg">
                  <Plus className="w-5 h-5 mr-2" />
                  Agregar Taller
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
                  <CardTitle className="text-xl">Puntos Autorizados</CardTitle>
                  <CardDescription className="text-base">Lista de todos los puntos autorizados</CardDescription>
                </div>
                <Button onClick={() => setAuthorizedPointDialog(true)} size="lg">
                  <Plus className="w-5 h-5 mr-2" />
                  Registrar
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
        </Tabs>
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
            <VinDecoderInput
              onDecoded={(decoded: VinDecoded) => {
                setRepairForm({ ...repairForm, vehicle_info: decoded.summary });
              }}
              className="grid gap-2"
            />
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
                  <select
                    id="part-supplier"
                    value={partForm.supplier_id}
                    onChange={(e) => setPartForm({ ...partForm, supplier_id: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">{t('parts:dialog.no_supplier')}</option>
                    {authorizedPoints.map((point) => (
                      <option key={point.id} value={point.id}>
                        {point.name}
                      </option>
                    ))}
                  </select>
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
                        <TableCell>{part.supplier_name || 'N/A'}</TableCell>
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
    </div>
  );
}
