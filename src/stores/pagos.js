import { defineStore } from 'pinia'
import api from '../api/axios'

export const usePagosStore = defineStore('pagos', {
    state: () => ({
        pagos:    [],
        cargando: false
    }),

    actions: {
        async cargarTodos() {
            this.cargando = true
            try {
                const res = await api.get('/pagos')
                this.pagos = res.data.data
            } finally {
                this.cargando = false
            }
        },

        async registrar(dto) {
            const res = await api.post('/pagos/registrar', dto)
            this.pagos.unshift(res.data.data)
            return res.data.data
        }
    }
})
