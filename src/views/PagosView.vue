<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import { usePagosStore } from '../stores/pagos'
import api from '../api/axios'

const pagosStore = usePagosStore()
const toast      = useToast()

// ── Catálogos ─────────────────────────────────────────────────────────────
const tiposPago = ref([])
const contratos = ref([])

// ── Filtro ────────────────────────────────────────────────────────────────
const filtroTexto = ref('')

const pagosFiltrados = computed(() => {
    const q = filtroTexto.value.trim().toLowerCase()
    if (!q) return pagosStore.pagos
    return pagosStore.pagos.filter(p =>
        (p.folio         || '').toLowerCase().includes(q) ||
        (p.tipoPagoNombre|| '').toLowerCase().includes(q) ||
        (p.usuarioNombre || '').toLowerCase().includes(q)
    )
})

// ── Formato ───────────────────────────────────────────────────────────────
const formatMonto = (m) =>
    m != null
        ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(m)
        : '—'

const formatFecha = (dt) => {
    if (!dt) return '—'
    return new Date(dt).toLocaleString('es-MX', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    })
}

// ── Diálogo: Registrar pago ───────────────────────────────────────────────
const dialogPago      = ref(false)
const registrando     = ref(false)

// Paso 1 — selección de contrato y recibos pendientes
const contratoSelId   = ref(null)
const recibosPendientes = ref([])
const recibosSeleccionados = ref([])   // filas seleccionadas en la tabla
const cargandoRecibos = ref(false)

// Paso 2 — datos del pago
const form = ref({
    montoRecibido: null,
    tipoPagoId:    null,
    observaciones: ''
})

// Cuando cambia el contrato, recarga sus recibos pendientes
watch(contratoSelId, async (nuevoId) => {
    recibosSeleccionados.value = []
    recibosPendientes.value    = []
    form.value.montoRecibido   = null

    if (!nuevoId) return
    cargandoRecibos.value = true
    try {
        const res = await api.get(`/recibos/contrato/${nuevoId}/pendientes`)
        recibosPendientes.value = res.data.data
    } finally {
        cargandoRecibos.value = false
    }
})

// Cuando cambia la selección de recibos, recalcula el total
watch(recibosSeleccionados, (sel) => {
    const total = sel.reduce((sum, r) => sum + Number(r.monto || 0), 0)
    form.value.montoRecibido = total > 0 ? total : null
}, { deep: true })

const mesesNombres = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
                          'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

function abrirDialog() {
    contratoSelId.value        = null
    recibosPendientes.value    = []
    recibosSeleccionados.value = []
    form.value = { montoRecibido: null, tipoPagoId: null, observaciones: '' }
    dialogPago.value = true
}

async function registrar() {
    if (recibosSeleccionados.value.length === 0) {
        toast.add({ severity: 'warn', summary: 'Sin recibos', detail: 'Selecciona al menos un recibo a liquidar', life: 3000 })
        return
    }
    if (!form.value.tipoPagoId) {
        toast.add({ severity: 'warn', summary: 'Requerido', detail: 'Selecciona el tipo de pago', life: 3000 })
        return
    }
    if (!form.value.montoRecibido || form.value.montoRecibido <= 0) {
        toast.add({ severity: 'warn', summary: 'Requerido', detail: 'El monto recibido debe ser mayor a 0', life: 3000 })
        return
    }

    registrando.value = true
    try {
        const dto = {
            montoRecibido: form.value.montoRecibido,
            tipoPagoId:    form.value.tipoPagoId,
            observaciones: form.value.observaciones,
            reciboIds:     recibosSeleccionados.value.map(r => r.idrecibo)
        }
        await pagosStore.registrar(dto)
        toast.add({ severity: 'success', summary: 'Registrado', detail: 'Pago registrado correctamente', life: 3000 })
        dialogPago.value = false
    } catch (e) {
        console.error('Error al registrar pago:', e)
        const detalle = e.response?.data?.message || e.message || 'No se pudo registrar el pago'
        toast.add({ severity: 'error', summary: 'Error', detail: detalle, life: 5000 })
    } finally {
        registrando.value = false
    }
}

// ── Inicialización ────────────────────────────────────────────────────────
onMounted(async () => {
    const [, tip, con] = await Promise.all([
        pagosStore.cargarTodos(),
        api.get('/tipos-pago'),
        api.get('/contratos')
    ])
    tiposPago.value = tip.data.data
    contratos.value = con.data.data
        .filter(c => c.estadoContratoNombre?.toLowerCase() === 'activo')
        .map(c => ({
            ...c,
            etiqueta: `${c.numeroContrato} — ${c.titularNombre}`
        }))
})
</script>

