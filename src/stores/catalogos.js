import { defineStore } from 'pinia'
import api from '../api/axios'

// Store de catálogos
// Guarda listas que se usan en formularios y filtros (sectores, tarifas, estados, etc.)
// Se cargan una sola vez al iniciar la app para no repetir llamadas al backend
export const useCatalogosStore = defineStore('catalogos', {
    state: () => ({
        sectores:          [],
        tarifas:           [],
        estadosContrato:   [],
        estadosRecibo:     [],
        tiposPago:         [],
        tiposDescuento:    [],
        roles:             []
    }),

    actions: {
        // Carga todos los catálogos en paralelo de una sola vez
        async cargarTodos() {
            const [sec, tar, esc, esr, tip, tid, rol] = await Promise.all([
                api.get('/sectores'),
                api.get('/tarifas'),
                api.get('/estados-contrato'),
                api.get('/estados-recibo'),
                api.get('/tipos-pago'),
                api.get('/tipos-descuento'),
                api.get('/roles')
            ])
            this.sectores        = sec.data.data
            this.tarifas         = tar.data.data
            this.estadosContrato = esc.data.data
            this.estadosRecibo   = esr.data.data
            this.tiposPago       = tip.data.data
            this.tiposDescuento  = tid.data.data
            this.roles           = rol.data.data
        }
    }
})
