const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'cliente' | 'mecanico';
  phone: string;
  created_at: string;
}

export interface Client {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  user_phone: string;
  address: string;
  vehicle_info: string;
  created_at: string;
}

export interface Mechanic {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  user_phone: string;
  specialties: string[];
  is_mobile: boolean;
  rating: number;
  created_at: string;
}

export interface Workshop {
  id: string;
  name: string;
  address: string;
  phone: string;
  services: string[];
  rating: number;
  created_at: string;
}

export interface Repair {
  id: string;
  client_id: string;
  client_name: string;
  mechanic_id?: string;
  mechanic_name?: string;
  workshop_id?: string;
  workshop_name?: string;
  vehicle_info: string;
  issue_description: string;
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
  service_type: 'mobile' | 'workshop';
  location: string;
  scheduled_date?: string;
  completed_date?: string;
  cost?: number;
  created_at: string;
}

export interface AuthorizedPoint {
  id: string;
  name: string;
  address: string;
  phone: string;
  services: string[];
  contact_person: string;
  created_at: string;
}

class ApiClient {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('token');
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('token');
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'An error occurred' }));
      throw new Error(error.detail || 'An error occurred');
    }

    return response.json();
  }

  async login(email: string, password: string) {
    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);

    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Invalid credentials');
    }

    const data = await response.json();
    this.setToken(data.access_token);
    return data;
  }

  async register(userData: {
    email: string;
    password: string;
    name: string;
    role: string;
    phone: string;
  }) {
    return this.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async getCurrentUser(): Promise<User> {
    return this.request('/api/auth/me');
  }

  async getClients(): Promise<Client[]> {
    return this.request('/api/clients');
  }

  async createClient(data: { user_id: string; address: string; vehicle_info: string }) {
    return this.request('/api/clients', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateClient(id: string, data: { user_id: string; address: string; vehicle_info: string }) {
    return this.request(`/api/clients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteClient(id: string) {
    return this.request(`/api/clients/${id}`, {
      method: 'DELETE',
    });
  }

  async getMechanics(): Promise<Mechanic[]> {
    return this.request('/api/mechanics');
  }

  async createMechanic(data: { user_id: string; specialties: string[]; is_mobile: boolean }) {
    return this.request('/api/mechanics', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateMechanic(id: string, data: { user_id: string; specialties: string[]; is_mobile: boolean }) {
    return this.request(`/api/mechanics/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteMechanic(id: string) {
    return this.request(`/api/mechanics/${id}`, {
      method: 'DELETE',
    });
  }

  async getWorkshops(): Promise<Workshop[]> {
    return this.request('/api/workshops');
  }

  async createWorkshop(data: { name: string; address: string; phone: string; services: string[] }) {
    return this.request('/api/workshops', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateWorkshop(id: string, data: { name: string; address: string; phone: string; services: string[] }) {
    return this.request(`/api/workshops/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteWorkshop(id: string) {
    return this.request(`/api/workshops/${id}`, {
      method: 'DELETE',
    });
  }

  async getRepairs(): Promise<Repair[]> {
    return this.request('/api/repairs');
  }

  async createRepair(data: {
    client_id: string;
    vehicle_info: string;
    issue_description: string;
    service_type: string;
    location: string;
    scheduled_date?: string;
  }) {
    return this.request('/api/repairs', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateRepair(id: string, data: {
    mechanic_id?: string;
    workshop_id?: string;
    status?: string;
    scheduled_date?: string;
    completed_date?: string;
    cost?: number;
  }) {
    return this.request(`/api/repairs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteRepair(id: string) {
    return this.request(`/api/repairs/${id}`, {
      method: 'DELETE',
    });
  }

  async getAuthorizedPoints(): Promise<AuthorizedPoint[]> {
    return this.request('/api/authorized-points');
  }

  async createAuthorizedPoint(data: {
    name: string;
    address: string;
    phone: string;
    services: string[];
    contact_person: string;
  }) {
    return this.request('/api/authorized-points', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateAuthorizedPoint(id: string, data: {
    name: string;
    address: string;
    phone: string;
    services: string[];
    contact_person: string;
  }) {
    return this.request(`/api/authorized-points/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteAuthorizedPoint(id: string) {
    return this.request(`/api/authorized-points/${id}`, {
      method: 'DELETE',
    });
  }
}

export const api = new ApiClient();
