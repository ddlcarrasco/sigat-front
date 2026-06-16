import { defineStore } from 'pinia'
import api from '../api/axios'

// Store de autenticación
// Guarda el token y los datos del usuario logueado
// Los persiste en sessionStorage para que sobrevivan al recargar la página
export const useAuthStore = defineStore('auth', {
    state: () => ({
        token:    sessionStorage.getItem('token') || null,
        username: sessionStorage.getItem('username') || null,
        rol:      sessionStorage.getItem('rol') || null
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

            sessionStorage.setItem('token',    data.token)
            sessionStorage.setItem('username', data.username)
            sessionStorage.setItem('rol',      data.rol)
        },

        logout() {
            this.token    = null
            this.username = null
            this.rol      = null
            sessionStorage.removeItem('token')
            sessionStorage.removeItem('username')
            sessionStorage.removeItem('rol')
        }
    }
})
