import { useState, useEffect } from 'react';
import { User, Client, Mechanic, Workshop, Repair, AuthorizedPoint, api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { LogOut, Users, Wrench, Building2, ClipboardList, MapPin, Plus, Trash2, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AdminDashboardProps {
  user: User;
  onLogout: () => void;
}

export default function AdminDashboard({ user, onLogout }: AdminDashboardProps) {
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
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  const [clientForm, setClientForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
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
    password: '',
    specialties: '',
    is_mobile: false,
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
    status: 'pending' as 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled' | 'paid' | 'balance_pending',
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
      const userData = await api.register({
        email: clientForm.email,
        password: clientForm.password,
        name: clientForm.name,
        role: 'cliente',
        phone: clientForm.phone,
      });
      
      await api.createClient({
        user_id: userData.id,
        address: clientForm.address,
        vehicle_info: clientForm.vehicle_info,
      });

      toast({
        title: 'Éxito',
        description: 'Cliente creado correctamente',
      });
      
      setClientDialog(false);
      setClientForm({ name: '', email: '', phone: '', password: '', address: '', vehicle_info: '' });
      loadData();
    } catch (error) {
      console.error('Error creating client:', error);
      toast({
        title: 'Error',
        description: 'No se pudo crear el cliente',
        variant: 'destructive',
      });
    }
  };

  const handleCreateMechanic = async () => {
    try {
      const userData = await api.register({
        email: mechanicForm.email,
        password: mechanicForm.password,
        name: mechanicForm.name,
        role: 'mecanico',
        phone: mechanicForm.phone,
      });
      
      await api.createMechanic({
        user_id: userData.id,
        specialties: mechanicForm.specialties.split(',').map(s => s.trim()),
        is_mobile: mechanicForm.is_mobile,
      });

      toast({
        title: 'Éxito',
        description: 'Mecánico creado correctamente',
      });
      
      setMechanicDialog(false);
      setMechanicForm({ name: '', email: '', phone: '', password: '', specialties: '', is_mobile: false });
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
      
      await api.createRepair({
        client_id: selectedClient.id,
        vehicle_info: repairForm.vehicle_info,
        issue_description: repairForm.issue_description,
        service_type: repairForm.service_type,
        location: repairForm.location,
        scheduled_date: scheduledDateTime,
      });

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
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      paid: 'bg-emerald-100 text-emerald-800',
      balance_pending: 'bg-orange-100 text-orange-800',
    };
    const labels: Record<string, string> = {
      pending: 'Pendiente',
      assigned: 'Asignado',
      in_progress: 'En Progreso',
      completed: 'Completado',
      cancelled: 'Cancelado',
      paid: 'Pagado',
      balance_pending: 'Balance Pendiente',
    };
    return <Badge className={variants[status] || ''}>{labels[status] || status}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Cargando datos...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Panel de Administración</h1>
            <p className="text-sm text-gray-600">Bienvenido, {user.name}</p>
          </div>
          <Button onClick={onLogout} variant="outline">
            <LogOut className="w-4 h-4 mr-2" />
            Cerrar Sesión
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Clientes</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{clients.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Mecánicos</CardTitle>
              <Wrench className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{mechanics.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Talleres</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{workshops.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Reparaciones</CardTitle>
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{repairs.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Puntos Autorizados</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{authorizedPoints.length}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="repairs" className="space-y-4">
          <TabsList>
            <TabsTrigger value="repairs">Reparaciones</TabsTrigger>
            <TabsTrigger value="clients">Clientes</TabsTrigger>
            <TabsTrigger value="mechanics">Mecánicos</TabsTrigger>
            <TabsTrigger value="workshops">Talleres</TabsTrigger>
            <TabsTrigger value="points">Puntos Autorizados</TabsTrigger>
          </TabsList>

          <TabsContent value="repairs">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Reparaciones</CardTitle>
                  <CardDescription>Lista de todas las reparaciones en el sistema</CardDescription>
                </div>
                <Button onClick={() => setRepairDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Crear Reparación
                </Button>
              </CardHeader>
              <CardContent>
                {repairs.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No hay reparaciones registradas
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Vehículo</TableHead>
                        <TableHead>Descripción</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Mecánico</TableHead>
                        <TableHead>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {repairs.map((repair) => (
                        <TableRow key={repair.id}>
                          <TableCell className="font-medium">{repair.client_name}</TableCell>
                          <TableCell>{repair.vehicle_info}</TableCell>
                          <TableCell className="max-w-xs truncate">{repair.issue_description}</TableCell>
                          <TableCell>{repair.service_type === 'mobile' ? 'Móvil' : 'Taller'}</TableCell>
                          <TableCell>{getStatusBadge(repair.status)}</TableCell>
                          <TableCell>{repair.mechanic_name || 'Sin asignar'}</TableCell>
                          <TableCell>
                            <select
                              value={repair.status}
                              onChange={(e) => handleUpdateRepairStatus(repair.id, e.target.value)}
                              className="text-sm border rounded px-2 py-1"
                            >
                              <option value="pending">Pendiente</option>
                              <option value="assigned">Asignado</option>
                              <option value="in_progress">En Progreso</option>
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
                  <CardTitle>Clientes</CardTitle>
                  <CardDescription>Lista de todos los clientes registrados</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => setVisitDialog(true)}>
                    <Calendar className="w-4 h-4 mr-2" />
                    Programar Visita
                  </Button>
                  <Button onClick={() => setClientDialog(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Agregar Cliente
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {clients.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No hay clientes registrados
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Teléfono</TableHead>
                        <TableHead>Dirección</TableHead>
                        <TableHead>Vehículo</TableHead>
                        <TableHead>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {clients.map((client) => (
                        <TableRow key={client.id}>
                          <TableCell className="font-medium">{client.user_name}</TableCell>
                          <TableCell>{client.user_email}</TableCell>
                          <TableCell>{client.user_phone}</TableCell>
                          <TableCell>{client.address}</TableCell>
                          <TableCell>{client.vehicle_info}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteClient(client.id)}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
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
                  <CardTitle>Mecánicos</CardTitle>
                  <CardDescription>Lista de todos los mecánicos registrados</CardDescription>
                </div>
                <Button onClick={() => setMechanicDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar Mecánico
                </Button>
              </CardHeader>
              <CardContent>
                {mechanics.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No hay mecánicos registrados
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Teléfono</TableHead>
                        <TableHead>Especialidades</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Calificación</TableHead>
                        <TableHead>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mechanics.map((mechanic) => (
                        <TableRow key={mechanic.id}>
                          <TableCell className="font-medium">{mechanic.user_name}</TableCell>
                          <TableCell>{mechanic.user_email}</TableCell>
                          <TableCell>{mechanic.user_phone}</TableCell>
                          <TableCell>{mechanic.specialties.join(', ')}</TableCell>
                          <TableCell>{mechanic.is_mobile ? 'Móvil' : 'Taller'}</TableCell>
                          <TableCell>{mechanic.rating.toFixed(1)} ⭐</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteMechanic(mechanic.id)}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
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
                  <CardTitle>Talleres</CardTitle>
                  <CardDescription>Lista de todos los talleres registrados</CardDescription>
                </div>
                <Button onClick={() => setWorkshopDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar Taller
                </Button>
              </CardHeader>
              <CardContent>
                {workshops.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No hay talleres registrados
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Dirección</TableHead>
                        <TableHead>Teléfono</TableHead>
                        <TableHead>Servicios</TableHead>
                        <TableHead>Calificación</TableHead>
                        <TableHead>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {workshops.map((workshop) => (
                        <TableRow key={workshop.id}>
                          <TableCell className="font-medium">{workshop.name}</TableCell>
                          <TableCell>{workshop.address}</TableCell>
                          <TableCell>{workshop.phone}</TableCell>
                          <TableCell>{workshop.services.join(', ')}</TableCell>
                          <TableCell>{workshop.rating.toFixed(1)} ⭐</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteWorkshop(workshop.id)}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
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
              <CardHeader>
                <CardTitle>Puntos Autorizados</CardTitle>
                <CardDescription>Lista de todos los puntos autorizados</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Dirección</TableHead>
                      <TableHead>Teléfono</TableHead>
                      <TableHead>Servicios</TableHead>
                      <TableHead>Contacto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {authorizedPoints.map((point) => (
                      <TableRow key={point.id}>
                        <TableCell className="font-medium">{point.name}</TableCell>
                        <TableCell>{point.address}</TableCell>
                        <TableCell>{point.phone}</TableCell>
                        <TableCell>{point.services.join(', ')}</TableCell>
                        <TableCell>{point.contact_person}</TableCell>
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Agregar Cliente</DialogTitle>
            <DialogDescription>
              Completa los datos del nuevo cliente
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="client-name">Nombre</Label>
              <Input
                id="client-name"
                value={clientForm.name}
                onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })}
                placeholder="Juan Pérez"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="client-email">Email</Label>
              <Input
                id="client-email"
                type="email"
                value={clientForm.email}
                onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })}
                placeholder="juan@ejemplo.com"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="client-phone">Teléfono</Label>
              <Input
                id="client-phone"
                value={clientForm.phone}
                onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })}
                placeholder="+1234567890"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="client-password">Contraseña</Label>
              <Input
                id="client-password"
                type="password"
                value={clientForm.password}
                onChange={(e) => setClientForm({ ...clientForm, password: e.target.value })}
                placeholder="••••••••"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="client-address">Dirección</Label>
              <Input
                id="client-address"
                value={clientForm.address}
                onChange={(e) => setClientForm({ ...clientForm, address: e.target.value })}
                placeholder="Calle Principal 123"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="client-vehicle">Información del Vehículo</Label>
              <Textarea
                id="client-vehicle"
                value={clientForm.vehicle_info}
                onChange={(e) => setClientForm({ ...clientForm, vehicle_info: e.target.value })}
                placeholder="Toyota Corolla 2020, Placa ABC123"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClientDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateClient}>
              Crear Cliente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mechanic Dialog */}
      <Dialog open={mechanicDialog} onOpenChange={setMechanicDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Agregar Mecánico</DialogTitle>
            <DialogDescription>
              Completa los datos del nuevo mecánico
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="mechanic-name">Nombre</Label>
              <Input
                id="mechanic-name"
                value={mechanicForm.name}
                onChange={(e) => setMechanicForm({ ...mechanicForm, name: e.target.value })}
                placeholder="Carlos Rodríguez"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="mechanic-email">Email</Label>
              <Input
                id="mechanic-email"
                type="email"
                value={mechanicForm.email}
                onChange={(e) => setMechanicForm({ ...mechanicForm, email: e.target.value })}
                placeholder="carlos@ejemplo.com"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="mechanic-phone">Teléfono</Label>
              <Input
                id="mechanic-phone"
                value={mechanicForm.phone}
                onChange={(e) => setMechanicForm({ ...mechanicForm, phone: e.target.value })}
                placeholder="+1234567890"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="mechanic-password">Contraseña</Label>
              <Input
                id="mechanic-password"
                type="password"
                value={mechanicForm.password}
                onChange={(e) => setMechanicForm({ ...mechanicForm, password: e.target.value })}
                placeholder="••••••••"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="mechanic-specialties">Especialidades (separadas por comas)</Label>
              <Input
                id="mechanic-specialties"
                value={mechanicForm.specialties}
                onChange={(e) => setMechanicForm({ ...mechanicForm, specialties: e.target.value })}
                placeholder="Frenos, Motor, Transmisión"
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
              <Label htmlFor="mechanic-mobile">Mecánico móvil (va a domicilio)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMechanicDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateMechanic}>
              Crear Mecánico
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Workshop Dialog */}
      <Dialog open={workshopDialog} onOpenChange={setWorkshopDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Agregar Taller</DialogTitle>
            <DialogDescription>
              Completa los datos del nuevo taller
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="workshop-name">Nombre</Label>
              <Input
                id="workshop-name"
                value={workshopForm.name}
                onChange={(e) => setWorkshopForm({ ...workshopForm, name: e.target.value })}
                placeholder="Taller Mecánico Central"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="workshop-address">Dirección</Label>
              <Input
                id="workshop-address"
                value={workshopForm.address}
                onChange={(e) => setWorkshopForm({ ...workshopForm, address: e.target.value })}
                placeholder="Av. Principal 456"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="workshop-phone">Teléfono</Label>
              <Input
                id="workshop-phone"
                value={workshopForm.phone}
                onChange={(e) => setWorkshopForm({ ...workshopForm, phone: e.target.value })}
                placeholder="+1234567890"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="workshop-services">Servicios (separados por comas)</Label>
              <Textarea
                id="workshop-services"
                value={workshopForm.services}
                onChange={(e) => setWorkshopForm({ ...workshopForm, services: e.target.value })}
                placeholder="Reparación de motor, Cambio de aceite, Alineación"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWorkshopDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateWorkshop}>
              Crear Taller
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Visit Scheduling Dialog */}
      <Dialog open={visitDialog} onOpenChange={setVisitDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Programar Visita</DialogTitle>
            <DialogDescription>
              Busca y selecciona un cliente para programar una visita
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="client-search">Buscar Cliente</Label>
              <Input
                id="client-search"
                value={visitForm.client_search}
                onChange={(e) => setVisitForm({ ...visitForm, client_search: e.target.value })}
                placeholder="Buscar por nombre o email..."
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
                      Cambiar
                    </Button>
                  </div>
                </div>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="visit-date">Fecha</Label>
              <Input
                id="visit-date"
                type="date"
                value={visitForm.scheduled_date}
                onChange={(e) => setVisitForm({ ...visitForm, scheduled_date: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="visit-time">Hora</Label>
              <Input
                id="visit-time"
                type="time"
                value={visitForm.scheduled_time}
                onChange={(e) => setVisitForm({ ...visitForm, scheduled_time: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="visit-type">Tipo de Servicio</Label>
              <select
                id="visit-type"
                value={visitForm.service_type}
                onChange={(e) => setVisitForm({ ...visitForm, service_type: e.target.value as 'mobile' | 'workshop' })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="mobile">Mecánico Móvil (va a domicilio)</option>
                <option value="workshop">Taller</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="visit-location">Ubicación</Label>
              <Input
                id="visit-location"
                value={visitForm.location}
                onChange={(e) => setVisitForm({ ...visitForm, location: e.target.value })}
                placeholder="Dirección donde se realizará el servicio"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="visit-mechanic">Mecánico (opcional)</Label>
              <select
                id="visit-mechanic"
                value={visitForm.mechanic_id}
                onChange={(e) => setVisitForm({ ...visitForm, mechanic_id: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Sin asignar</option>
                {mechanics.map((mechanic) => (
                  <option key={mechanic.id} value={mechanic.id}>
                    {mechanic.user_name} - {mechanic.is_mobile ? 'Móvil' : 'Taller'}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="visit-issue">Descripción del Problema</Label>
              <Textarea
                id="visit-issue"
                value={visitForm.issue_description}
                onChange={(e) => setVisitForm({ ...visitForm, issue_description: e.target.value })}
                placeholder="Describe el problema o servicio requerido"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVisitDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateVisit}>
              Programar Visita
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Repair Creation Dialog */}
      <Dialog open={repairDialog} onOpenChange={setRepairDialog}>
        <DialogContent className="sm:max-w-md max-h-screen overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Crear Reparación</DialogTitle>
            <DialogDescription>
              Busca y selecciona un cliente para registrar una reparación
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="repair-client-search">Buscar Cliente</Label>
              <Input
                id="repair-client-search"
                value={repairForm.client_search}
                onChange={(e) => setRepairForm({ ...repairForm, client_search: e.target.value })}
                placeholder="Buscar por nombre o email..."
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
                      Cambiar
                    </Button>
                  </div>
                </div>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="repair-vehicle">Información del Vehículo</Label>
              <Input
                id="repair-vehicle"
                value={repairForm.vehicle_info}
                onChange={(e) => setRepairForm({ ...repairForm, vehicle_info: e.target.value })}
                placeholder="Ej: Toyota Corolla 2020, Placa ABC123"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="repair-issue">Descripción del Problema</Label>
              <Textarea
                id="repair-issue"
                value={repairForm.issue_description}
                onChange={(e) => setRepairForm({ ...repairForm, issue_description: e.target.value })}
                placeholder="Describe el problema o servicio requerido"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="repair-type">Tipo de Servicio</Label>
              <select
                id="repair-type"
                value={repairForm.service_type}
                onChange={(e) => setRepairForm({ ...repairForm, service_type: e.target.value as 'mobile' | 'workshop' })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="mobile">Mecánico Móvil (va a domicilio)</option>
                <option value="workshop">Taller</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="repair-location">Ubicación</Label>
              <Input
                id="repair-location"
                value={repairForm.location}
                onChange={(e) => setRepairForm({ ...repairForm, location: e.target.value })}
                placeholder="Dirección donde se realizará el servicio"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="repair-date">Fecha Programada (opcional)</Label>
              <Input
                id="repair-date"
                type="date"
                value={repairForm.scheduled_date}
                onChange={(e) => setRepairForm({ ...repairForm, scheduled_date: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="repair-time">Hora Programada (opcional)</Label>
              <Input
                id="repair-time"
                type="time"
                value={repairForm.scheduled_time}
                onChange={(e) => setRepairForm({ ...repairForm, scheduled_time: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="repair-mechanic">Mecánico (opcional)</Label>
              <select
                id="repair-mechanic"
                value={repairForm.mechanic_id}
                onChange={(e) => setRepairForm({ ...repairForm, mechanic_id: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Sin asignar</option>
                {mechanics.map((mechanic) => (
                  <option key={mechanic.id} value={mechanic.id}>
                    {mechanic.user_name} - {mechanic.is_mobile ? 'Móvil' : 'Taller'}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="repair-cost">Costo (opcional)</Label>
              <Input
                id="repair-cost"
                type="number"
                step="0.01"
                value={repairForm.cost}
                onChange={(e) => setRepairForm({ ...repairForm, cost: e.target.value })}
                placeholder="0.00"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRepairDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateRepair}>
              Crear Reparación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
