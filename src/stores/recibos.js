import { defineStore } from 'pinia'
import api from '../api/axios'

export const useRecibosStore = defineStore('recibos', {
    state: () => ({
        recibos:  [],
        cargando: false
    }),

    actions: {
        async cargarTodos() {
            this.cargando = true
            try {
                const res = await api.get('/recibos')
                this.recibos = res.data.data
            } finally {
                this.cargando = false
            }
        },

        async generar(dto) {
            const res = await api.post('/recibos/generar', dto)
            this.recibos.unshift(res.data.data)
            return res.data.data
        }
    }
})
