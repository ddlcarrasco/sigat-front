<script setup>
import { ref, computed, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import { useRecibosStore } from '../stores/recibos'
import api from '../api/axios'

const store = useRecibosStore()
const toast = useToast()

// ── Catálogos ─────────────────────────────────────────────────────────────
const contratos     = ref([])
const motivos       = ref([])
const estadosRecibo = ref([])

const meses = [
    { label: 'Enero',      value: 1  },
    { label: 'Febrero',    value: 2  },
    { label: 'Marzo',      value: 3  },
    { label: 'Abril',      value: 4  },
    { label: 'Mayo',       value: 5  },
    { label: 'Junio',      value: 6  },
    { label: 'Julio',      value: 7  },
    { label: 'Agosto',     value: 8  },
    { label: 'Septiembre', value: 9  },
    { label: 'Octubre',    value: 10 },
    { label: 'Noviembre',  value: 11 },
    { label: 'Diciembre',  value: 12 }
]

const nombreMes = (num) => meses.find(m => m.value === num)?.label ?? num

// ── Filtros ───────────────────────────────────────────────────────────────
const filtroTexto  = ref('')
const filtroEstado = ref(null)

const recibosFiltrados = computed(() => {
    let lista = store.recibos

    const q = filtroTexto.value.trim().toLowerCase()
    if (q) {
        lista = lista.filter(r =>
            (r.contratoNumero || '').toLowerCase().includes(q) ||
            (r.titularNombre  || '').toLowerCase().includes(q)
        )
    }

    if (filtroEstado.value) {
        lista = lista.filter(r => r.estadoReciboId === filtroEstado.value)
    }

    return lista
})

function limpiarFiltros() {
    filtroTexto.value  = ''
    filtroEstado.value = null
}

// ── Color del tag de estado ───────────────────────────────────────────────
const claseEstado = (nombre) => {
    if (!nombre) return ''
    const n = nombre.toLowerCase()
    if (n.includes('pag'))      return 'tag-pagado'
    if (n.includes('pend'))     return 'tag-pendiente'
    if (n.includes('venc'))     return 'tag-vencido'
    if (n.includes('cancel'))   return 'tag-cancelado'
    return 'tag-pendiente'
}

// ── Diálogo: Generar recibo ───────────────────────────────────────────────
const dialogGenerar = ref(false)
const generando     = ref(false)

const anioActual = new Date().getFullYear()
const mesActual  = new Date().getMonth() + 1  // getMonth() devuelve 0-11

const formVacio = () => ({
    contratoId:       null,
    mes:              mesActual,
    anio:             anioActual,
    fechaVencimiento: null,
    motivoReciboId:   null
})

const form = ref(formVacio())

function abrirGenerar() {
    form.value      = formVacio()
    dialogGenerar.value = true
}

async function guardar() {
    if (!form.value.contratoId || !form.value.mes || !form.value.anio || !form.value.motivoReciboId) {
        toast.add({ severity: 'warn', summary: 'Campos requeridos', detail: 'Contrato, mes, año y motivo son obligatorios', life: 3000 })
        return
    }

    generando.value = true
    try {
        const dto = {
            contratoId:      form.value.contratoId,
            mes:             form.value.mes,
            anio:            form.value.anio,
            motivoReciboId:  form.value.motivoReciboId,
            fechaVencimiento: form.value.fechaVencimiento
                ? form.value.fechaVencimiento.toISOString().split('T')[0]
                : null
        }
        await store.generar(dto)
        toast.add({ severity: 'success', summary: 'Generado', detail: 'Recibo generado correctamente', life: 3000 })
        dialogGenerar.value = false
    } catch (e) {
        console.error('Error al generar recibo:', e)
        const detalle = e.response?.data?.message || e.message || 'No se pudo generar el recibo'
        toast.add({ severity: 'error', summary: 'Error', detail: detalle, life: 5000 })
    } finally {
        generando.value = false
    }
}

// ── Formato de moneda ─────────────────────────────────────────────────────
const formatMonto = (monto) =>
    monto != null
        ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(monto)
        : '—'

// ── Inicialización ────────────────────────────────────────────────────────
onMounted(async () => {
    const [, con, mot, est] = await Promise.all([
        store.cargarTodos(),
        api.get('/contratos'),
        api.get('/motivos-recibo'),
        api.get('/estados-recibo')
    ])
    contratos.value     = con.data.data.map(c => ({
        ...c,
        etiqueta: `${c.numeroContrato} — ${c.titularNombre}`
    }))
    motivos.value       = mot.data.data
    estadosRecibo.value = est.data.data
})
</script>

<template>
    <div class="pagina-card">

        <!-- Encabezado -->
        <div class="pagina-card-header">
            <span class="pagina-card-titulo">Recibos</span>
            <Button label="Generar recibo" icon="pi pi-plus" size="small" @click="abrirGenerar" />
        </div>

        <!-- Filtros -->
        <div class="barra-filtros">
            <InputText
                v-model="filtroTexto"
                placeholder="Filtrar por N° contrato o titular..."
                class="filtro-texto"
            />
            <Select
                v-model="filtroEstado"
                :options="estadosRecibo"
                optionLabel="nombre"
                optionValue="idestado_recibo"
                placeholder="Todos los estados"
                showClear
                class="filtro-estado"
            />
            <Button icon="pi pi-times" severity="secondary" text size="small"
                v-tooltip="'Limpiar filtros'" @click="limpiarFiltros" />
        </div>

        <!-- Tabla -->
        <DataTable
            :value="recibosFiltrados"
            :loading="store.cargando"
            paginator
            :rows="15"
            :rowsPerPageOptions="[10, 15, 25, 50]"
            scrollable
            scrollHeight="calc(100vh - 280px)"
            stripedRows
        >
            <template #empty>No se encontraron recibos.</template>

            <Column field="idrecibo"      header="ID"         style="width: 70px" />
            <Column field="contratoNumero" header="Contrato"  style="width: 130px" />
            <Column field="titularNombre"  header="Titular" />

            <Column header="Período" style="width: 130px">
                <template #body="{ data }">
                    {{ nombreMes(data.mes) }} {{ data.anio }}
                </template>
            </Column>

            <Column header="Monto" style="width: 120px; text-align: right">
                <template #body="{ data }">
                    <span class="monto">{{ formatMonto(data.monto) }}</span>
                </template>
            </Column>

            <Column header="Estado" style="width: 120px">
                <template #body="{ data }">
                    <span :class="claseEstado(data.estadoReciboNombre)">
                        {{ data.estadoReciboNombre }}
                    </span>
                </template>
            </Column>

            <Column field="fechaVencimiento" header="Vencimiento" style="width: 120px" />
            <Column field="fechaEmision"     header="Emisión"     style="width: 120px" />

            <Column header="Folio pago" style="width: 110px">
                <template #body="{ data }">
                    {{ data.pagoFolio || '—' }}
                </template>
            </Column>
        </DataTable>
    </div>

    <!-- ── Diálogo: Generar recibo ── -->
    <Dialog v-model:visible="dialogGenerar" header="Generar recibo mensual" :style="{ width: '500px' }" modal>
        <div class="form-grid">

            <div class="campo campo--full">
                <label>Contrato <span class="req">*</span></label>
                <!-- filter: permite buscar dentro del dropdown -->
                <Select
                    v-model="form.contratoId"
                    :options="contratos"
                    optionLabel="etiqueta"
                    optionValue="idcontrato"
                    placeholder="Busca por N° contrato o titular..."
                    filter
                    class="w-full"
                />
            </div>

            <div class="campo">
                <label>Mes <span class="req">*</span></label>
                <Select
                    v-model="form.mes"
                    :options="meses"
                    optionLabel="label"
                    optionValue="value"
                    placeholder="Selecciona..."
                    class="w-full"
                />
            </div>

            <div class="campo">
                <label>Año <span class="req">*</span></label>
                <!-- InputNumber solo acepta enteros, sin botones de incremento -->
                <InputNumber
                    v-model="form.anio"
                    :useGrouping="false"
                    :min="2000"
                    :max="2099"
                    placeholder="Ej. 2025"
                    class="w-full"
                />
            </div>

            <div class="campo">
                <label>Motivo <span class="req">*</span></label>
                <Select
                    v-model="form.motivoReciboId"
                    :options="motivos"
                    optionLabel="nombre"
                    optionValue="idmotivo_recibo"
                    placeholder="Selecciona..."
                    class="w-full"
                />
            </div>

            <div class="campo">
                <label>Fecha de vencimiento</label>
                <DatePicker
                    v-model="form.fechaVencimiento"
                    dateFormat="dd/mm/yy"
                    placeholder="dd/mm/aaaa"
                    class="w-full"
                />
            </div>

        </div>

        <!-- Nota informativa -->
        <div class="nota-info">
            <i class="pi pi-info-circle"></i>
            El monto se calcula automáticamente según la tarifa vigente y los descuentos del contrato.
        </div>

        <template #footer>
            <Button label="Cancelar" severity="secondary" text @click="dialogGenerar = false" />
            <Button label="Generar" icon="pi pi-check" :loading="generando" @click="guardar" />
        </template>
    </Dialog>
</template>

<style scoped>
.barra-filtros {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.5rem;
    border-bottom: 0.5px solid #f1f5f9;
}

.filtro-texto {
    flex: 1;
    max-width: 360px;
}

.filtro-estado {
    width: 200px;
}

.monto {
    font-variant-numeric: tabular-nums;
    font-weight: 500;
}

.form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
}

.campo {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
}

.campo--full {
    grid-column: 1 / -1;
}

.campo label {
    font-size: 0.85rem;
    font-weight: 600;
    color: #374151;
}

.req { color: #dc2626; }

.nota-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-top: 1rem;
    padding: 0.65rem 0.9rem;
    background: #eff6ff;
    border-radius: 8px;
    font-size: 0.82rem;
    color: #1e40af;
}

.nota-info .pi {
    flex-shrink: 0;
}
</style>
