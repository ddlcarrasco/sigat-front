import { defineStore } from 'pinia'
import api from '../api/axios'

export const useTitularesStore = defineStore('titulares', {
    state: () => ({
        titulares: [],
        cargando:  false
    }),

    actions: {
        async cargarTodos() {
            this.cargando = true
            try {
                const res = await api.get('/titulares')
                this.titulares = res.data.data
            } finally {
                this.cargando = false
            }
        },

        async buscar(q) {
            this.cargando = true
            try {
                const res = await api.get('/titulares/buscar', { params: { q } })
                this.titulares = res.data.data
            } finally {
                this.cargando = false
            }
        },

        async crear(dto) {
            const res = await api.post('/titulares', dto)
            this.titulares.unshift(res.data.data)
            return res.data.data
        },

        async actualizar(id, dto) {
            const res = await api.put(`/titulares/${id}`, dto)
            const idx = this.titulares.findIndex(t => t.idtitular === id)
            if (idx !== -1) this.titulares[idx] = res.data.data
            return res.data.data
        }
    }
})
