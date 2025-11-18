import { useState, useEffect } from 'react';
import { User, Client, Mechanic, Workshop, Repair, AuthorizedPoint, api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { LogOut, Users, Wrench, Building2, ClipboardList, MapPin } from 'lucide-react';

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
    } finally {
      setLoading(false);
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
              <CardHeader>
                <CardTitle>Clientes</CardTitle>
                <CardDescription>Lista de todos los clientes registrados</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Teléfono</TableHead>
                      <TableHead>Dirección</TableHead>
                      <TableHead>Vehículo</TableHead>
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
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="mechanics">
            <Card>
              <CardHeader>
                <CardTitle>Mecánicos</CardTitle>
                <CardDescription>Lista de todos los mecánicos registrados</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Teléfono</TableHead>
                      <TableHead>Especialidades</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Calificación</TableHead>
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
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="workshops">
            <Card>
              <CardHeader>
                <CardTitle>Talleres</CardTitle>
                <CardDescription>Lista de todos los talleres registrados</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Dirección</TableHead>
                      <TableHead>Teléfono</TableHead>
                      <TableHead>Servicios</TableHead>
                      <TableHead>Calificación</TableHead>
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
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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
    </div>
  );
}
