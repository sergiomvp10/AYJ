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
import { LogOut, Users, Wrench, Building2, ClipboardList, MapPin, Plus, Trash2 } from 'lucide-react';
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

  const [clientForm, setClientForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    address: '',
    vehicle_info: '',
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

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      assigned: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-purple-100 text-purple-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return <Badge className={variants[status] || ''}>{status}</Badge>;
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
              <CardHeader>
                <CardTitle>Reparaciones</CardTitle>
                <CardDescription>Lista de todas las reparaciones en el sistema</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Vehículo</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Mecánico</TableHead>
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
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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
                <Button onClick={() => setClientDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar Cliente
                </Button>
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
    </div>
  );
}
