import axios from 'axios'

// Instancia de axios apuntando al backend de SIGAT
// Así no tenemos que escribir http://localhost:8081/sigat en cada llamada
const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8081/sigat'
})

// Interceptor: se ejecuta ANTES de cada petición
// Toma el token guardado y lo pone en el header Authorization
// El backend de SIGAT requiere "Bearer <token>" para rutas protegidas
api.interceptors.request.use(config => {
    const token = sessionStorage.getItem('token')
    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
})

export default api