<template>
    <div class="pagina-card">

        <!-- Encabezado -->
        <div class="pagina-card-header">
            <span class="pagina-card-titulo">Pagos</span>
            <Button label="Registrar pago" icon="pi pi-plus" size="small" @click="abrirDialog" />
        </div>

        <!-- Filtro -->
        <div class="barra-filtros">
            <InputText
                v-model="filtroTexto"
                placeholder="Filtrar por folio, tipo de pago o usuario..."
                class="filtro-texto"
            />
            <Button icon="pi pi-times" severity="secondary" text size="small"
                v-tooltip="'Limpiar'" @click="filtroTexto = ''" />
        </div>

        <!-- Tabla de pagos -->
        <DataTable
            :value="pagosFiltrados"
            :loading="pagosStore.cargando"
            paginator
            :rows="15"
            :rowsPerPageOptions="[10, 15, 25, 50]"
            scrollable
            scrollHeight="calc(100vh - 260px)"
            stripedRows
        >
            <template #empty>No se encontraron pagos.</template>

            <Column field="idpago"        header="ID"           style="width: 70px" />
            <Column field="folio"         header="Folio"        style="width: 150px" />

            <Column header="Monto recibido" style="width: 150px; text-align: right">
                <template #body="{ data }">
                    <span class="monto">{{ formatMonto(data.montoRecibido) }}</span>
                </template>
            </Column>

            <Column field="tipoPagoNombre"  header="Tipo de pago"  style="width: 140px" />
            <Column field="usuarioNombre"   header="Registró"      style="width: 160px" />

            <Column header="Fecha y hora" style="width: 160px">
                <template #body="{ data }">
                    {{ formatFecha(data.fechaPago) }}
                </template>
            </Column>

            <Column field="observaciones" header="Observaciones" />
        </DataTable>
    </div>

    <!-- ── Diálogo: Registrar pago ── -->
    <Dialog v-model:visible="dialogPago" header="Registrar pago" :style="{ width: '640px' }" modal>

        <!-- ── Sección 1: Selección de recibos ── -->
        <div class="seccion-titulo">
            <span class="seccion-num">1</span>
            Selecciona el contrato y los recibos a liquidar
        </div>

        <div class="campo" style="margin-bottom: 0.75rem">
            <label>Contrato <span class="req">*</span></label>
            <Select
                v-model="contratoSelId"
                :options="contratos"
                optionLabel="etiqueta"
                optionValue="idcontrato"
                placeholder="Busca por N° contrato o titular..."
                filter
                class="w-full"
            />
        </div>

        <!-- Tabla de recibos pendientes con checkboxes -->
        <div v-if="contratoSelId" class="tabla-recibos-wrap">
            <DataTable
                v-model:selection="recibosSeleccionados"
                :value="recibosPendientes"
                :loading="cargandoRecibos"
                selectionMode="multiple"
                dataKey="idrecibo"
                size="small"
            >
                <template #empty>
                    <span class="sin-pendientes">Este contrato no tiene recibos pendientes.</span>
                </template>
                <Column selectionMode="multiple" style="width: 40px" />
                <Column field="idrecibo" header="ID"      style="width: 60px" />
                <Column header="Período" style="width: 120px">
                    <template #body="{ data }">
                        {{ mesesNombres[data.mes] }} {{ data.anio }}
                    </template>
                </Column>
                <Column header="Monto" style="width: 110px; text-align: right">
                    <template #body="{ data }">
                        <span class="monto">{{ formatMonto(data.monto) }}</span>
                    </template>
                </Column>
                <Column field="fechaVencimiento" header="Vencimiento" style="width: 110px" />
            </DataTable>

            <!-- Resumen de selección -->
            <div v-if="recibosSeleccionados.length > 0" class="resumen-seleccion">
                <span>{{ recibosSeleccionados.length }} recibo(s) seleccionado(s)</span>
                <span class="resumen-total">
                    Total: {{ formatMonto(recibosSeleccionados.reduce((s, r) => s + Number(r.monto), 0)) }}
                </span>
            </div>
        </div>

        <!-- ── Sección 2: Datos del pago ── -->
        <div class="seccion-titulo" style="margin-top: 1.25rem">
            <span class="seccion-num">2</span>
            Datos del pago
        </div>

        <div class="form-grid">

            <div class="campo">
                <label>Tipo de pago <span class="req">*</span></label>
                <Select
                    v-model="form.tipoPagoId"
                    :options="tiposPago"
                    optionLabel="nombre"
                    optionValue="idtipo_pago"
                    placeholder="Selecciona..."
                    class="w-full"
                />
            </div>

            <div class="campo">
                <label>Monto recibido <span class="req">*</span></label>
                <!-- Se precalcula pero el usuario puede ajustarlo (ej. pago parcial) -->
                <InputNumber
                    v-model="form.montoRecibido"
                    mode="currency"
                    currency="MXN"
                    locale="es-MX"
                    placeholder="0.00"
                    class="w-full"
                />
            </div>

            <div class="campo">
                <label>Observaciones</label>
                <InputText v-model="form.observaciones" placeholder="Opcional" class="w-full" />
            </div>

        </div>

        <template #footer>
            <Button label="Cancelar" severity="secondary" text @click="dialogPago = false" />
            <Button
                label="Registrar pago"
                icon="pi pi-check"
                :loading="registrando"
                @click="registrar"
            />
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

.filtro-texto { flex: 1; max-width: 420px; }

.monto {
    font-variant-numeric: tabular-nums;
    font-weight: 500;
}

/* ── Diálogo ── */
.seccion-titulo {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 600;
    font-size: 0.9rem;
    color: #374151;
    margin-bottom: 0.75rem;
}

.seccion-num {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: #1a5276;
    color: white;
    font-size: 0.75rem;
    font-weight: 700;
    flex-shrink: 0;
}

.tabla-recibos-wrap {
    border: 0.5px solid #e5e7eb;
    border-radius: 8px;
    overflow: hidden;
}

.sin-pendientes {
    font-size: 0.85rem;
    color: #9ca3af;
}

.resumen-seleccion {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.6rem 1rem;
    background: #f0f9ff;
    border-top: 0.5px solid #bae6fd;
    font-size: 0.85rem;
    color: #0369a1;
}

.resumen-total {
    font-weight: 700;
}

.form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    margin-top: 0.75rem;
}

.campo {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
}

.campo label {
    font-size: 0.85rem;
    font-weight: 600;
    color: #374151;
}

.req { color: #dc2626; }
</style>
