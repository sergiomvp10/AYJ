import { useState, useEffect, useCallback } from 'react'
import './App.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

interface Spot {
  number: number
  buyer_name: string
  buyer_phone: string
  taken: boolean
}

function AdminPanel({ spots, onRefresh, adminPassword }: { spots: Spot[]; onRefresh: () => void; adminPassword: string }) {
  const [editSpot, setEditSpot] = useState<Spot | null>(null)
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [adminError, setAdminError] = useState('')
  const [adminSuccess, setAdminSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const takenSpots = spots.filter(s => s.taken)
  const filtered = searchQuery.trim()
    ? takenSpots.filter(s =>
        s.buyer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.buyer_phone.includes(searchQuery) ||
        s.number.toString() === searchQuery
      )
    : takenSpots

  const handleEdit = (spot: Spot) => {
    setEditSpot(spot)
    setEditName(spot.buyer_name)
    setEditPhone(spot.buyer_phone)
    setAdminError('')
    setAdminSuccess('')
  }

  const handleSaveEdit = async () => {
    if (!editSpot) return
    if (!editName.trim() || !editPhone.trim()) {
      setAdminError('Todos los campos son obligatorios')
      return
    }
    setSubmitting(true)
    setAdminError('')
    try {
      const res = await fetch(`${API_URL}/api/admin/spots/${editSpot.number}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Password': adminPassword },
        body: JSON.stringify({ buyer_name: editName, buyer_phone: editPhone })
      })
      if (!res.ok) {
        const data = await res.json()
        setAdminError(data.detail || 'Error al editar')
        return
      }
      setAdminSuccess(`Puesto #${editSpot.number} actualizado`)
      setEditSpot(null)
      onRefresh()
    } catch {
      setAdminError('Error de conexión')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (number: number) => {
    if (!confirm(`¿Seguro que quieres liberar el puesto #${number}?`)) return
    setSubmitting(true)
    setAdminError('')
    try {
      const res = await fetch(`${API_URL}/api/admin/spots/${number}`, {
        method: 'DELETE',
        headers: { 'X-Admin-Password': adminPassword }
      })
      if (!res.ok) {
        const data = await res.json()
        setAdminError(data.detail || 'Error al liberar')
        return
      }
      setAdminSuccess(`Puesto #${number} liberado`)
      onRefresh()
    } catch {
      setAdminError('Error de conexión')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-2xl font-bold text-amber-400">Panel de Administración</h2>
        <div className="text-sm text-gray-400">
          Vendidos: <strong className="text-amber-400">{takenSpots.length}</strong> / 100 |
          Recaudo: <strong className="text-green-400">${(takenSpots.length * 80000).toLocaleString('es-CO')}</strong>
        </div>
      </div>

      {adminError && (
        <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-xl">
          {adminError}
          <button onClick={() => setAdminError('')} className="float-right text-red-400">✕</button>
        </div>
      )}
      {adminSuccess && (
        <div className="bg-green-900/50 border border-green-700 text-green-300 px-4 py-3 rounded-xl">
          {adminSuccess}
          <button onClick={() => setAdminSuccess('')} className="float-right text-green-400">✕</button>
        </div>
      )}

      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Buscar por nombre, teléfono o número..."
        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
      />

      {filtered.length === 0 ? (
        <div className="text-center py-10 text-gray-500">
          {searchQuery ? 'No se encontraron resultados' : 'No hay puestos vendidos aún'}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(spot => (
            <div key={spot.number} className="bg-gray-800 border border-gray-700 rounded-xl p-4 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-4">
                <span className="bg-red-900/60 text-red-300 font-bold w-10 h-10 rounded-lg flex items-center justify-center text-sm">
                  {spot.number}
                </span>
                <div>
                  <p className="font-semibold">{spot.buyer_name}</p>
                  <p className="text-sm text-gray-400">{spot.buyer_phone}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(spot)}
                  className="bg-amber-500/20 text-amber-400 border border-amber-500/30 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-amber-500/30 transition-colors"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(spot.number)}
                  disabled={submitting}
                  className="bg-red-500/20 text-red-400 border border-red-500/30 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-500/30 transition-colors disabled:opacity-50"
                >
                  Liberar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editSpot && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setEditSpot(null)}>
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-amber-400 mb-4">Editar Puesto #{editSpot.number}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Nombre</label>
                <input type="text" value={editName} onChange={e => setEditName(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-amber-500" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Teléfono</label>
                <input type="tel" value={editPhone} onChange={e => setEditPhone(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-amber-500" />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setEditSpot(null)}
                  className="flex-1 bg-gray-800 border border-gray-700 text-gray-300 py-3 rounded-lg font-semibold hover:bg-gray-700">
                  Cancelar
                </button>
                <button onClick={handleSaveEdit} disabled={submitting}
                  className="flex-1 bg-amber-500 text-gray-900 py-3 rounded-lg font-bold hover:bg-amber-400 disabled:opacity-50">
                  {submitting ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function App() {
  const [spots, setSpots] = useState<Spot[]>([])
  const [selectedSpot, setSelectedSpot] = useState<number | null>(null)
  const [buyerName, setBuyerName] = useState('')
  const [buyerPhone, setBuyerPhone] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [viewingSpot, setViewingSpot] = useState<Spot | null>(null)
  const [showAdmin, setShowAdmin] = useState(false)
  const [adminPassword, setAdminPassword] = useState('')
  const [adminAuthenticated, setAdminAuthenticated] = useState(false)
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')

  const fetchSpots = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/spots`)
      const data = await res.json()
      setSpots(data.spots)
    } catch {
      setError('Error al cargar los puestos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSpots()
  }, [fetchSpots])

  const handleAdminLogin = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: loginPassword })
      })
      if (!res.ok) {
        setLoginError('Contraseña incorrecta')
        return
      }
      setAdminPassword(loginPassword)
      setAdminAuthenticated(true)
      setLoginError('')
    } catch {
      setLoginError('Error de conexión')
    }
  }

  const handleReserve = async () => {
    if (!selectedSpot) return
    if (!buyerName.trim() || !buyerPhone.trim()) {
      setError('Por favor completa todos los campos')
      return
    }
    setSubmitting(true)
    setError('')
    setSuccess('')
    try {
      const res = await fetch(`${API_URL}/api/spots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ number: selectedSpot, buyer_name: buyerName, buyer_phone: buyerPhone })
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.detail || 'Error al reservar')
        return
      }
      setSuccess(`Puesto #${selectedSpot} reservado exitosamente`)
      setSelectedSpot(null)
      setBuyerName('')
      setBuyerPhone('')
      await fetchSpots()
    } catch {
      setError('Error de conexión')
    } finally {
      setSubmitting(false)
    }
  }

  const takenCount = spots.filter(s => s.taken).length
  const availableCount = 100 - takenCount

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="bg-gray-900 border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <img src="/gordotech-logo.jpg" alt="GORDOTECH - Conectando tus sueños" className="h-14 rounded" />
          <div className="flex items-center gap-4">
            <div className="text-right">
              <h1 className="text-2xl font-bold text-amber-400">GRAN RIFA</h1>
              <p className="text-sm text-gray-400">Organizada por GORDOTECH</p>
            </div>
            <button
              onClick={() => { setShowAdmin(!showAdmin); if (showAdmin) { setAdminAuthenticated(false); setLoginPassword('') } }}
              className={`p-2 rounded-lg border transition-colors ${showAdmin ? 'bg-amber-500 text-gray-900 border-amber-400' : 'bg-gray-800 text-gray-400 border-gray-700 hover:text-white'}`}
              title="Panel de Admin"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {showAdmin ? (
          adminAuthenticated ? (
            <AdminPanel spots={spots} onRefresh={fetchSpots} adminPassword={adminPassword} />
          ) : (
            <div className="max-w-sm mx-auto">
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
                <h2 className="text-xl font-bold text-amber-400 mb-6 text-center">Acceso Administrador</h2>
                {loginError && (
                  <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-xl mb-4 text-sm">{loginError}</div>
                )}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Contraseña</label>
                    <input
                      type="password"
                      value={loginPassword}
                      onChange={e => setLoginPassword(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAdminLogin()}
                      placeholder="Ingresa la contraseña"
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <button onClick={handleAdminLogin}
                    className="w-full bg-amber-500 text-gray-900 py-3 rounded-lg font-bold hover:bg-amber-400 transition-colors">
                    Ingresar
                  </button>
                </div>
              </div>
            </div>
          )
        ) : (
          <>
            <div className="bg-gray-900 rounded-2xl overflow-hidden border border-gray-800 mb-8">
              <div className="md:flex">
                <div className="md:w-1/2">
                  <img
                    src="/macbook-air.jpg"
                    alt="MacBook Air 13 pulgadas con chip M4"
                    className="w-full h-72 md:h-96 object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/600x400/1f2937/f59e0b/png?text=MacBook+Air+M4' }}
                  />
                </div>
                <div className="md:w-1/2 p-6 md:p-8 flex flex-col justify-center">
                  <span className="inline-block bg-amber-500 text-gray-900 text-xs font-bold px-3 py-1 rounded-full mb-4 w-fit">PREMIO</span>
                  <h2 className="text-3xl font-bold mb-3">MacBook Air 13"</h2>
                  <p className="text-gray-400 mb-4 text-lg">Chip M4 · 16GB RAM · Última generación</p>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="text-amber-400 text-2xl">💰</span>
                      <div>
                        <p className="text-sm text-gray-500">Costo por puesto</p>
                        <p className="text-2xl font-bold text-amber-400">$80.000 COP</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-amber-400 text-2xl">🎯</span>
                      <div>
                        <p className="text-sm text-gray-500">Total de puestos</p>
                        <p className="text-lg font-semibold">100 puestos</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-amber-400 text-2xl">📅</span>
                      <div>
                        <p className="text-sm text-gray-500">Día de la rifa</p>
                        <p className="text-lg font-semibold">Cuando se vendan todos los puestos</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-4 mb-8">
              <div className="bg-gray-900 border border-gray-800 rounded-xl px-5 py-3 flex items-center gap-3">
                <div className="w-4 h-4 rounded bg-green-500"></div>
                <span className="text-sm">Disponibles: <strong className="text-green-400">{availableCount}</strong></span>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl px-5 py-3 flex items-center gap-3">
                <div className="w-4 h-4 rounded bg-red-500"></div>
                <span className="text-sm">Vendidos: <strong className="text-red-400">{takenCount}</strong></span>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl px-5 py-3 flex items-center gap-3">
                <div className="w-4 h-4 rounded bg-amber-500"></div>
                <span className="text-sm">Seleccionado</span>
              </div>
            </div>

            {error && (
              <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-xl mb-6">
                {error}
                <button onClick={() => setError('')} className="float-right text-red-400 hover:text-red-200">✕</button>
              </div>
            )}
            {success && (
              <div className="bg-green-900/50 border border-green-700 text-green-300 px-4 py-3 rounded-xl mb-6">
                {success}
                <button onClick={() => setSuccess('')} className="float-right text-green-400 hover:text-green-200">✕</button>
              </div>
            )}

            {loading ? (
              <div className="text-center py-20">
                <div className="inline-block w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-4 text-gray-400">Cargando puestos...</p>
              </div>
            ) : (
              <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2 mb-8">
                {spots.map((spot) => (
                  <button
                    key={spot.number}
                    onClick={() => {
                      if (spot.taken) {
                        setViewingSpot(spot)
                      } else {
                        setSelectedSpot(spot.number === selectedSpot ? null : spot.number)
                        setError('')
                      }
                    }}
                    className={`
                      aspect-square rounded-lg text-sm font-bold transition-all duration-200 border-2
                      ${spot.taken
                        ? 'bg-red-900/60 border-red-700 text-red-300 cursor-pointer hover:bg-red-900'
                        : spot.number === selectedSpot
                          ? 'bg-amber-500 border-amber-400 text-gray-900 scale-110 shadow-lg shadow-amber-500/30'
                          : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:border-green-500 hover:text-green-400'
                      }
                    `}
                  >
                    {spot.number}
                  </button>
                ))}
              </div>
            )}

            {selectedSpot && (
              <div className="bg-gray-900 border border-amber-500/30 rounded-2xl p-6 mb-8 max-w-md mx-auto">
                <h3 className="text-xl font-bold text-amber-400 mb-4 text-center">
                  Reservar Puesto #{selectedSpot}
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Nombre completo</label>
                    <input
                      type="text"
                      value={buyerName}
                      onChange={(e) => setBuyerName(e.target.value)}
                      placeholder="Ej: Juan Pérez"
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Teléfono</label>
                    <input
                      type="tel"
                      value={buyerPhone}
                      onChange={(e) => setBuyerPhone(e.target.value)}
                      placeholder="Ej: 300 123 4567"
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 transition-colors"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => { setSelectedSpot(null); setBuyerName(''); setBuyerPhone('') }}
                      className="flex-1 bg-gray-800 border border-gray-700 text-gray-300 py-3 rounded-lg font-semibold hover:bg-gray-700 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleReserve}
                      disabled={submitting}
                      className="flex-1 bg-amber-500 text-gray-900 py-3 rounded-lg font-bold hover:bg-amber-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submitting ? 'Reservando...' : 'Confirmar'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {viewingSpot && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setViewingSpot(null)}>
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-red-400 mb-4">Puesto #{viewingSpot.number} - Vendido</h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Comprador</p>
                <p className="text-lg font-semibold">{viewingSpot.buyer_name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Teléfono</p>
                <p className="text-lg font-semibold">{viewingSpot.buyer_phone}</p>
              </div>
            </div>
            <button
              onClick={() => setViewingSpot(null)}
              className="mt-6 w-full bg-gray-800 border border-gray-700 text-gray-300 py-3 rounded-lg font-semibold hover:bg-gray-700 transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      <footer className="bg-gray-900 border-t border-gray-800 mt-12 py-6 text-center text-gray-500 text-sm">
        <p>GORDOTECH - Conectando tus sueños</p>
        <p className="mt-1">Rifa MacBook Air 13" M4 · 100 puestos · $80.000 COP c/u</p>
      </footer>
    </div>
  )
}

export default App
