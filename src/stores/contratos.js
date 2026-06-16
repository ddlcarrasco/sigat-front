import { defineStore } from 'pinia'
import api from '../api/axios'

export const useContratosStore = defineStore('contratos', {
    state: () => ({
        contratos: [],
        cargando:  false
    }),

    actions: {
        async cargarTodos() {
            this.cargando = true
            try {
                const res = await api.get('/contratos')
                this.contratos = res.data.data
            } finally {
                this.cargando = false
            }
        },

        async crear(dto) {
            const res = await api.post('/contratos', dto)
            this.contratos.unshift(res.data.data)
            return res.data.data
        },

        async actualizar(id, dto) {
            const res = await api.put(`/contratos/${id}`, dto)
            const idx = this.contratos.findIndex(c => c.idcontrato === id)
            if (idx !== -1) this.contratos[idx] = res.data.data
            return res.data.data
        },

        async cambiarEstado(id, dto) {
            const res = await api.put(`/contratos/${id}/estado`, dto)
            const idx = this.contratos.findIndex(c => c.idcontrato === id)
            if (idx !== -1) this.contratos[idx] = res.data.data
            return res.data.data
        }
    }
})
