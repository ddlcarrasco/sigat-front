import { defineStore } from 'pinia'
import api from '../api/axios'

// Store de autenticación
// Guarda el token y los datos del usuario logueado
// Los persiste en localStorage para que sobrevivan al recargar la página
export const useAuthStore = defineStore('auth', {
    state: () => ({
        token:    localStorage.getItem('token') || null,
        username: localStorage.getItem('username') || null,
        rol:      localStorage.getItem('rol') || null
    }),

    getters: {
        // true si hay un token guardado
        estaLogueado: (state) => !!state.token,
        // true si el usuario es administrador
        esAdmin: (state) => state.rol === 'ADMIN'
    },

    actions: {
        async login(username, password) {
            // POST /auth/login — el backend devuelve { status, message, data: { token, username, rol } }
            const respuesta = await api.post('/auth/login', { username, password })
            const data = respuesta.data.data

            this.token    = data.token
            this.username = data.username
            this.rol      = data.rol

            localStorage.setItem('token',    data.token)
            localStorage.setItem('username', data.username)
            localStorage.setItem('rol',      data.rol)
        },

        logout() {
            this.token    = null
            this.username = null
            this.rol      = null
            localStorage.removeItem('token')
            localStorage.removeItem('username')
            localStorage.removeItem('rol')
        }
    }
})
