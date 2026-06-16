import { defineStore } from 'pinia'
import api from '../api/axios'

export const useTramitesStore = defineStore('tramites', {
    state: () => ({
        tramites: [],
        cargando: false
    }),

    actions: {
        async cargarTodos() {
            this.cargando = true
            try {
                const res = await api.get('/tramites')
                this.tramites = res.data.data
            } finally {
                this.cargando = false
            }
        },

        async crear(dto) {
            const res = await api.post('/tramites', dto)
            this.tramites.unshift(res.data.data)
            return res.data.data
        },

        async vobo(id, dto) {
            const res = await api.put(`/tramites/${id}/vobo`, dto)
            this._reemplazar(id, res.data.data)
            return res.data.data
        },

        async resolver(id, dto) {
            const res = await api.put(`/tramites/${id}/resolver`, dto)
            this._reemplazar(id, res.data.data)
            return res.data.data
        },

        _reemplazar(id, actualizado) {
            const idx = this.tramites.findIndex(t => t.idtramite === id)
            if (idx !== -1) this.tramites[idx] = actualizado
        }
    }
})
